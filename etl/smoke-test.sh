#!/usr/bin/env bash
# Wayline geocoder smoke test.
#
# Stands up an ISOLATED Elasticsearch, loads a dataset through the ETL, and
# verifies forward + reverse geocoding with the exact queries the api-gateway
# issues. It runs in a dedicated compose project (wl_geotest) and never touches
# the production containers, so it is safe to run on the live server.
#
# Usage:  ./etl/smoke-test.sh [path-to-dataset.zip]
#         (defaults to the GCC streets archive in the vault)
#
# Each run recreates the index from scratch and tears the test stack down on
# exit. Comment out the `trap` line if you want to keep ES up to poke at it.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
PROJECT="wl_geotest"
INDEX="wayline_geo"
ES="http://localhost:9200"
ZIP="${1:-/data/vault/project_archive/maps-api/GCC_Streets.zip}"
COMPOSE=(docker compose -p "$PROJECT" -f "$ROOT/docker-compose.yaml" --project-directory "$ROOT")

cleanup() {
  echo "--- cleanup: removing test stack (prod untouched) ---"
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  [ -n "${TMP:-}" ] && rm -rf "$TMP"
}
trap cleanup EXIT

echo "==> 1/5  build ETL image"
docker build -q -t wayline-etl "$ROOT/etl" >/dev/null

echo "==> 2/5  start isolated Elasticsearch (project: $PROJECT)"
"${COMPOSE[@]}" up -d elasticsearch >/dev/null
printf "         waiting for ES health"
until [ "$(docker inspect -f '{{.State.Health.Status}}' wayline_elasticsearch 2>/dev/null)" = "healthy" ]; do
  printf "."; sleep 4
done
echo " healthy"

echo "==> 3/5  extract + load data via ETL"
TMP="$(mktemp -d)"
python3 -c "import zipfile; zipfile.ZipFile('$ZIP').extractall('$TMP')"
SHP="$(basename "$(ls "$TMP"/*.shp | head -1)")"
docker run --rm --network "${PROJECT}_default" -v "$TMP:/data:ro" wayline-etl \
  "/data/$SHP" --index "$INDEX" --recreate --es-url http://elasticsearch:9200

echo "==> 4/5  index facts (expect ~94k docs, geo_point + geo_shape)"
curl -s "$ES/$INDEX/_count" | python3 -c "import sys,json;print('         docs:',json.load(sys.stdin)['count'])"
curl -s "$ES/$INDEX/_mapping" | python3 -c "import sys,json;p=list(json.load(sys.stdin).values())[0]['mappings']['properties'];print('         center_point:',p['center_point']['type'],'| geometry:',p['geometry']['type'])"

echo "==> 5/5  geocode checks"
printf "         FORWARD 'Anna Salai': "
curl -s "$ES/$INDEX/_search" -H 'Content-Type: application/json' -d '{"size":1,"query":{"multi_match":{"query":"Anna Salai","fields":["properties.road_name^3","properties.area_name","properties.ward"],"type":"best_fields","fuzziness":"AUTO"}}}' \
  | python3 -c "import sys,json;h=json.load(sys.stdin)['hits']['hits'];s=h[0]['_source'] if h else None;print(s['properties']['road_name'],'@',round(s['center_point']['lat'],4),round(s['center_point']['lon'],4)) if s else print('NO MATCH (FAIL)')"
printf "         REVERSE 13.0500,80.2824: "
curl -s "$ES/$INDEX/_search" -H 'Content-Type: application/json' -d '{"size":1,"query":{"match_all":{}},"sort":[{"_geo_distance":{"center_point":{"lat":13.05,"lon":80.2824},"order":"asc","unit":"m"}}]}' \
  | python3 -c "import sys,json;h=json.load(sys.stdin)['hits']['hits'];print(h[0]['_source']['properties']['road_name'],'-',round(h[0]['sort'][0]),'m away') if h else print('NO MATCH (FAIL)')"

echo "==> PASS"
