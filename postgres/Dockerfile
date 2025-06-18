# This file builds our custom PostgreSQL image.

# Start from the official, trusted PostGIS image.
FROM postgis/postgis:16-3.4

# Switch to the root user to install new software.
USER root

# Update the package lists and install the osm2pgsql utility.
RUN apt-get update && apt-get install -y osm2pgsql

# Switch back to the default 'postgres' user for security.
USER postgres

