# GeoSnap Documentation

---
## Overview

**GeoSnap** is a geolocation-enabled backend built with FastAPI. It provides RESTful APIs for location-based services, including location creation, search, and proximity queries. The project is designed for easy integration with mapping and geospatial applications, and is fully Dockerized for rapid deployment.

---

## Features
  
- **User Authentication:** Secure endpoints using JWT tokens.

- **Location Management:** Create, search, and retrieve locations.

- **Nearby Search:** Find locations within a specified radius using the Haversine formula.

- **Async Database Access:** Uses SQLAlchemy with async support for scalable performance.

- **Dockerized:** Simple deployment and local development using Docker Compose.

- **API Documentation:** Interactive Swagger UI at `/docs`.

---

## Project Structure
  

```

GeoSnap/

│

├── app/

│ ├── main.py # FastAPI app entrypoint

│ ├── autosnap.py # Core location routes (create, search, nearby)

│ ├── routes/ # Additional route modules

│ ├── models.py # SQLAlchemy models

│ ├── db.py # Database session management

│ ├── auth.py # Authentication logic

│ └── utils/ # Utility functions (e.g., haversine)

│

├── tests/ # Unit tests

├── docker-compose.yml # Docker Compose setup

├── README.md # Project documentation

└── ...

```

  

---

  

## How to Run

  

### Locally (for development)

  

```bash

uvicorn app.main:app --reload

```

  

### With Docker

  

```bash

docker-compose up --build

```

  

---

  

## API Endpoints

  

- `POST /autosnap/create`

Create a new location (requires authentication).

  

- `GET /autosnap/search?query=...`

Search for locations by name.

  

- `GET /autosnap/nearby?lat=...&lng=...&radius_km=...`

Find locations near a given latitude/longitude.

  

- `GET /autosnap/getlocations`

Retrieve all locations for the authenticated user.

  

- `POST /auth/register`

Register a new user.

  

- `POST /auth/login`

Obtain a JWT token.

  

---

  

## How GeoSnap Helps in a Maps-API Project

  

- **Backend for Geospatial Data:**

GeoSnap can serve as the backend for storing and querying user-generated or system-generated locations.

  

- **Proximity Search:**

The `/nearby` endpoint enables features like "find places near me" or "show nearby users/objects" on your map.

  

- **Authentication:**

Secure your maps API with user authentication and authorization.

  

- **Easy Integration:**

The RESTful API can be consumed by any frontend (React, Next.js, mobile apps, etc.) or other backend services.

  

- **Scalable & Maintainable:**

Async support and modular codebase make it suitable for production and further extension.

  

---

  

## Example Use Case

  

Suppose you are building a mapping application where users can drop pins, search for places, and see what's nearby. GeoSnap provides all the backend logic for these features, so your frontend can focus on visualization and user experience.

  

---

  

## Further Reading

  

- [GeoSnap/README.md](GeoSnap/README.md)

- [FastAPI Documentation](https://fastapi.tiangolo.com/)

- [Docker Compose Documentation](https://docs.docker.com/compose/)

  

---
