# BLCK BX - New Database Schema Design

## Overview

This schema extends the current system to support:
1. **Multi-destination itineraries** - Multiple locations in one trip
2. **List mode** - Research/collect items without scheduling
3. **Auto-fill metadata** - Track where data came from
4. **AI chat history** - Persist research conversations

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS & AUTH                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  users                          sessions                                         │
│  ├── id (PK)                    ├── sid (PK)                                    │
│  ├── email                      ├── sess (jsonb)                                │
│  ├── firstName                  └── expire                                      │
│  ├── lastName                                                                    │
│  ├── profileImageUrl                                                            │
│  ├── role                                                                        │
│  └── timestamps                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PROJECTS (NEW TOP LEVEL)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  projects                                                                        │
│  ├── id (PK)                                                                    │
│  ├── userId (FK → users)                                                        │
│  ├── name                        "Portugal Adventure 2025"                      │
│  ├── projectType                 "itinerary" | "list"                           │
│  ├── status                      "draft" | "published"                          │
│  ├── isTemplate                  0 | 1                                          │
│  ├── templateName                                                               │
│  ├── templateDescription                                                        │
│  ├── assistantName                                                              │
│  ├── assistantEmail                                                             │
│  ├── coverImage                                                                 │
│  └── timestamps                                                                  │
│                                                                                  │
│  * Projects replace "itineraries" as the top-level container                    │
│  * A project is either an ITINERARY (scheduled trip) or a LIST (research)       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ITINERARY-SPECIFIC TABLES                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  destinations (NEW)              travel_details (per destination)               │
│  ├── id (PK)                     ├── id (PK)                                    │
│  ├── projectId (FK)              ├── destinationId (FK) ←── changed from        │
│  ├── name "Lisbon"               │                           itineraryId        │
│  ├── dates "Oct 5-8, 2025"       ├── dates                                      │
│  ├── location "Portugal"         ├── weather                                    │
│  ├── displayOrder                ├── weatherUrl                                 │
│  └── timestamps                  └── location                                   │
│                                                                                  │
│  travellers (unchanged - links to project)                                      │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK)              ←── changed from itineraryId                   │
│  ├── name                                                                        │
│  ├── type "adult" | "child"                                                     │
│  ├── ageAtTravel                                                                │
│  └── displayOrder                                                               │
│                                                                                  │
│  outbound_travel (links to project - travel TO first destination)               │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK)              ←── changed from itineraryId                   │
│  ├── ... (all existing flight/transfer fields)                                  │
│  └── ...                                                                        │
│                                                                                  │
│  return_travel (links to project - travel FROM last destination)                │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK)              ←── changed from itineraryId                   │
│  ├── ... (all existing flight/transfer fields)                                  │
│  └── ...                                                                        │
│                                                                                  │
│  inter_destination_travel (NEW - travel BETWEEN destinations)                   │
│  ├── id (PK)                                                                    │
│  ├── fromDestinationId (FK)                                                     │
│  ├── toDestinationId (FK)                                                       │
│  ├── travelType "flight" | "train" | "car" | "ferry" | "bus"                   │
│  ├── ... (type-specific fields like additionalTravel)                           │
│  └── displayOrder                                                               │
│                                                                                  │
│  helpful_information (links to project)                                         │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK)              ←── changed from itineraryId                   │
│  └── ... (all existing fields)                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ITEM TABLES (SHARED)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Items can belong to either:                                                    │
│  - A DESTINATION (for itineraries) → has dates, scheduling context              │
│  - A PROJECT directly (for lists) → no dates, just collection                   │
│                                                                                  │
│  accommodations                                                                  │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK)              ←── always set                                 │
│  ├── destinationId (FK, nullable) ←── NEW: null for lists, set for itineraries │
│  ├── name                                                                        │
│  ├── address                                                                     │
│  ├── googleMapsLink                                                             │
│  ├── checkInDetails                                                             │
│  ├── bookingReference                                                           │
│  ├── websiteUrl                                                                 │
│  ├── contactInfo                                                                │
│  ├── images (text[])                                                            │
│  ├── notes                                                                       │
│  ├── displayOrder                                                               │
│  ├── visible (0|1)                                                              │
│  ├── sourceUrl (NEW)             ←── URL this was auto-filled from              │
│  ├── sourceType (NEW)            ←── "manual" | "autofill" | "ai_suggested"     │
│  └── timestamps                                                                  │
│                                                                                  │
│  activities                       (same pattern as accommodations)              │
│  ├── id, projectId, destinationId (nullable)                                    │
│  ├── name, description, price, contactDetails                                   │
│  ├── address, googleMapsLink, websiteUrl                                        │
│  ├── images, notes, displayOrder, visible                                       │
│  ├── sourceUrl, sourceType                                                      │
│  └── timestamps                                                                  │
│                                                                                  │
│  dining                           (same pattern)                                │
│  ├── id, projectId, destinationId (nullable)                                    │
│  ├── name, cuisineType, priceRange, contactDetails                              │
│  ├── address, googleMapsLink, websiteUrl                                        │
│  ├── images, notes, displayOrder, visible                                       │
│  ├── sourceUrl, sourceType                                                      │
│  └── timestamps                                                                  │
│                                                                                  │
│  bars                             (same pattern)                                │
│  ├── id, projectId, destinationId (nullable)                                    │
│  ├── name, barType, priceRange, contactDetails                                  │
│  ├── address, googleMapsLink, websiteUrl                                        │
│  ├── images, notes, displayOrder, visible                                       │
│  ├── sourceUrl, sourceType                                                      │
│  └── timestamps                                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI CHAT (NEW)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ai_conversations                                                                │
│  ├── id (PK)                                                                    │
│  ├── projectId (FK, nullable)    ←── null for general research                  │
│  ├── userId (FK)                                                                │
│  ├── title                       ←── auto-generated or user-set                 │
│  └── timestamps                                                                  │
│                                                                                  │
│  ai_messages                                                                     │
│  ├── id (PK)                                                                    │
│  ├── conversationId (FK)                                                        │
│  ├── role "user" | "assistant"                                                  │
│  ├── content (text)                                                             │
│  ├── metadata (jsonb)            ←── sources, suggested items, etc.             │
│  └── createdAt                                                                  │
│                                                                                  │
│  ai_suggested_items (NEW - items suggested by AI, pending user approval)        │
│  ├── id (PK)                                                                    │
│  ├── messageId (FK)              ←── which AI message suggested this            │
│  ├── projectId (FK, nullable)                                                   │
│  ├── itemType "accommodation" | "activity" | "dining" | "bar"                  │
│  ├── itemData (jsonb)            ←── all the extracted fields                   │
│  ├── sourceUrl                                                                  │
│  ├── status "pending" | "added" | "dismissed"                                   │
│  └── timestamps                                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOM SECTIONS (UNCHANGED)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  custom_sections                  custom_fields                                 │
│  ├── id (PK)                      ├── id (PK)                                   │
│  ├── userId (FK)                  ├── customSectionId (FK)                      │
│  ├── name                         ├── fieldName                                 │
│  ├── description                  ├── fieldType                                 │
│  ├── isGlobal                     ├── fieldLabel                                │
│  └── createdAt                    ├── isRequired                                │
│                                   └── displayOrder                              │
│                                                                                  │
│  custom_section_items             custom_field_values                           │
│  ├── id (PK)                      ├── id (PK)                                   │
│  ├── projectId (FK) ←── changed   ├── customSectionItemId (FK)                  │
│  ├── destinationId (FK, nullable) ├── customFieldId (FK)                        │
│  ├── customSectionId (FK)         └── value                                     │
│  ├── sectionTitle                                                               │
│  ├── displayOrder                                                               │
│  └── createdAt                                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Table Definitions

### NEW: projects

Replaces `itineraries` as the top-level container.

```sql
CREATE TABLE projects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  
  -- Basic info
  name VARCHAR NOT NULL,
  custom_url_slug VARCHAR UNIQUE NOT NULL,
  
  -- Type & status
  project_type VARCHAR NOT NULL DEFAULT 'itinerary',  -- 'itinerary' | 'list'
  status VARCHAR NOT NULL DEFAULT 'draft',            -- 'draft' | 'published'
  
  -- Template support (carried over)
  is_template INTEGER NOT NULL DEFAULT 0,
  template_name VARCHAR,
  template_description TEXT,
  
  -- Assistant info (carried over)
  assistant_name VARCHAR NOT NULL,
  assistant_email VARCHAR NOT NULL,
  
  -- Visibility flags (for itinerary mode)
  outbound_travel_visible INTEGER NOT NULL DEFAULT 1,
  return_travel_visible INTEGER NOT NULL DEFAULT 1,
  helpful_info_visible INTEGER NOT NULL DEFAULT 1,
  
  -- Optional cover image
  cover_image TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_projects_slug ON projects(custom_url_slug);
CREATE INDEX idx_projects_user ON projects(user_id);
```

### NEW: destinations

For multi-destination itineraries.

```sql
CREATE TABLE destinations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Destination info
  name VARCHAR NOT NULL,              -- "Lisbon", "Algarve"
  dates VARCHAR,                      -- "Oct 5-8, 2025"
  location VARCHAR,                   -- "Portugal" (country/region)
  
  -- Optional weather (could also live in travel_details)
  weather TEXT,
  weather_url TEXT,
  
  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_destinations_project ON destinations(project_id);
```

### NEW: inter_destination_travel

Travel between destinations (replaces some use of additional_travel).

```sql
CREATE TABLE inter_destination_travel (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to destinations
  from_destination_id VARCHAR REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  to_destination_id VARCHAR REFERENCES destinations(id) ON DELETE CASCADE NOT NULL,
  
  -- Travel type
  travel_type VARCHAR NOT NULL,  -- 'flight' | 'train' | 'car' | 'ferry' | 'bus'
  
  -- Car fields
  vehicle_details VARCHAR,
  vehicle_registration VARCHAR,
  car_contact_details VARCHAR,
  car_booking_details TEXT,
  
  -- Flight fields
  flight_number VARCHAR,
  flight_date VARCHAR,
  flight_departure_airport VARCHAR,
  flight_arrival_airport VARCHAR,
  flight_departure_time VARCHAR,
  flight_arrival_time VARCHAR,
  flight_passengers_seats TEXT,
  flight_things_to_remember TEXT,
  flight_is_multi_leg INTEGER DEFAULT 0,
  flight_legs JSONB DEFAULT '[]',
  
  -- Ferry fields
  ferry_departing_from VARCHAR,
  ferry_destination VARCHAR,
  ferry_date VARCHAR,
  ferry_price VARCHAR,
  ferry_contact_details VARCHAR,
  ferry_additional_notes TEXT,
  ferry_booking_reference VARCHAR,
  
  -- Train fields
  train_departing_from VARCHAR,
  train_destination VARCHAR,
  train_date VARCHAR,
  train_price VARCHAR,
  train_contact_details VARCHAR,
  train_additional_notes TEXT,
  train_booking_reference VARCHAR,
  
  -- Bus fields (NEW)
  bus_departing_from VARCHAR,
  bus_destination VARCHAR,
  bus_date VARCHAR,
  bus_price VARCHAR,
  bus_contact_details VARCHAR,
  bus_additional_notes TEXT,
  bus_booking_reference VARCHAR,
  
  -- Ordering & visibility
  display_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### NEW: ai_conversations & ai_messages

For the research chat sidebar.

```sql
CREATE TABLE ai_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,  -- nullable
  
  title VARCHAR,  -- auto-generated or user-set
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE ai_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  
  role VARCHAR NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  
  -- Metadata: sources used, items suggested, etc.
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
```

### NEW: ai_suggested_items

Items suggested by AI, pending user action.

```sql
CREATE TABLE ai_suggested_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR REFERENCES ai_messages(id) ON DELETE CASCADE NOT NULL,
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  
  item_type VARCHAR NOT NULL,  -- 'accommodation' | 'activity' | 'dining' | 'bar'
  item_data JSONB NOT NULL,    -- all the fields for that item type
  source_url TEXT,
  
  status VARCHAR NOT NULL DEFAULT 'pending',  -- 'pending' | 'added' | 'dismissed'
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### MODIFIED: accommodations (and other item tables)

Adding destination support and source tracking.

```sql
-- Example for accommodations (same changes apply to activities, dining, bars)

ALTER TABLE accommodations
  -- Rename itinerary_id to project_id
  RENAME COLUMN itinerary_id TO project_id;

ALTER TABLE accommodations
  -- Add destination reference (nullable for lists)
  ADD COLUMN destination_id VARCHAR REFERENCES destinations(id) ON DELETE SET NULL,
  
  -- Add source tracking for auto-fill
  ADD COLUMN source_url TEXT,
  ADD COLUMN source_type VARCHAR DEFAULT 'manual';  -- 'manual' | 'autofill' | 'ai_suggested'

CREATE INDEX idx_accommodations_destination ON accommodations(destination_id);
```

---

## Migration Strategy

### Phase 1: Create new tables

```sql
-- Run these first (no data changes yet)
CREATE TABLE projects (...);
CREATE TABLE destinations (...);
CREATE TABLE inter_destination_travel (...);
CREATE TABLE ai_conversations (...);
CREATE TABLE ai_messages (...);
CREATE TABLE ai_suggested_items (...);
```

### Phase 2: Migrate existing data

```sql
-- 1. Create projects from existing itineraries
INSERT INTO projects (
  id, user_id, name, custom_url_slug, project_type, status,
  is_template, template_name, template_description,
  assistant_name, assistant_email,
  outbound_travel_visible, return_travel_visible, helpful_info_visible,
  created_at, updated_at
)
SELECT 
  id, user_id, title, custom_url_slug, 'itinerary', status,
  is_template, template_name, template_description,
  assistant_name, assistant_email,
  outbound_travel_visible, return_travel_visible, helpful_info_visible,
  created_at, updated_at
FROM itineraries;

-- 2. Create default destination for each existing itinerary
INSERT INTO destinations (id, project_id, name, dates, location, display_order)
SELECT 
  gen_random_uuid(),
  i.id,
  COALESCE(td.location, i.title),  -- Use location or title as destination name
  td.dates,
  td.location,
  0
FROM itineraries i
LEFT JOIN travel_details td ON td.itinerary_id = i.id;

-- 3. Update item tables to reference new destination
-- (This requires knowing which destination ID was created for each itinerary)
-- Would be done programmatically in the migration script
```

### Phase 3: Update foreign keys

```sql
-- Rename columns and add new ones
ALTER TABLE accommodations RENAME COLUMN itinerary_id TO project_id;
ALTER TABLE accommodations ADD COLUMN destination_id VARCHAR REFERENCES destinations(id);
-- ... repeat for activities, dining, bars, etc.

-- Update destination_id based on project_id
-- (Script maps project → its single destination for existing data)
```

### Phase 4: Clean up

```sql
-- Once verified, drop old itineraries table
-- (Keep backup first!)
DROP TABLE itineraries;

-- Remove travel_details.itinerary_id, now uses destination_id
-- ... etc
```

---

## API Changes Summary

### New Endpoints

```
# Projects (replaces /api/itineraries)
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/duplicate
POST   /api/projects/:id/convert    # Convert list ↔ itinerary

# Destinations
GET    /api/projects/:id/destinations
POST   /api/projects/:id/destinations
PATCH  /api/destinations/:id
DELETE /api/destinations/:id
POST   /api/destinations/reorder

# Inter-destination travel
GET    /api/projects/:id/inter-travel
POST   /api/projects/:id/inter-travel
PATCH  /api/inter-travel/:id
DELETE /api/inter-travel/:id

# Auto-fill
POST   /api/autofill/extract        # { url: "..." } → extracted data

# AI Chat
GET    /api/ai/conversations
POST   /api/ai/conversations
GET    /api/ai/conversations/:id/messages
POST   /api/ai/conversations/:id/messages
POST   /api/ai/suggested-items/:id/add      # Add to project
POST   /api/ai/suggested-items/:id/dismiss  # Dismiss suggestion
```

### Modified Endpoints

```
# Items now support optional destinationId
POST   /api/projects/:id/accommodations     # { destinationId?: "...", ...data }
PATCH  /api/accommodations/:id              # Can update destinationId

# Full project fetch includes destinations
GET    /api/projects/:id                    # Returns { project, destinations, items... }
```

---

## Type Definitions (TypeScript)

```typescript
// New types
export interface Project {
  id: string;
  userId: string | null;
  name: string;
  customUrlSlug: string;
  projectType: 'itinerary' | 'list';
  status: 'draft' | 'published';
  isTemplate: number;
  templateName: string | null;
  templateDescription: string | null;
  assistantName: string;
  assistantEmail: string;
  outboundTravelVisible: number;
  returnTravelVisible: number;
  helpfulInfoVisible: number;
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Destination {
  id: string;
  projectId: string;
  name: string;
  dates: string | null;
  location: string | null;
  weather: string | null;
  weatherUrl: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FullProject {
  project: Project;
  destinations: Destination[];
  travellers: Traveller[];
  outboundTravel: OutboundTravel | null;
  returnTravel: ReturnTravel | null;
  helpfulInformation: HelpfulInformation | null;
  // Items grouped by destination
  itemsByDestination: {
    [destinationId: string]: {
      accommodations: Accommodation[];
      activities: Activity[];
      dining: Dining[];
      bars: Bar[];
      customSectionItems: CustomSectionItemWithValues[];
    };
  };
  // Items not assigned to destination (for lists or unassigned)
  unassignedItems: {
    accommodations: Accommodation[];
    activities: Activity[];
    dining: Dining[];
    bars: Bar[];
  };
  interDestinationTravel: InterDestinationTravel[];
}

// Updated item types (add to existing)
export interface Accommodation {
  // ... existing fields ...
  destinationId: string | null;  // NEW
  sourceUrl: string | null;      // NEW
  sourceType: 'manual' | 'autofill' | 'ai_suggested';  // NEW
}

// AI types
export interface AIConversation {
  id: string;
  userId: string;
  projectId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: {
    sources?: string[];
    suggestedItems?: string[];  // IDs of ai_suggested_items
  };
  createdAt: Date;
}

export interface AISuggestedItem {
  id: string;
  messageId: string;
  projectId: string | null;
  itemType: 'accommodation' | 'activity' | 'dining' | 'bar';
  itemData: Record<string, any>;
  sourceUrl: string | null;
  status: 'pending' | 'added' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## PDF Generation Changes

The PDF template will need updates to handle multiple destinations:

```typescript
// Pseudocode for new PDF structure

<Document>
  {/* Cover page (optional) */}
  <CoverPage project={project} />
  
  {/* Travellers */}
  <TravellersPage travellers={travellers} />
  
  {/* Outbound Travel - to first destination */}
  {outboundTravel && <OutboundTravelPage travel={outboundTravel} />}
  
  {/* For each destination */}
  {destinations.map((destination, index) => (
    <Fragment key={destination.id}>
      {/* Destination header */}
      <DestinationHeaderPage destination={destination} />
      
      {/* Accommodations for this destination */}
      <AccommodationsPage items={itemsByDestination[destination.id].accommodations} />
      
      {/* Activities */}
      <ActivitiesPage items={itemsByDestination[destination.id].activities} />
      
      {/* Dining */}
      <DiningPage items={itemsByDestination[destination.id].dining} />
      
      {/* Bars */}
      <BarsPage items={itemsByDestination[destination.id].bars} />
      
      {/* Travel to next destination (if not last) */}
      {index < destinations.length - 1 && (
        <InterTravelPage 
          travel={getInterTravel(destination.id, destinations[index + 1].id)} 
        />
      )}
    </Fragment>
  ))}
  
  {/* Return Travel - from last destination */}
  {returnTravel && <ReturnTravelPage travel={returnTravel} />}
  
  {/* Helpful Information */}
  {helpfulInformation && <HelpfulInfoPage info={helpfulInformation} />}
</Document>
```

---

## Next Steps

1. ✅ Schema design (this document)
2. ⏭️ Auto-fill feature prototype
3. ⏭️ Migration path details
4. ⏭️ UI/UX changes

Ready for the auto-fill prototype?
