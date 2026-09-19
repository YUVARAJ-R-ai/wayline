#!/usr/bin/env bash
# Load the Greater Chennai Corporation street dataset into PostGIS.
#
# The dataset (GCC_Streets shapefile — ~94k street polylines, WGS84) is an
# external asset and is NOT committed to the repo. It lives in the server vault.
# This script loads it into the running `postgres_database` container so that
# the /api/streets overlay endpoint has data to serve.
#
# The gcc_streets table lives in the persistent `postgres_data` volume, so this
# only needs to be run once per fresh database (not on every deploy).
#
# Usage:
#   ./postgres/load_gcc_streets.sh [path/to/GCC_Streets.zip]
#
# Env overrides:
#   PG_CONTAINER  (default: postgres_database)
#   PG_USER       (default: admin)
#   PG_DB         (default: wayline)
set -euo pipefail

# Fallback search paths for GCC shapefile or zip
SHP_SRC="${1:-}"
if [[ -z "$SHP_SRC" ]]; then
  if [[ -f "./GCRoad_Network/GCRoad_Network.shp" ]]; then
    SHP_SRC="./GCRoad_Network/GCRoad_Network.shp"
  elif [[ -f "/data/vault/project_archive/maps-api/GCC_Streets.zip" ]]; then
    SHP_SRC="/data/vault/project_archive/maps-api/GCC_Streets.zip"
  fi
fi
PG_CONTAINER="${PG_CONTAINER:-postgres_database}"
PG_USER="${PG_USER:-admin}"
PG_DB="${PG_DB:-wayline}"

if [[ -z "$SHP_SRC" || ! -e "$SHP_SRC" ]]; then
  echo "ERROR: dataset not found at $SHP_SRC" >&2
  exit 1
fi

BASE=""
if [[ "$SHP_SRC" =~ \.zip$ ]]; then
  echo "==> Extracting $SHP_SRC"
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  python3 -c "import zipfile,sys; zipfile.ZipFile('$SHP_SRC').extractall('$WORK')"
  SHP="$(find "$WORK" -iname '*.shp' | head -n1)"
  BASE="${SHP%.*}"
else
  BASE="${SHP_SRC%.*}"
fi

echo "==> Copying shapefile into $PG_CONTAINER"
docker exec "$PG_CONTAINER" mkdir -p /tmp/gcc
for ext in shp shx dbf prj cpg; do
  [[ -f "$BASE.$ext" ]] && docker cp "$BASE.$ext" "$PG_CONTAINER:/tmp/gcc/gcc_streets.$ext"
done

echo "==> Loading into PostGIS as gcc_streets (SRID 4326, with GiST index)"
docker exec "$PG_CONTAINER" sh -c \
  "shp2pgsql -s 4326 -I -d /tmp/gcc/gcc_streets.shp gcc_streets | psql -U $PG_USER -d $PG_DB -q"

echo "==> Done. Row count:"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT count(*) FROM gcc_streets;"
