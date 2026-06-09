### Introduction

### Strategy Summary for Basemap Creation with Limited RAM

1. **Identify Large Layers:** Pinpoint any .zip files that are hundreds of MBs, as they are likely to be huge when unzipped (e.g., Buildings, contours, Block).
2. **Process One by One with ogr2ogr:** For each large layer:
    
    a. Unzip it.
    
    b. Open the **OSGeo4W Shell**.
    
    c. Use the efficient ogr2ogr command to convert it directly to a re-projected GeoPackage (.gpkg).
    
    ogr2ogr -f "GPKG" [output_name].gpkg [input_name].shp -t_srs EPSG:3857 -nlt PROMOTE_TO_MULTI
    
    d. Delete the original massive shapefile folder to free up disk space.
    
3. **Load into QGIS:** Load all your new, efficient .gpkg files into a single QGIS project. They will be performant and easy to work with.
4. **Proceed with Basemap Creation:** From here, you can follow the original plan:
    - Style your layers in QGIS.
    - Set scale-dependent visibility.
    - Load them into a PostGIS database (you can use ogr2ogr for this, too!) or serve them directly from the GeoPackage files using a modern tile server.

### Point 1

Why is it so fast? The GeoPackage has a **spatial index**. When you zoom into an area, QGIS uses the index to ask the file, "Only give me the buildings inside this specific rectangle I'm looking at." It doesn't try to read the whole file. This is the key to working with massive datasets.

### Point 2

On Arch Linux, you have access to high-performance tools. The standard `unzip` utility is single-threaded and slow, with bottlenecks in both CPU (decompression) and I/O (writing large files to disk).

Let's address both issues.

### Method 1: Faster Unzipping with `p7zip`

Use `p7zip`, a multi-threaded tool that utilizes all CPU cores for faster decompression.

**1. Install `p7zip`:** Available in Arch repositories.

```bash
sudo pacman -S p7zip

```

**2. Use `7z` to Unzip:** Simple extraction syntax:

```bash
# Navigate to the directory with your zip file
cd /path/to/your/data

# Use 7z to extract the archive
7z x Buildings.zip

```

**Why is this faster?** `7z` uses multiple CPU cores simultaneously, unlike `unzip` which uses only one.

Note: You'll still be limited by disk write speed for large files.

---

### Method 2: Direct Processing (Most Efficient)

For GIS workflows, **bypass unzipping entirely**.

`ogr2ogr` can read directly from zip archives using "Virtual Filesystems" without extracting to disk.

Benefits:

1. **Eliminates large disk writes** - your main bottleneck.
2. **Saves disk space** - no temporary uncompressed files.
3. **Single command operation.**

**Syntax for `ogr2ogr` Virtual Zip:**

`/vsizip/path/to/archive.zip/path/inside/archive.shp`

- `/vsizip/`: Tells `ogr2ogr` to use zip virtual filesystem.
- `path/to/archive.zip`: Path to your zip file.
- `path/inside/archive.shp`: Shapefile name within the archive.

**Command:**

Install GDAL: `sudo pacman -S gdal`

Then run:

```bash
ogr2ogr -f "GPKG" Buildings_web.gpkg /vsizip/Buildings.zip/Buildings.shp -t_srs EPSG:3857 -nlt PROMOTE_TO_MULTI

```

Components:

- `ogr2ogr`: Conversion tool.
- `-f "GPKG"`: Output to GeoPackage format.
- `Buildings_web.gpkg`: Output filename.
- `/vsizip/Buildings.zip/Buildings.shp`: **Input source** read directly from zip.
- `-t_srs EPSG:3857`: Web Mercator projection.
- `-nlt PROMOTE_TO_MULTI`: Ensures geometry consistency.

Process: `Buildings.zip` → `Decompress in RAM` → `Re-project in RAM` → `Write to Buildings_web.gpkg`

The data never needs to be fully uncompressed on disk, making this ideal for systems with limited RAM.

### Recommended Workflow

1. **Keep zip files compressed.** Don't extract `Buildings.zip`, `contours.zip`, etc.
2. Convert each layer directly using `ogr2ogr` with the virtual filesystem:
    
    ```bash
    # For buildings
    ogr2ogr -f "GPKG" Buildings.gpkg /vsizip/Buildings.zip/Buildings.shp -t_srs EPSG:3857 -nlt PROMOTE_TO_MULTI
    
    # For contours
    ogr2ogr -f "GPKG" contours.gpkg /vsizip/contours.zip/contours.shp -t_srs EPSG:3857 -nlt PROMOTE_TO_MULTI
    ```
    
3. Load the resulting `.gpkg` files into QGIS for styling and basemap creation.


## Tags
#qgis
