# Geospatial ETL & Data Ingestion Research
_Generated: 2026-06-16 | Context: Wayline self-hosted microservices maps API_

## Executive Summary
Research across 7 ETL tools for geospatial data integration shows **no single perfect solution**. Recommendation: **multi-tool stack** combining Apache NiFi (transformation), Logstash (Elasticsearch indexing), and custom Python pipelines (format flexibility). Avoid Talend OS (discontinued).

---

## Tool Evaluation Matrix

| Tool | Geospatial Support | ES Integration | Learning Curve | Best For |
|------|-------------------|-----------------|-----------------|----------|
| **Apache NiFi** | ★★★★ (GeoMesa) | ★★☆ (manual) | Medium | Multi-format transforms, complex routing |
| **Airbyte** | ★★☆ (PostGIS only) | ★★★★ (native) | Very Low | PostGIS→ES batch sync, minimal code |
| **Logstash** | ★★☆ (PostGIS, limited GeoJSON) | ★★★★ (seamless) | Easy | Real-time PostGIS→ES streams |
| **Talend OS** | ★★★★ (archived) | ❌ None | Medium | ❌ **AVOID — discontinued** |
| **Pelias** | ★★★★★ (geocoding-native) | ★★★★★ (ES native) | Medium | Address geocoding, tile data |
| **PostGIS→ES Bridge** | ★★★★★ (PostGIS-only) | ★★★★★ (native) | Medium | Real-time DB↔index sync |
| **Custom Python** | ★★★★★ (libraries) | ★★★★ (client) | Hard | Non-standard formats, max flexibility |

---

## Critical Findings

### What Works Well
- **Logstash + PostGIS**: Proven pattern for real-time geospatial streaming to Elasticsearch. Native integration, minimal overhead.
- **NiFi + GeoMesa**: Handles shapefile, GeoJSON, WKT, GeoAvro conversions. Visual flow editor scales complex transformations.
- **Airbyte for PostGIS batches**: Fast setup, 400+ connectors, no coding required. Good for low-frequency sync scenarios.
- **Python (Fiona/GeoPandas/Shapely)**: De facto standard for shapefile/CSV processing. Most flexible but requires engineering.

### Critical Gotchas
1. **Elasticsearch geo_point ↔ geo_shape conflict**: Cannot query both in same index. Must choose one spatial type per index.
2. **GeoJSON incompatibility**: Elasticsearch expects flattened structure; raw GeoJSON fails. Logstash has filter for this.
3. **Complex polygon performance**: Polygons with 1000+ vertices slow index/query. Simplify before ingestion.
4. **Shapefile memory limits**: Loading entire 1GB+ shapefile in memory fails. Use Fiona streaming instead.
5. **Projection assumptions**: Elasticsearch assumes WGS84 (EPSG:4326). Coordinate mismatch = invisible data.

---

## Recommended Architecture for Wayline

### **Tier 1: Primary (Production-Ready)**
**Apache NiFi + Logstash Pipeline:**
```
Input (shapefile/GeoJSON/CSV/PostGIS)
  ↓
NiFi + GeoMesa (normalize formats, handle projections)
  ↓
Logstash (flatten, apply ES mapping, index)
  ↓
Elasticsearch (geo_point or geo_shape index)
```
- **Why**: Separates transformation (NiFi) from indexing (Logstash). Handles all geospatial formats. Horizontally scalable.
- **Effort**: High initial setup, medium ongoing ops.
- **Best for**: Complex multi-source geospatial data pipelines.

### **Tier 2: Alternative (Simpler Setup)**
**Logstash + Custom Python:**
```
PostGIS → Logstash (real-time streaming)
Shapefile/CSV → Python (GeoPandas/Fiona) → Elasticsearch bulk API
```
- **Why**: Logstash handles continuous PostGIS updates efficiently. Python scripts give flexibility for one-off imports.
- **Effort**: Low-to-medium. Python scripts are maintainable.
- **Best for**: PostGIS as primary source + occasional file imports.

### **Tier 3: Quick-Start (Low-Code)**
**Airbyte + GDAL:**
```
PostGIS → Airbyte → Elasticsearch (batch sync)
Shapefile → ogr2ogr → CSV → Elasticsearch bulk API
```
- **Why**: Fastest to production. Airbyte UI, no coding for PostGIS↔ES.
- **Effort**: Minimal setup.
- **Best for**: PostGIS backend + infrequent updates. Not suitable for real-time.

---

## Technology Stack Recommendation

| Component | Tool | Rationale |
|-----------|------|-----------|
| **Shapefile input** | GDAL/ogr2ogr or Fiona | Industry standard, handles complex geometries |
| **GeoJSON input** | Python + json library or NiFi | Language-native or visual |
| **CSV→Geo transform** | GeoPandas or NiFi | Vectorized or flow-based |
| **Coordinate projection** | Pyproj (Python) or NiFi + GeoTools | GDAL requires native library |
| **Real-time PostGIS** | Logstash + JDBC input | Native ES mapping, minimal latency |
| **Batch PostGIS** | Airbyte or custom Python | No-code or max control |
| **ES indexing** | Logstash or Elasticsearch bulk API | Native mapping or custom field control |

---

## Avoided Tools

- **Talend Open Studio**: Development ceased. No active community. Spatial extension archived.
- **Custom-only approach**: Viable but expensive (engineering time). Use hybrid: leverage tools for 80%, custom for 20%.

---

## Implementation Roadmap (Priority Order)

1. **Month 1**: Logstash + PostGIS streaming (real-time baseline)
2. **Month 2**: Add NiFi for shapefile imports (flexible format support)
3. **Month 3**: Python scripts for CSV/edge-case formats (flexibility buffer)
4. **Month 4**: (Optional) Pelias for address geocoding if needed

---

## References
- Apache NiFi + GeoMesa: http://www.geomesa.org/documentation/3.1.2/user/nifi.html
- Logstash geospatial: https://www.elastic.co/guide/en/logstash/8.19/plugins-filters-geoip.html
- Elasticsearch geo_shape limits: https://github.com/elastic/elasticsearch/issues/1486
- GDAL geospatial ETL: https://www.elastic.co/blog/how-to-ingest-geospatial-data-into-elasticsearch-with-gdal
- GeoPandas: https://geopandas.org/
- Pelias geocoder: https://pelias.github.io/pelias/

**Recommendation**: Start with **Logstash for PostGIS** (1 week), add **NiFi for shapefile/GeoJSON** (2 weeks). This covers 90% of use cases. Expand with custom Python as needed.
