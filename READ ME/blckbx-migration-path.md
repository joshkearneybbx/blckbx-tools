# BLCK BX - Migration Path to PocketBase + Coolify

## Overview

This document outlines the migration from:
- **Current:** Replit + Neon PostgreSQL + Express + Drizzle ORM
- **Target:** Coolify + PocketBase + React Frontend

### Why PocketBase?

| Feature | Current (Express + Postgres) | PocketBase |
|---------|------------------------------|------------|
| Auth | Need to implement (Replit Auth being removed) | Built-in (email, OAuth, admin) |
| Admin UI | None | Built-in admin dashboard |
| Realtime | None | Built-in subscriptions |
| File Storage | Need S3 or similar | Built-in (local or S3) |
| Deployment | Node + Postgres containers | Single Go binary |
| API | Custom Express routes | Auto-generated REST + Realtime |
| Backups | Manual pg_dump | Built-in backup system |
| Learning Curve | You know it | You already use it |

---

## Migration Phases

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MIGRATION TIMELINE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: Setup & Schema (Day 1-2)                                              │
│  ├── Create PocketBase collections                                              │
│  ├── Set up auth                                                                │
│  └── Deploy to Coolify                                                          │
│                                                                                  │
│  PHASE 2: Data Migration (Day 2-3)                                              │
│  ├── Export from Neon                                                           │
│  ├── Transform data                                                             │
│  └── Import to PocketBase                                                       │
│                                                                                  │
│  PHASE 3: Frontend Adaptation (Day 3-5)                                         │
│  ├── Replace API calls with PocketBase SDK                                      │
│  ├── Update auth flow                                                           │
│  └── Test all features                                                          │
│                                                                                  │
│  PHASE 4: New Features (Day 5+)                                                 │
│  ├── Multi-destination support                                                  │
│  ├── List mode                                                                  │
│  ├── Auto-fill (n8n webhook)                                                   │
│  └── AI research chat                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: PocketBase Setup

### 1.1 Collection Schema

PocketBase uses collections instead of tables. Here's the mapping:

#### Core Collections

```javascript
// Collection: users (built-in, extend with custom fields)
{
  "name": "users",
  "type": "auth",
  "schema": [
    { "name": "firstName", "type": "text" },
    { "name": "lastName", "type": "text" },
    { "name": "profileImageUrl", "type": "url" },
    { "name": "role", "type": "select", "options": { "values": ["client", "admin"] } }
  ]
}

// Collection: projects (replaces itineraries)
{
  "name": "projects",
  "type": "base",
  "schema": [
    { "name": "user", "type": "relation", "options": { "collectionId": "users", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "customUrlSlug", "type": "text", "required": true, "unique": true },
    { "name": "projectType", "type": "select", "options": { "values": ["itinerary", "list"] } },
    { "name": "status", "type": "select", "options": { "values": ["draft", "published"] } },
    { "name": "isTemplate", "type": "bool" },
    { "name": "templateName", "type": "text" },
    { "name": "templateDescription", "type": "text" },
    { "name": "assistantName", "type": "text", "required": true },
    { "name": "assistantEmail", "type": "email", "required": true },
    { "name": "outboundTravelVisible", "type": "bool", "default": true },
    { "name": "returnTravelVisible", "type": "bool", "default": true },
    { "name": "helpfulInfoVisible", "type": "bool", "default": true },
    { "name": "coverImage", "type": "file", "options": { "maxSelect": 1, "mimeTypes": ["image/*"] } }
  ],
  "indexes": ["CREATE UNIQUE INDEX idx_slug ON projects (customUrlSlug)"]
}

// Collection: destinations
{
  "name": "destinations",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "name", "type": "text", "required": true },
    { "name": "dates", "type": "text" },
    { "name": "location", "type": "text" },
    { "name": "weather", "type": "text" },
    { "name": "weatherUrl", "type": "url" },
    { "name": "displayOrder", "type": "number", "default": 0 }
  ]
}

// Collection: travellers
{
  "name": "travellers",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "name", "type": "text", "required": true },
    { "name": "type", "type": "select", "options": { "values": ["adult", "child"] }, "required": true },
    { "name": "ageAtTravel", "type": "number" },
    { "name": "displayOrder", "type": "number", "default": 0 }
  ]
}

// Collection: accommodations
{
  "name": "accommodations",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "destination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "address", "type": "text" },
    { "name": "googleMapsLink", "type": "url" },
    { "name": "checkInDetails", "type": "text" },
    { "name": "bookingReference", "type": "text" },
    { "name": "websiteUrl", "type": "url" },
    { "name": "contactInfo", "type": "text" },
    { "name": "images", "type": "file", "options": { "maxSelect": 10, "mimeTypes": ["image/*"] } },
    { "name": "notes", "type": "text" },
    { "name": "displayOrder", "type": "number", "default": 0 },
    { "name": "visible", "type": "bool", "default": true },
    { "name": "sourceUrl", "type": "url" },
    { "name": "sourceType", "type": "select", "options": { "values": ["manual", "autofill", "ai_suggested"] } }
  ]
}

// Collection: activities
{
  "name": "activities",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "destination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "description", "type": "text" },
    { "name": "price", "type": "text" },
    { "name": "contactDetails", "type": "text" },
    { "name": "address", "type": "text" },
    { "name": "googleMapsLink", "type": "url" },
    { "name": "websiteUrl", "type": "url" },
    { "name": "images", "type": "file", "options": { "maxSelect": 10, "mimeTypes": ["image/*"] } },
    { "name": "notes", "type": "text" },
    { "name": "displayOrder", "type": "number", "default": 0 },
    { "name": "visible", "type": "bool", "default": true },
    { "name": "sourceUrl", "type": "url" },
    { "name": "sourceType", "type": "select", "options": { "values": ["manual", "autofill", "ai_suggested"] } }
  ]
}

// Collection: dining
{
  "name": "dining",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "destination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "cuisineType", "type": "text" },
    { "name": "priceRange", "type": "text" },
    { "name": "contactDetails", "type": "text" },
    { "name": "address", "type": "text" },
    { "name": "googleMapsLink", "type": "url" },
    { "name": "websiteUrl", "type": "url" },
    { "name": "images", "type": "file", "options": { "maxSelect": 10, "mimeTypes": ["image/*"] } },
    { "name": "notes", "type": "text" },
    { "name": "displayOrder", "type": "number", "default": 0 },
    { "name": "visible", "type": "bool", "default": true },
    { "name": "sourceUrl", "type": "url" },
    { "name": "sourceType", "type": "select", "options": { "values": ["manual", "autofill", "ai_suggested"] } }
  ]
}

// Collection: bars
{
  "name": "bars",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "destination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "barType", "type": "text" },
    { "name": "priceRange", "type": "text" },
    { "name": "contactDetails", "type": "text" },
    { "name": "address", "type": "text" },
    { "name": "googleMapsLink", "type": "url" },
    { "name": "websiteUrl", "type": "url" },
    { "name": "images", "type": "file", "options": { "maxSelect": 10, "mimeTypes": ["image/*"] } },
    { "name": "notes", "type": "text" },
    { "name": "displayOrder", "type": "number", "default": 0 },
    { "name": "visible", "type": "bool", "default": true },
    { "name": "sourceUrl", "type": "url" },
    { "name": "sourceType", "type": "select", "options": { "values": ["manual", "autofill", "ai_suggested"] } }
  ]
}
```

#### Travel Collections

```javascript
// Collection: outbound_travel
{
  "name": "outbound_travel",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    // Transfer to Airport
    { "name": "transferToAirportType", "type": "select", "options": { "values": ["none", "taxi", "train"] } },
    { "name": "transferToAirportTaxis", "type": "json" },  // Array of taxi objects
    { "name": "transferToAirportTrains", "type": "json" }, // Array of train objects
    // Flight
    { "name": "flightNumber", "type": "text" },
    { "name": "flightDate", "type": "text" },
    { "name": "departureAirport", "type": "text" },
    { "name": "arrivalAirport", "type": "text" },
    { "name": "departureTime", "type": "text" },
    { "name": "arrivalTime", "type": "text" },
    { "name": "passengersSeats", "type": "text" },
    { "name": "thingsToRemember", "type": "text" },
    { "name": "isMultiLeg", "type": "bool", "default": false },
    { "name": "legs", "type": "json" },  // Array of flight leg objects
    // Transfer to Accommodation
    { "name": "transferToAccomType", "type": "select", "options": { "values": ["none", "taxi", "train"] } },
    { "name": "transferToAccomTaxis", "type": "json" },
    { "name": "transferToAccomTrains", "type": "json" }
  ]
}

// Collection: return_travel (similar structure to outbound_travel)
{
  "name": "return_travel",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    // Transfer to Airport
    { "name": "transferToAirportType", "type": "select", "options": { "values": ["none", "taxi", "train"] } },
    { "name": "transferToAirportTaxis", "type": "json" },
    { "name": "transferToAirportTrains", "type": "json" },
    // Flight
    { "name": "flightNumber", "type": "text" },
    { "name": "flightDate", "type": "text" },
    { "name": "departureAirport", "type": "text" },
    { "name": "arrivalAirport", "type": "text" },
    { "name": "departureTime", "type": "text" },
    { "name": "arrivalTime", "type": "text" },
    { "name": "passengersSeats", "type": "text" },
    { "name": "thingsToRemember", "type": "text" },
    { "name": "isMultiLeg", "type": "bool", "default": false },
    { "name": "legs", "type": "json" },
    // Transfer Home
    { "name": "transferHomeType", "type": "select", "options": { "values": ["none", "taxi", "train"] } },
    { "name": "transferHomeTaxis", "type": "json" },
    { "name": "transferHomeTrains", "type": "json" }
  ]
}

// Collection: inter_destination_travel (travel between destinations)
{
  "name": "inter_destination_travel",
  "type": "base",
  "schema": [
    { "name": "fromDestination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "toDestination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "travelType", "type": "select", "options": { "values": ["flight", "train", "car", "ferry", "bus"] }, "required": true },
    { "name": "travelDetails", "type": "json" },  // Type-specific fields stored as JSON
    { "name": "displayOrder", "type": "number", "default": 0 },
    { "name": "visible", "type": "bool", "default": true }
  ]
}

// Collection: helpful_information
{
  "name": "helpful_information",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "localEmergency", "type": "text" },
    { "name": "nearestEmbassy", "type": "text" },
    { "name": "travelInsurance", "type": "text" },
    { "name": "airlineCustomerService", "type": "text" },
    { "name": "localMedicalClinic", "type": "text" },
    { "name": "transportContacts", "type": "text" }
  ]
}
```

#### Custom Sections Collections

```javascript
// Collection: custom_sections (templates)
{
  "name": "custom_sections",
  "type": "base",
  "schema": [
    { "name": "user", "type": "relation", "options": { "collectionId": "users", "maxSelect": 1 } },
    { "name": "name", "type": "text", "required": true },
    { "name": "description", "type": "text" },
    { "name": "isGlobal", "type": "bool", "default": false },
    { "name": "fields", "type": "json" }  // Array of field definitions
  ]
}

// Collection: custom_section_items (instances in projects)
{
  "name": "custom_section_items",
  "type": "base",
  "schema": [
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "destination", "type": "relation", "options": { "collectionId": "destinations", "maxSelect": 1 } },
    { "name": "customSection", "type": "relation", "options": { "collectionId": "custom_sections", "maxSelect": 1 }, "required": true },
    { "name": "sectionTitle", "type": "text" },
    { "name": "fieldValues", "type": "json" },  // Key-value pairs of field data
    { "name": "displayOrder", "type": "number", "default": 0 }
  ]
}
```

#### AI Chat Collections

```javascript
// Collection: ai_conversations
{
  "name": "ai_conversations",
  "type": "base",
  "schema": [
    { "name": "user", "type": "relation", "options": { "collectionId": "users", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1 } },
    { "name": "title", "type": "text" }
  ]
}

// Collection: ai_messages
{
  "name": "ai_messages",
  "type": "base",
  "schema": [
    { "name": "conversation", "type": "relation", "options": { "collectionId": "ai_conversations", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "role", "type": "select", "options": { "values": ["user", "assistant"] }, "required": true },
    { "name": "content", "type": "text", "required": true },
    { "name": "metadata", "type": "json" }  // Sources, suggested items, etc.
  ]
}

// Collection: ai_suggested_items
{
  "name": "ai_suggested_items",
  "type": "base",
  "schema": [
    { "name": "message", "type": "relation", "options": { "collectionId": "ai_messages", "maxSelect": 1, "cascadeDelete": true }, "required": true },
    { "name": "project", "type": "relation", "options": { "collectionId": "projects", "maxSelect": 1 } },
    { "name": "itemType", "type": "select", "options": { "values": ["accommodation", "activity", "dining", "bar"] }, "required": true },
    { "name": "itemData", "type": "json", "required": true },
    { "name": "sourceUrl", "type": "url" },
    { "name": "status", "type": "select", "options": { "values": ["pending", "added", "dismissed"] } }
  ]
}
```

### 1.2 PocketBase API Rules

Set up proper access rules for each collection:

```javascript
// Example rules for projects collection
{
  "listRule": "@request.auth.id != '' && user = @request.auth.id",
  "viewRule": "@request.auth.id != '' && user = @request.auth.id || status = 'published'",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != '' && user = @request.auth.id",
  "deleteRule": "@request.auth.id != '' && user = @request.auth.id"
}

// Public view for published itineraries (via customUrlSlug)
// This needs a custom endpoint or hook - see section 1.3
```

### 1.3 PocketBase Hooks

Create custom endpoints for special functionality:

```javascript
// pb_hooks/routes.pb.js

/// <reference path="../pb_data/types.d.ts" />

// Public itinerary view by slug
routerAdd("GET", "/api/public/itinerary/:slug", (c) => {
  const slug = c.pathParam("slug");
  
  const project = $app.dao().findFirstRecordByFilter(
    "projects",
    "customUrlSlug = {:slug} && status = 'published'",
    { slug: slug }
  );
  
  if (!project) {
    return c.json(404, { error: "Itinerary not found" });
  }
  
  // Fetch all related data
  const destinations = $app.dao().findRecordsByFilter(
    "destinations",
    "project = {:projectId}",
    "-displayOrder",
    0, 0,
    { projectId: project.id }
  );
  
  // ... fetch other related collections
  
  return c.json(200, {
    project: project,
    destinations: destinations,
    // ... other data
  });
}, $apis.activityLogger($app));

// Auto-fill proxy to n8n
routerAdd("POST", "/api/autofill/extract", (c) => {
  const data = $apis.requestInfo(c).data;
  
  if (!data.url) {
    return c.json(400, { success: false, error: "URL is required" });
  }

  try {
    const response = $http.send({
      url: $os.getenv("N8N_AUTOFILL_WEBHOOK_URL"),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.url,
        itemType: data.itemType || "accommodation"
      }),
      timeout: 30
    });

    if (response.statusCode !== 200) {
      return c.json(500, { success: false, error: "Extraction service unavailable" });
    }

    return c.json(200, response.json);
  } catch (e) {
    console.log("Autofill error:", e);
    return c.json(500, { success: false, error: "Failed to extract data" });
  }
}, $apis.requireRecordAuth());

// AI chat endpoint (proxy to your AI service)
routerAdd("POST", "/api/ai/chat", (c) => {
  const authRecord = c.get("authRecord");
  const data = $apis.requestInfo(c).data;
  
  // ... implement AI chat logic
  
}, $apis.requireRecordAuth());

// Duplicate project
routerAdd("POST", "/api/projects/:id/duplicate", (c) => {
  const authRecord = c.get("authRecord");
  const projectId = c.pathParam("id");
  
  const project = $app.dao().findRecordById("projects", projectId);
  
  if (!project || project.get("user") !== authRecord.id) {
    return c.json(404, { error: "Project not found" });
  }
  
  // Create duplicate with new slug
  const collection = $app.dao().findCollectionByNameOrId("projects");
  const newProject = new Record(collection);
  
  // Copy fields
  newProject.set("user", authRecord.id);
  newProject.set("name", project.get("name") + " (Copy)");
  newProject.set("customUrlSlug", project.get("customUrlSlug") + "-" + $security.randomString(4));
  newProject.set("status", "draft");
  // ... copy other fields
  
  $app.dao().saveRecord(newProject);
  
  // Duplicate related records (destinations, items, etc.)
  // ... 
  
  return c.json(200, { id: newProject.id });
  
}, $apis.requireRecordAuth());
```

### 1.4 Coolify Deployment

#### Docker Compose for Coolify

```yaml
# docker-compose.yml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    container_name: blckbx-pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
      - ./pb_public:/pb_public
      - ./pb_hooks:/pb_hooks
      - ./pb_migrations:/pb_migrations
    environment:
      - N8N_AUTOFILL_WEBHOOK_URL=${N8N_AUTOFILL_WEBHOOK_URL}
    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: blckbx-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_POCKETBASE_URL=http://pocketbase:8090
    depends_on:
      - pocketbase
```

#### Frontend Dockerfile

```dockerfile
# client/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Config

```nginx
# client/nginx.conf
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to PocketBase
    location /api/ {
        proxy_pass http://pocketbase:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy PocketBase files
    location /api/files/ {
        proxy_pass http://pocketbase:8090/api/files/;
    }
}
```

---

## Phase 2: Data Migration

### 2.1 Export from Neon

```bash
# Export all tables to JSON for easier transformation
# Run this script against your Neon database

#!/bin/bash

DATABASE_URL="your-neon-connection-string"

# Export each table to JSON
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM users) t) TO STDOUT" > users.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM itineraries) t) TO STDOUT" > itineraries.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM travel_details) t) TO STDOUT" > travel_details.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM travellers) t) TO STDOUT" > travellers.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM outbound_travel) t) TO STDOUT" > outbound_travel.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM return_travel) t) TO STDOUT" > return_travel.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM accommodations) t) TO STDOUT" > accommodations.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM activities) t) TO STDOUT" > activities.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM dining) t) TO STDOUT" > dining.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM bars) t) TO STDOUT" > bars.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM additional_travel) t) TO STDOUT" > additional_travel.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM helpful_information) t) TO STDOUT" > helpful_information.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM custom_sections) t) TO STDOUT" > custom_sections.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM custom_fields) t) TO STDOUT" > custom_fields.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM custom_section_items) t) TO STDOUT" > custom_section_items.json
psql $DATABASE_URL -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM custom_field_values) t) TO STDOUT" > custom_field_values.json
```

### 2.2 Transformation Script

```javascript
// migrate.js - Run with Node.js
// npm install pocketbase

const PocketBase = require('pocketbase/cjs');
const fs = require('fs');

const pb = new PocketBase('http://localhost:8090');

// Authenticate as admin
await pb.admins.authWithPassword('admin@example.com', 'your-admin-password');

// ID mapping for relations
const idMap = {
  users: {},
  projects: {},
  destinations: {}
};

// 1. Migrate users
async function migrateUsers() {
  const users = fs.readFileSync('users.json', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  for (const user of users) {
    try {
      // Create auth user
      const newUser = await pb.collection('users').create({
        email: user.email,
        password: 'tempPassword123!', // Users will need to reset
        passwordConfirm: 'tempPassword123!',
        firstName: user.first_name,
        lastName: user.last_name,
        profileImageUrl: user.profile_image_url,
        role: user.role
      });
      
      idMap.users[user.id] = newUser.id;
      console.log(`Migrated user: ${user.email}`);
    } catch (e) {
      console.error(`Failed to migrate user ${user.email}:`, e);
    }
  }
}

// 2. Migrate itineraries → projects (with default destination)
async function migrateProjects() {
  const itineraries = fs.readFileSync('itineraries.json', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const travelDetails = fs.readFileSync('travel_details.json', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  for (const itinerary of itineraries) {
    try {
      // Find travel details for this itinerary
      const details = travelDetails.find(td => td.itinerary_id === itinerary.id);
      
      // Create project
      const project = await pb.collection('projects').create({
        user: idMap.users[itinerary.user_id] || null,
        name: itinerary.title,
        customUrlSlug: itinerary.custom_url_slug,
        projectType: 'itinerary',
        status: itinerary.status,
        isTemplate: itinerary.is_template === 1,
        templateName: itinerary.template_name,
        templateDescription: itinerary.template_description,
        assistantName: itinerary.assistant_name,
        assistantEmail: itinerary.assistant_email,
        outboundTravelVisible: itinerary.outbound_travel_visible === 1,
        returnTravelVisible: itinerary.return_travel_visible === 1,
        helpfulInfoVisible: itinerary.helpful_info_visible === 1
      });
      
      idMap.projects[itinerary.id] = project.id;
      
      // Create default destination for this project
      const destination = await pb.collection('destinations').create({
        project: project.id,
        name: details?.location || itinerary.title,
        dates: details?.dates,
        location: details?.location,
        weather: details?.weather,
        weatherUrl: details?.weather_url,
        displayOrder: 0
      });
      
      idMap.destinations[itinerary.id] = destination.id;  // Map old itinerary ID to new destination ID
      
      console.log(`Migrated project: ${itinerary.title}`);
    } catch (e) {
      console.error(`Failed to migrate project ${itinerary.title}:`, e);
    }
  }
}

// 3. Migrate items (accommodations, activities, dining, bars)
async function migrateItems(collectionName, fileName, transform = (item) => item) {
  const items = fs.readFileSync(fileName, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  for (const item of items) {
    try {
      const projectId = idMap.projects[item.itinerary_id];
      const destinationId = idMap.destinations[item.itinerary_id];
      
      if (!projectId) {
        console.warn(`Skipping ${collectionName} item - no project found for itinerary ${item.itinerary_id}`);
        continue;
      }
      
      const transformed = transform(item);
      
      await pb.collection(collectionName).create({
        project: projectId,
        destination: destinationId,
        ...transformed,
        visible: item.visible === 1,
        displayOrder: item.display_order || 0,
        sourceType: 'manual'
      });
      
    } catch (e) {
      console.error(`Failed to migrate ${collectionName} item:`, e);
    }
  }
  
  console.log(`Migrated ${items.length} ${collectionName} items`);
}

// 4. Migrate travel data
async function migrateOutboundTravel() {
  const items = fs.readFileSync('outbound_travel.json', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  for (const item of items) {
    try {
      const projectId = idMap.projects[item.itinerary_id];
      if (!projectId) continue;
      
      await pb.collection('outbound_travel').create({
        project: projectId,
        transferToAirportType: item.transfer_to_airport_type || 'none',
        transferToAirportTaxis: item.transfer_to_airport_taxis || [],
        transferToAirportTrains: item.transfer_to_airport_trains || [],
        flightNumber: item.flight_number,
        flightDate: item.flight_date,
        departureAirport: item.departure_airport,
        arrivalAirport: item.arrival_airport,
        departureTime: item.departure_time,
        arrivalTime: item.arrival_time,
        passengersSeats: item.passengers_seats,
        thingsToRemember: item.things_to_remember,
        isMultiLeg: item.is_multi_leg === 1,
        legs: item.legs || [],
        transferToAccomType: item.transfer_to_accom_type || 'none',
        transferToAccomTaxis: item.transfer_to_accom_taxis || [],
        transferToAccomTrains: item.transfer_to_accom_trains || []
      });
    } catch (e) {
      console.error('Failed to migrate outbound travel:', e);
    }
  }
}

// Run migration
async function migrate() {
  console.log('Starting migration...');
  
  await migrateUsers();
  await migrateProjects();
  
  await migrateItems('accommodations', 'accommodations.json', (item) => ({
    name: item.name,
    address: item.address,
    googleMapsLink: item.google_maps_link,
    checkInDetails: item.check_in_details,
    bookingReference: item.booking_reference,
    websiteUrl: item.website_url,
    contactInfo: item.contact_info,
    notes: item.notes
    // Note: images need special handling - download and re-upload
  }));
  
  await migrateItems('activities', 'activities.json', (item) => ({
    name: item.name,
    description: item.description,
    price: item.price,
    contactDetails: item.contact_details,
    address: item.address,
    googleMapsLink: item.google_maps_link,
    websiteUrl: item.website_url,
    notes: item.notes
  }));
  
  await migrateItems('dining', 'dining.json', (item) => ({
    name: item.name,
    cuisineType: item.cuisine_type,
    priceRange: item.price_range,
    contactDetails: item.contact_details,
    address: item.address,
    googleMapsLink: item.google_maps_link,
    websiteUrl: item.website_url,
    notes: item.notes
  }));
  
  await migrateItems('bars', 'bars.json', (item) => ({
    name: item.name,
    barType: item.bar_type,
    priceRange: item.price_range,
    contactDetails: item.contact_details,
    address: item.address,
    googleMapsLink: item.google_maps_link,
    websiteUrl: item.website_url,
    notes: item.notes
  }));
  
  await migrateOutboundTravel();
  // ... migrate return_travel, helpful_information, etc.
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## Phase 3: Frontend Adaptation

### 3.1 PocketBase Client Setup

```typescript
// client/src/lib/pocketbase.ts

import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

// Auto-refresh auth
pb.authStore.onChange(() => {
  console.log('Auth state changed:', pb.authStore.isValid);
});

// Type definitions
export interface Project {
  id: string;
  user: string;
  name: string;
  customUrlSlug: string;
  projectType: 'itinerary' | 'list';
  status: 'draft' | 'published';
  isTemplate: boolean;
  templateName?: string;
  templateDescription?: string;
  assistantName: string;
  assistantEmail: string;
  outboundTravelVisible: boolean;
  returnTravelVisible: boolean;
  helpfulInfoVisible: boolean;
  coverImage?: string;
  created: string;
  updated: string;
}

export interface Destination {
  id: string;
  project: string;
  name: string;
  dates?: string;
  location?: string;
  weather?: string;
  weatherUrl?: string;
  displayOrder: number;
}

// ... other type definitions
```

### 3.2 Replace API Calls

#### Before (Express/React Query):

```typescript
// Old approach
const { data: itineraries } = useQuery<Itinerary[]>({
  queryKey: ["/api/itineraries"],
});

const createMutation = useMutation({
  mutationFn: async (data) => {
    return await apiRequest("POST", "/api/itineraries", data);
  }
});
```

#### After (PocketBase/React Query):

```typescript
// New approach
import { pb, Project } from '@/lib/pocketbase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch all projects for current user
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return await pb.collection('projects').getFullList<Project>({
        sort: '-created',
        filter: `user = "${pb.authStore.model?.id}"`
      });
    },
    enabled: pb.authStore.isValid
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await pb.collection('projects').create<Project>({
        ...data,
        user: pb.authStore.model?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}

// Fetch full project with all related data
export function useFullProject(idOrSlug: string) {
  return useQuery({
    queryKey: ['project', idOrSlug],
    queryFn: async () => {
      // Try by ID first, then by slug
      let project: Project;
      try {
        project = await pb.collection('projects').getOne<Project>(idOrSlug);
      } catch {
        const results = await pb.collection('projects').getList<Project>(1, 1, {
          filter: `customUrlSlug = "${idOrSlug}"`
        });
        if (results.items.length === 0) throw new Error('Project not found');
        project = results.items[0];
      }
      
      // Fetch related data in parallel
      const [destinations, travellers, outboundTravel, returnTravel, helpfulInfo] = await Promise.all([
        pb.collection('destinations').getFullList({ filter: `project = "${project.id}"`, sort: 'displayOrder' }),
        pb.collection('travellers').getFullList({ filter: `project = "${project.id}"`, sort: 'displayOrder' }),
        pb.collection('outbound_travel').getFirstListItem(`project = "${project.id}"`).catch(() => null),
        pb.collection('return_travel').getFirstListItem(`project = "${project.id}"`).catch(() => null),
        pb.collection('helpful_information').getFirstListItem(`project = "${project.id}"`).catch(() => null),
      ]);
      
      // Fetch items for each destination
      const itemsByDestination: Record<string, any> = {};
      for (const dest of destinations) {
        const [accommodations, activities, dining, bars] = await Promise.all([
          pb.collection('accommodations').getFullList({ filter: `destination = "${dest.id}"`, sort: 'displayOrder' }),
          pb.collection('activities').getFullList({ filter: `destination = "${dest.id}"`, sort: 'displayOrder' }),
          pb.collection('dining').getFullList({ filter: `destination = "${dest.id}"`, sort: 'displayOrder' }),
          pb.collection('bars').getFullList({ filter: `destination = "${dest.id}"`, sort: 'displayOrder' }),
        ]);
        itemsByDestination[dest.id] = { accommodations, activities, dining, bars };
      }
      
      return {
        project,
        destinations,
        travellers,
        outboundTravel,
        returnTravel,
        helpfulInformation: helpfulInfo,
        itemsByDestination
      };
    }
  });
}
```

### 3.3 Auth Hooks

```typescript
// client/src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { useNavigate } from 'wouter';

export function useAuth() {
  const [user, setUser] = useState(pb.authStore.model);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if auth is valid on mount
    setIsLoading(false);
    setUser(pb.authStore.model);
    
    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });
    
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData;
  };

  const register = async (email: string, password: string, name: string) => {
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.join(' ');
    
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      firstName,
      lastName,
      role: 'client'
    });
    
    // Auto-login after registration
    await login(email, password);
    return user;
  };

  const logout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const loginWithGoogle = async () => {
    const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
    return authData;
  };

  return {
    user,
    isLoading,
    isAuthenticated: pb.authStore.isValid,
    login,
    register,
    logout,
    loginWithGoogle
  };
}
```

### 3.4 Updated Components

```tsx
// client/src/components/ProtectedRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
```

---

## Phase 4: New Features Integration

After the core migration is complete, add the new features:

### 4.1 Multi-Destination UI

Update the wizard to support multiple destinations:
- Add "Add Destination" button
- Show destination tabs/selector
- Items are created under selected destination

### 4.2 List Mode

Add project type toggle:
- "List" mode hides travel sections
- Items don't require destination assignment
- Add "Convert to Itinerary" action

### 4.3 Auto-Fill Integration

See the separate auto-fill documentation for n8n webhook setup.

### 4.4 AI Chat Sidebar

- Add collapsible chat panel
- Integrate with AI endpoint
- Handle suggested items (add to project with one click)

---

## Environment Variables

```env
# PocketBase
VITE_POCKETBASE_URL=https://your-pocketbase-instance.com

# n8n Webhook
N8N_AUTOFILL_WEBHOOK_URL=https://your-n8n.com/webhook/autofill-extract

# AI Service (if using external)
AI_SERVICE_URL=https://your-ai-service.com
AI_API_KEY=your-api-key

# OAuth (configure in PocketBase admin)
# Google, etc. - set up in PocketBase Settings > Auth providers
```

---

## Testing Checklist

### Migration Verification
- [ ] All users migrated with correct roles
- [ ] All projects migrated with correct slugs
- [ ] All destinations created
- [ ] All items linked to correct destinations
- [ ] Travel data (outbound, return) migrated
- [ ] Helpful information migrated
- [ ] Custom sections migrated
- [ ] Images accessible

### Feature Testing
- [ ] User registration/login
- [ ] OAuth login (Google)
- [ ] Create project (itinerary type)
- [ ] Create project (list type)
- [ ] Add destination
- [ ] Add items (accommodation, activity, dining, bar)
- [ ] Edit items
- [ ] Reorder items (drag & drop)
- [ ] Delete items
- [ ] Travel sections (outbound, return)
- [ ] Public view by slug
- [ ] PDF generation
- [ ] Auto-fill from URL
- [ ] Duplicate project
- [ ] Convert list → itinerary

---

## Rollback Plan

If issues arise:

1. **Keep Neon database running** during migration (don't delete until verified)
2. **Keep Replit deployment** accessible as fallback
3. **Export PocketBase data** before any major changes:
   ```bash
   ./pocketbase backup
   ```
4. **DNS switch** - can point back to Replit if needed

---

## Post-Migration Tasks

1. **Notify users** to reset passwords (if needed)
2. **Update DNS** to point to Coolify
3. **Set up monitoring** (Coolify has built-in)
4. **Configure backups** (PocketBase + Coolify backup)
5. **Decommission Replit** after verification period (1-2 weeks)
