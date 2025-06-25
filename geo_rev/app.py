from flask import Flask, request, jsonify
import pandas as pd
import psycopg2
from geopy.distance import geodesic
app = Flask(__name__)

conn = psycopg2.connect(
    dbname="map_api",
    password="root",
    user="postgres",
    host="localhost",
    port="5432"
    )

@app.route("/get_location/lon:<lon>/lat:<lat>")
def get_coord(lon, lat):
    """
    Returns the coordinates as a JSON object.
    """
    try:
        #lon = float(lon)
        #lat = float(lat)
        return jsonify({"lon": lon, "lat": lat , "Address": find_nearest_address( float(lat), float(lon))}),200
    except ValueError:
        return jsonify({"error": "Invalid coordinates"}), 400


def find_nearest_address(query_lat, query_lon):

    cur = conn.cursor()

    # Fetch data into DataFrame
    cur.execute("SELECT lat, lon, address FROM coordinates;")
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=['lat', 'lon', 'address'])

    # Compute distances
    def compute_distance(row):
        return geodesic((query_lat, query_lon), (row['lat'], row['lon'])).meters

    df['distance'] = df.apply(compute_distance, axis=1)

    # Find closest
    nearest_row = df.loc[df['distance'].idxmin()]

    # Cleanup
    #cur.close()
    #conn.close()

    return nearest_row['address']


@app.route("/get_coord/address:<address>")
def get_coord_by_address(address):
    """
    Returns the coordinates for a given address.
    """
    cur = conn.cursor()
    try:
        cur.execute("SELECT lat, lon FROM coordinates WHERE address = %s;", (address,))
        row = cur.fetchone()
        if row:
            return jsonify({"lat": row[0], "lon": row[1]}),200
        else:
            return jsonify({"error": "Address not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()


if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)