----multiline to single line string----

DROP TABLE IF EXISTS grid_lines;

CREATE TABLE grid_lines (
    id serial PRIMARY KEY,
    geom geometry(LineString, 4326)
);

INSERT INTO grid_lines (geom)
SELECT 
    st_force2d((st_dump(geom)).geom) 
FROM
    (SELECT ST_SetSRID(geom, 4326) AS geom FROM public.gcroad_network) AS base_tbl;

CREATE INDEX grid_lines_geom_idx
ON grid_lines
USING GIST(geom);

SELECT 'Success! The grid_lines table is ready.' AS status;



----nodes----

DROP TABLE IF EXISTS network_nodes;

CREATE TABLE network_nodes (
    id serial PRIMARY KEY,
    geom geometry(Point, 4326)
);

INSERT INTO network_nodes (geom)
SELECT DISTINCT st_intersection(a.geom, b.geom)::geometry(Point, 4326) AS geom
FROM grid_lines a
JOIN grid_lines b
ON st_intersects(a.geom, b.geom)
WHERE st_geometrytype(st_intersection(a.geom, b.geom)) = 'ST_Point';

CREATE INDEX network_nodes_geom_idx
ON network_nodes
USING GIST(geom);

SELECT 'Success! Final network_nodes table created and indexed.' AS status;



----edges----

DROP TABLE IF EXISTS network_edges;

CREATE TABLE network_edges(
    id serial PRIMARY KEY,
    source integer,
    target integer,
    cost double precision,
    geom geometry (LineString, 4326)
);

WITH
node_on_line AS (
    SELECT
        l.id AS line_id,
        n.id AS node_id,
        n.geom AS node_geom,
        ST_LineLocatePoint(l.geom, n.geom) AS fraction
    FROM grid_lines l
    JOIN network_nodes n ON ST_DWithin(l.geom, n.geom, 0.0001)
    WHERE ST_Equals(n.geom, ST_ClosestPoint(l.geom, n.geom))
),
ordered_nodes AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY line_id ORDER BY fraction) as rn
    FROM node_on_line
),
nodes_pairs AS (
    SELECT
        n1.line_id,
        n1.node_id AS source,
        n1.node_geom AS source_geom,
        n2.node_id AS target,
        n2.node_geom AS target_geom
    FROM ordered_nodes n1
    JOIN ordered_nodes n2 ON n1.line_id = n2.line_id AND n2.rn = n1.rn + 1
)
INSERT INTO network_edges (source, target, cost, geom)
SELECT
    source,
    target,
    round(ST_DistanceSphere(source_geom, target_geom)::numeric / 1000, 2) AS cost,
    ST_MakeLine(source_geom, target_geom) AS geom
FROM nodes_pairs;

ALTER TABLE network_edges
ADD COLUMN reverse_cost double precision;

UPDATE network_edges
SET reverse_cost = cost;

CREATE INDEX network_edges_geom_idx ON network_edges USING gist(geom);

SELECT 'Success! Final network_edges table created.' AS status;



----installing pgrouting-----

--select * from pg_extension where extname = 'pgrouting'; 


----final result table----


DROP TABLE IF EXISTS short_path;

--Create a new table 'short_path' containing the result of the routing query.
CREATE TABLE short_path AS
SELECT e.*
FROM pgr_dijkstra(
    'SELECT id, source, target, cost, reverse_cost FROM network_edges',
    114382,    --source
    146085,      --target
    directed := false
) AS path
JOIN network_edges e ON path.edge = e.id;

--Show the result
SELECT * FROM short_path;


----select dynamic points----

create table points(
id serial primary key,
geom geometry (Point, 4326)

)
select * from points


