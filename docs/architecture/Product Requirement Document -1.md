# Wayline Geospatial Services Platform v1.0

## Document Information
- **Document Status**: Development Ready
- **Version**: 1.1 (Amended for User Management)
- **Author**: Wayline Project Team
- **Last Updated**: July 07, 2025
- **Development Platform**: Cursor AI
- **Target Deployment**: Docker Compose

---

## 1. Executive Summary

Wayline is an open-source, self-hostable geospatial services platform designed to provide essential mapping capabilities through a modern, containerized microservice architecture. This document serves as the comprehensive development specification for Cursor AI implementation.

### 1.1 Problem Statement

Current mapping solutions present significant challenges:
- **Cost**: Third-party APIs (Google Maps, Mapbox) have expensive usage-based pricing
- **Vendor Lock-in**: Proprietary services create dependencies and data portability issues
- **Rate Limits**: External APIs impose usage restrictions that can limit business growth
- **Data Privacy**: Sensitive location data is processed by external services
- **Customization**: Limited ability to modify or extend functionality

### 1.2 Solution Overview

Wayline addresses these challenges by providing:
- Self-hosted mapping infrastructure with full data control
- High-performance routing and geocoding services
- Docker-based deployment for easy scaling and maintenance
- Open-source architecture allowing customization and extension
- Cost-effective alternative to commercial mapping APIs

---

## 2. Goals & Success Criteria

### 2.1 Product Goals

| Goal | Success Metric | Measurement Method |
|------|---------------|-------------------|
| High-Performance Routing | P95 response time < 500ms | API monitoring |
| Reliable Geocoding | 95% accuracy for regional addresses | Test suite validation |
| Easy Deployment | Setup time < 30 minutes (post data-processing) | Documentation testing |
| Intuitive UI | User task completion < 30 seconds | User testing |
| **Secure User Management** | **API key generation & initial login < 1 minute** | **User testing** |

### 2.2 Business Goals

- **Cost Reduction**: Eliminate per-request API fees for core mapping functions
- **Data Sovereignty**: Maintain full control over location data and processing
- **Scalability**: Support growing business needs without vendor restrictions
- **Innovation**: Enable custom geospatial features and integrations

### 2.3 Technical Goals

- **Containerization**: 100% Docker-based deployment
- **API-First**: RESTful API design with comprehensive documentation
- **Modularity**: Microservice architecture for independent scaling
- **Performance**: Sub-second response times for all core operations
- **Authentication & Authorization**: Secure user accounts and API key-based access control

---

## 3. User Personas & Use Cases

### 3.1 Primary Persona: Devin the Developer

**Background**: Backend developer at a logistics company
**Technical Skills**: High (Node.js, Python, API integration)
**Primary Needs**: Reliable APIs, clear documentation, performance monitoring

**Use Cases (Amended)**:
1. **Route Integration**: Integrate routing API into dispatch application using a generated API key.
2. **Address Validation**: Validate customer addresses during order processing.
3. **API Key Management**: Generate, view, and revoke API keys for different applications.
4. **Usage Monitoring**: Track API request volume through the user dashboard to monitor costs and usage patterns.
5. **Custom Logic**: Extend platform with business-specific routing rules

**Pain Points**:
- API rate limits disrupting business operations
- Expensive per-request pricing
- Limited customization options
- Vendor dependency concerns

### 3.2 Secondary Persona: Operations Olivia

**Background**: Dispatch manager, non-technical user
**Technical Skills**: Low (web applications, basic map interfaces)
**Primary Needs**: Simple interface, quick results, visual route planning

**Use Cases**:
1. **Manual Route Planning**: Visualize delivery routes for drivers
2. **Address Lookup**: Find customer locations quickly
3. **Route Verification**: Confirm automated routing decisions
4. **Emergency Routing**: Plan alternate routes during disruptions

**Pain Points**:
- Complex interfaces requiring technical knowledge
- Slow response times affecting daily operations
- Limited visibility into routing decisions

---

## 4. Technical Architecture

### 4.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Wayline Platform                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React/Leaflet)                                      │
│  ├─── Interactive Map Component                                 │
│  ├─── Route Planning Interface                                 │
│  ├─── Address Search Component                                 │
│  └─── User Dashboard (API Keys & Usage)                         │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway (Node.js/Express)                                 │
│  ├─── Authentication & User Endpoints (Login, Register)         │
│  ├─── Protected Geospatial Endpoints (Routing, Geocoding)       │
│  ├─── Dashboard & API Key Endpoints                             │
│  └─── API Key Authentication Middleware                         │
├─────────────────────────────────────────────────────────────────┤
│  Backend Services                                              │
│  ├─── OSRM Container (Routing)                                 │
│  ├─── Pelias Container (Geocoding with Custom Data)            │
│  ├─── GeoServer Container (Custom Basemap)                     │
│  ├─── Elasticsearch (Pelias Search Index)                      │
│  └─── PostgreSQL/PostGIS (Spatial Data + User Data)             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Container Architecture

#### 4.2.1 API Gateway Container
- **Base Image**: `node:18-alpine`
- **Framework**: Express.js
- **Port**: 3000
- **Dependencies**: cors, helmet, express-rate-limit, swagger-ui-express, **jsonwebtoken, bcryptjs, uuid**

#### 4.2.2 OSRM Container
- **Base Image**: `osrm/osrm-backend:latest`
- **Data**: Pre-processed regional OSM data
- **Port**: 5000
- **Volume**: `/opt/osrm-data` for map data

#### 4.2.3 Pelias Geocoding Container
- **Base Image**: `pelias/api:latest`
- **Port**: 4000
- **Dependencies**: Elasticsearch, PostgreSQL/PostGIS
- **Data Sources**: OSM + Custom datasets

#### 4.2.4 Elasticsearch Container
- **Base Image**: `elasticsearch:7.17.0`
- **Port**: 9200
- **Volume**: `/usr/share/elasticsearch/data`
- **Purpose**: Pelias search index storage

#### 4.2.5 GeoServer Container
- **Base Image**: `kartoza/geoserver:2.23.0`
- **Port**: 8081
- **Volume**: `/opt/geoserver/data_dir`
- **Purpose**: Serve custom basemap tiles (OSM + Custom data)

#### 4.2.6 PostgreSQL/PostGIS Container
- **Base Image**: `postgis/postgis:15-3.3`
- **Port**: 5432
- **Volume**: `/var/lib/postgresql/data`
- **Purpose**: Spatial data storage for custom datasets **and user account/API key management**.

#### 4.2.7 Frontend Container
- **Base Image**: `node:18-alpine`
- **Framework**: React 18
- **Build Tool**: Vite
- **Port**: 8080

---

## 5. Detailed Feature Specifications

*(Sections 5.1 through 5.4 remain as originally specified)*

...

### 5.5 Feature: User Dashboard & API Management (NEW)

#### 5.5.1 Requirements
- **User Authentication**: Users must be able to register for an account and log in.
- **API Key Generation**: Logged-in users can generate unique API keys for accessing the geospatial APIs.
- **API Key Management**: Users can view their active API keys and revoke them.
- **Usage Monitoring**: The dashboard will display the total number of API requests made with the user's keys over a specific period (e.g., last 30 days).
- **Security**: Passwords must be securely hashed. All communication should be over HTTPS in production.

#### 5.5.2 API Specifications

**Authentication Endpoints**
-   `POST /auth/register` (body: `email`, `password`) - Creates a new user.
-   `POST /auth/login` (body: `email`, `password`) - Returns a JWT for session management.

**API Key Management Endpoints (Requires JWT Auth)**
-   `GET /api/keys` - Returns a list of the user's active API keys.
-   `POST /api/keys` (body: `name`) - Generates a new API key and returns it **once**.
-   `DELETE /api/keys/:keyPrefix` - Revokes an API key.

**Dashboard Endpoint (Requires JWT Auth)**
-   `GET /api/dashboard/usage` - Returns aggregated usage statistics for the user.

**Geospatial Endpoint Protection**
-   All endpoints under `/api/route`, `/api/geocode`, etc., will now require an `X-API-Key` header for authentication.

#### 5.5.3 Frontend UI Specifications
-   **Login/Register Pages**: Standard forms for user authentication.
-   **Dashboard Page**:
    -   Accessible after login via a navigation link.
    -   **API Keys Section**:
        -   A list of existing keys, showing the name, a masked key (e.g., `wlk_...abcd`), creation date, and a "Revoke" button.
        -   A "Generate New Key" button that opens a modal to name the key.
    -   **API Usage Section**:
        -   A simple bar chart showing daily API requests for the last 30 days.
        -   Summary cards for "Total Requests (This Month)" and "Average Daily Requests".

#### 5.5.4 Database Schema
The `PostgreSQL` database will be extended with the following tables:

**`users` Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`api_keys` Table**
```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
```

**`api_usage_logs` Table**
```sql
CREATE TABLE api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id),
    endpoint VARCHAR(100) NOT NULL,
    request_timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Implementation Guidelines for Cursor AI

*(Section 6.1 Project Structure remains as originally specified)*

...

### 6.2 Development Priorities (Amended)

#### Phase 1: Core Infrastructure & Auth (Week 1-2)
1.  **Docker Compose Setup**
   - Configure all service containers (OSRM, Pelias, GeoServer, Elasticsearch, PostgreSQL)
   - Set up networking, volumes, and environment configuration
2.  **Database Schema Setup**
   - Implement migrations for `users`, `api_keys`, and `api_usage_logs` tables in PostgreSQL.
3.  **Authentication Service**
   - Implement `register` and `login` endpoints in the API Gateway.
   - Set up JWT generation/validation and password hashing.
4.  **API Key Middleware**
   - Create middleware to protect geospatial endpoints by validating the `X-API-Key` header.
5.  **Data Pipeline Foundation**
   - Begin OSM data download and processing scripts for OSRM and Pelias.

#### Phase 2: Core Features & Dashboard (Week 3-4)
1.  **Routing & Geocoding Implementation**
   - Integrate OSRM and Pelias services behind the API key middleware.
   - Finalize API endpoints for route, geocode, and reverse-geocode.
2.  **Frontend Auth & Dashboard**
   - Create Login, Register, and Dashboard pages in React.
   - Build API endpoints and UI components for API key management and usage visualization.
3.  **Basemap & Map Interface**
   - Integrate GeoServer tiles into the Leaflet map.
   - Build the frontend route visualization and address search components.

#### Phase 3: Polish and Testing (Week 5-6)
*(Unchanged from original PRD)*

*(Section 6.3 Code Quality and 6.4 Testing Requirements remain as originally specified)*

---

## 7. Deployment & DevOps

*(Section 7.1 Docker Compose Configuration remains largely the same, but with the understanding that the API Gateway will require database credentials)*

### 7.2 Environment Configuration (Amended)

```bash
# .env file structure
NODE_ENV=production
API_PORT=3000
FRONTEND_PORT=8080
JWT_SECRET=super_secret_key_for_json_web_tokens # Add this secret

# Database configuration
POSTGRES_DB=wayline
POSTGRES_USER=wayline
POSTGRES_PASSWORD=secure_password_here

# Service URLs
OSRM_URL=http://osrm:5000
PELIAS_URL=http://pelias-api:4000
GEOSERVER_URL=http://geoserver:8080
ELASTICSEARCH_URL=http://elasticsearch:9200

# GeoServer configuration
GEOSERVER_ADMIN_USER=admin
GEOSERVER_ADMIN_PASSWORD=admin123

# ... (other configs)
```

---

## 8. Security Considerations

### 8.1 API Security (Amended)
- **Rate Limiting**: 100 requests per minute per API Key.
- **CORS**: Configure allowed origins.
- **Input Validation**: Joi schema validation on all inputs.
- **Security Headers**: Helmet.js implementation.
- **Authentication**: All data-serving endpoints (`/api/route`, etc.) must be protected and require a valid API key via an `X-API-Key` header.

### 8.2 Data Security
- **Database**: Strong passwords, limited access.
- **Network**: Internal service communication.
- **Logs**: Sanitized log output.
- **Secrets**: Environment variable management for all secrets, including JWT secret and database passwords.

### 8.3 Authentication & Authorization (NEW)
- **Password Storage**: Passwords must be hashed using a strong, salted algorithm like `bcrypt`.
- **API Key Security**: Generate cryptographically strong keys. Store only a hash of the API key in the database for verification. The full key is shown to the user only once upon creation.
- **Session Management**: Use short-lived JSON Web Tokens (JWTs) for frontend dashboard sessions, ideally stored in secure, HTTP-only cookies.

---

## 9. Performance Benchmarks

### 9.1 API Performance Targets (Corrected)
| Endpoint | P50 | P95 | P99 | Throughput |
|----------|-----|-----|-----|------------|
| /api/route | 150ms | 500ms | 1000ms | 50 RPS |
| /api/geocode | 100ms | **300ms** | 600ms | 100 RPS |
| /api/reverse-geocode | 80ms | 250ms | 500ms | 100 RPS |

*(The remainder of the document, Sections 9.2 through 12, remains as originally specified.)*