import os
import sys
import uuid
import datetime
import argparse
import geopandas as gpd
from shapely.geometry import shape, mapping
from elasticsearch import Elasticsearch, helpers

# Elasticsearch index definition for the Wayline geocoder. The two things the
# dynamic-mapping default got wrong are fixed here: center_point must be a
# geo_point (so reverse-geocode / geo_distance works) and geometry a geo_shape.
# Everything under properties.* stays generic via a dynamic template, so this
# loader still works for any dataset — each string field gets an edge-ngram
# analyzer for type-ahead plus a .keyword sub-field for exact match / sorting.
GEO_INDEX_BODY = {
    "settings": {
        "analysis": {
            "tokenizer": {
                "edge_ngram_tokenizer": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 20,
                    "token_chars": ["letter", "digit"],
                }
            },
            "analyzer": {
                "autocomplete_index": {
                    "tokenizer": "edge_ngram_tokenizer",
                    "filter": ["lowercase"],
                },
                "autocomplete_search": {
                    "tokenizer": "lowercase",
                },
            },
        }
    },
    "mappings": {
        "properties": {
            "center_point": {"type": "geo_point", "ignore_malformed": True},
            "geometry": {"type": "geo_shape", "ignore_malformed": True},
            "dataset": {"type": "keyword"},
            "geometry_type": {"type": "keyword"},
            "indexed_at": {"type": "date"},
        },
        "dynamic_templates": [
            {
                "property_strings": {
                    "path_match": "properties.*",
                    "match_mapping_type": "string",
                    "mapping": {
                        "type": "text",
                        "analyzer": "autocomplete_index",
                        "search_analyzer": "autocomplete_search",
                        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                    },
                }
            }
        ],
    },
}


def ensure_index(es, index_name, recreate=False):
    """Create the geocoding index with the correct geo mappings if needed."""
    exists = es.indices.exists(index=index_name)
    if exists and recreate:
        print(f"Dropping existing index '{index_name}' (--recreate)...")
        es.indices.delete(index=index_name)
        exists = False
    if not exists:
        print(f"Creating index '{index_name}' with geo_point/geo_shape mappings...")
        es.indices.create(index=index_name, body=GEO_INDEX_BODY)
    else:
        print(f"Index '{index_name}' already exists — appending to it.")


def normalize_geometry(geom):
    """
    Simplify geometry if it is a polygon and too complex.
    """
    if geom is None:
        return None
    # For now, just return as-is, but we can simplify if number of coordinates is large
    if geom.geom_type in ['Polygon', 'MultiPolygon']:
        # simplistic simplification
        return geom.simplify(0.001, preserve_topology=True)
    return geom

def process_file(file_path, index_name, es_url, recreate=False):
    print(f"Loading data from {file_path}...")
    try:
        # geopandas uses fiona under the hood to read shapefiles, geojson, postgis, and csv (if correctly specified)
        # For CSV with lat/lon, we might need a custom loader or let geopandas infer if possible
        if file_path.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(file_path)
            # Find lat/lon columns
            lat_col = next((c for c in df.columns if c.lower() in ['lat', 'latitude', 'y']), None)
            lon_col = next((c for c in df.columns if c.lower() in ['lon', 'longitude', 'lng', 'x']), None)
            
            if lat_col and lon_col:
                gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[lon_col], df[lat_col]), crs="EPSG:4326")
            else:
                print("Could not detect lat/lon columns for CSV.")
                sys.exit(1)
        else:
            gdf = gpd.read_file(file_path)
    except Exception as e:
        print(f"Error loading file: {e}")
        sys.exit(1)

    print(f"Loaded {len(gdf)} records.")
    
    print("Normalizing CRS to EPSG:4326...")
    if gdf.crs is None:
        # Assume 4326 if none provided
        gdf.set_crs(epsg=4326, inplace=True)
    elif gdf.crs.to_epsg() != 4326:
        gdf.to_crs(epsg=4326, inplace=True)
        
    print("Simplifying geometries if needed...")
    gdf['geometry'] = gdf['geometry'].apply(normalize_geometry)
    
    dataset_name = os.path.basename(file_path)
    indexed_at = datetime.datetime.utcnow().isoformat()
    
    es = Elasticsearch(es_url)
    ensure_index(es, index_name, recreate=recreate)

    def generate_actions(gdf):
        for idx, row in gdf.iterrows():
            geom = mapping(row['geometry']) if row['geometry'] else None
            # Convert NaN to None for JSON serialization
            properties = row.drop('geometry').dropna().to_dict()
            
            doc = {
                "dataset": dataset_name,
                "indexed_at": indexed_at,
                "geometry_type": geom['type'] if geom else None,
                "properties": properties,
                "geometry": geom,
            }
            # Pelias structure expects center_point, we can approximate
            if geom:
                # Add a centroid for basic point searches
                centroid = row['geometry'].centroid
                doc['center_point'] = {'lat': centroid.y, 'lon': centroid.x}
                
            yield {
                "_index": index_name,
                "_id": str(uuid.uuid4()),
                "_source": doc
            }

    print("Bulk indexing to Elasticsearch...")
    # raise_on_error=False so a handful of malformed geometries don't abort the
    # whole load; we report how many failed instead.
    success, errors = helpers.bulk(
        es, generate_actions(gdf), chunk_size=500, raise_on_error=False
    )
    print(f"Indexed {success} documents successfully.")
    if errors:
        print(f"WARNING: {len(errors)} documents failed to index (e.g. malformed geometry).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Wayline Dynamic ETL Normalizer")
    parser.add_argument("file_path", help="Path to the spatial file (CSV, SHP, GeoJSON, etc.)")
    parser.add_argument("--index", default=os.environ.get("GEO_INDEX", "wayline_geo"), help="Elasticsearch index name (default: wayline_geo)")
    parser.add_argument("--es-url", default=os.environ.get("ES_URL", "http://elasticsearch:9200"), help="Elasticsearch URL")
    parser.add_argument("--recreate", action="store_true", help="Drop and recreate the index before loading.")

    args = parser.parse_args()
    process_file(args.file_path, args.index, args.es_url, recreate=args.recreate)
