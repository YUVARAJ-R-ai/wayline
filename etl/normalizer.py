import os
import sys
import uuid
import datetime
import argparse
import geopandas as gpd
from shapely.geometry import shape, mapping
from elasticsearch import Elasticsearch, helpers

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

def process_file(file_path, index_name, es_url):
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
    try:
        success, failed = helpers.bulk(es, generate_actions(gdf), chunk_size=500)
        print(f"Indexed {success} documents successfully.")
    except Exception as e:
        print(f"Failed to index: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Wayline Dynamic ETL Normalizer")
    parser.add_argument("file_path", help="Path to the spatial file (CSV, SHP, GeoJSON, etc.)")
    parser.add_argument("--index", default="pelias", help="Elasticsearch index name (default: pelias)")
    parser.add_argument("--es-url", default=os.environ.get("ES_URL", "http://elasticsearch:9200"), help="Elasticsearch URL")
    
    args = parser.parse_args()
    process_file(args.file_path, args.index, args.es_url)
