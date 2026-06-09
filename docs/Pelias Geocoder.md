**The simplest analogy:**
*   **[[Working of Nominatim|Nominatim]]** is like a traditional, handcrafted, all-in-one Swiss Army Knife. It's a single, complex tool designed by one group to do one job very well, but it can be hard to modify or take apart.
*   **Pelias** is like a modern workshop full of specialized, high-end LEGO Technic pieces. You can assemble them in different ways, swap pieces out, and even add your own custom-built blocks to create a machine perfectly tailored to your needs.

Let's break down Pelias in detail.

---

### What is Pelias?

Pelias is not a single piece of software; it's a **modular, open-source geocoding engine**. It's a collection of many small, independent programs (microservices) that work together. Its design philosophy prioritizes **flexibility, modularity, and the ability to easily combine multiple data sources.**

It was originally developed at Mapzen and is now maintained by Geocode.earth.

### How Pelias Works: The Architecture

Pelias is composed of three main parts: **Importers**, a **Search Engine**, and an **API**.

#### 1. The Search Engine: Elasticsearch

At the very heart of Pelias is [[Elasticsearch]]. This is the biggest difference from Nominatim, which uses PostgreSQL. Elasticsearch is a powerful search and analytics engine built for:
*   **Full-text search:** Finding documents that match a query, like a web search engine.
*   **Relevance ranking:** Scoring results based on how well they match, not just whether they match.
*   **Speed and scalability:** It's designed to be extremely fast and can be scaled across multiple servers in a cluster.
*   **Typo tolerance:** It has excellent built-in features for handling spelling mistakes (`"praguee"` can still find "Prague").

#### 2. The Importers: The Data Pipelines

Pelias doesn't just have one import process; it has a separate, dedicated importer for each data source. This is its key modular feature.

*   **`pelias-osm`:** An importer specifically for OpenStreetMap data. It reads an OSM `.pbf` file, extracts relevant features (streets, venues, addresses), and loads them into Elasticsearch.
*   **`pelias-openaddresses`:** An importer for the OpenAddresses project, a collection of millions of open government address points.
*   **`pelias-whosonfirst`:** This is crucial. It imports data from Who's On First, which provides the **administrative hierarchy** (the relationships between continents, countries, regions, cities, and neighborhoods). This is how Pelias knows that "Berlin" is in "Germany," which is in "Europe." Nominatim calculates this hierarchy itself; Pelias ingests it from a dedicated source.
*   **`pelias-csv-importer`:** A generic importer you can use to load your own custom data from a CSV file. You configure which columns map to which fields (name, number, street, postcode), and it loads your data into the same Elasticsearch index as everything else.

Each importer is an independent microservice. You can choose to run only the ones you need.

#### 3. The API: The Public-Facing Door

The **`pelias-api`** is the single microservice that users interact with. When a search query like `/v1/search?text=eiffel tower paris` comes in:

1.  **Parsing:** The API analyzes the query text, trying to identify place names, address components, etc.
2.  **Query Building:** It constructs a complex, finely-tuned query to send to Elasticsearch. This query is designed to balance accuracy with relevance. For example, it will boost the score of results where "eiffel tower" is the name and "paris" is the city.
3.  **Searching:** It sends this query to the Elasticsearch index, which contains the combined data from all the importers you ran.
4.  **Formatting:** Elasticsearch returns a list of ranked results. The API then cleans these up, formats them into a standardized GeoJSON response, and sends it back to the user.

---

### How Pelias is Different from Nominatim: A Head-to-Head Comparison

| Feature | Pelias | Nominatim |
| :--- | :--- | :--- |
| **Architecture** | **Microservices.** A collection of independent, replaceable modules (importers, API). | **Monolithic.** A single, tightly integrated application (PostgreSQL + custom code). |
| **Core Database** | **Elasticsearch.** A search engine optimized for full-text search and relevance ranking. | **PostgreSQL.** A relational database optimized for structured data and complex joins. |
| **Primary Strength** | **Flexibility and Data Integration.** Easily combine OSM, open addresses, and your own custom data. Excellent for "search-as-you-type." | **Structured Address Parsing.** Excels at deconstructing a formal address and finding the most precise match in OSM. The standard for reverse geocoding. |
| **Data Sources** | **Multi-source by design.** Can import from OSM, OpenAddresses, Who's On First, CSVs, etc., into one index. | **OSM-centric.** Designed to work exclusively with OpenStreetMap data. Adding other sources is extremely difficult. |
| **Hierarchy** | **Ingested from Who's On First.** Relies on an external, curated dataset for administrative hierarchies. | **Calculated during import.** Analyzes the OSM data itself to build the hierarchy of places. |
| **Typo Tolerance** | **Very High.** A native feature of Elasticsearch. | **Moderate.** Has some handling but is much less forgiving than a full-text search engine. |
| **Setup & Maintenance** | **Complex but manageable with Docker.** You need to understand and manage multiple services, but they are containerized. | **Notoriously complex and resource-intensive.** The import process is a single, long-running task that requires a powerful server. |
| **Customization** | **Highly customizable.** You can write your own importer, replace the API, or fine-tune the Elasticsearch queries. | **Difficult to customize.** Modifying its core logic requires deep knowledge of its internal C and PHP code. |

### Summary: Why Choose One Over the Other?

**Choose Pelias when:**
*   You **need to combine OSM data with your own custom datasets** (e.g., your store locations, government address data). This is Pelias's killer feature.
*   You need a fast, forgiving, "search-as-you-type" experience for a user-facing search bar.
*   You value a modern, modular architecture that you can adapt and scale.
*   Your team has experience with Elasticsearch.

**Choose Nominatim when:**
*   Your **only data source is OpenStreetMap.**
*   You need the absolute best **structured address geocoding** or **reverse geocoding** possible from OSM data.
*   You prefer a single, stable, all-in-one system and don't need to blend data sources.
*   You are building a backend service for data processing (e.g., cleaning up a database of addresses) rather than a real-time user interface.