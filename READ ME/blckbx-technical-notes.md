# BLCK BX - Technical Notes

## Overview

This document covers technical implementation details for features that need special attention during migration, plus competitive feature analysis for future enhancements.

---

## 1. URL Slug Generation

### Current Implementation (Replit/Express)

The slug is generated server-side when creating an itinerary:

```javascript
import { nanoid } from "nanoid";

// Slug generation helper - creates short URLs (e.g., "norway-trip-aB3x")
function generateSlug(title: string): string {
  // Get first 2 words of title
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 2);
  
  // Generate 4-character unique code
  const code = nanoid(4);
  
  // Combine: "norway-trip-aB3x" or just "trip-aB3x" if no words
  return words.length > 0 
    ? `${words.join('-')}-${code}`
    : `trip-${code}`;
}

// Ensure uniqueness by checking database
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (await storage.getItineraryBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
```

### PocketBase Implementation

PocketBase doesn't have nanoid built-in, but you can replicate this in a hook:

```javascript
// pb_hooks/slugs.pb.js

/// <reference path="../pb_data/types.d.ts" />

// Generate random alphanumeric string (replacement for nanoid)
function randomCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate slug from title
function generateSlug(title) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 2);
  
  const code = randomCode(4);
  
  return words.length > 0 
    ? `${words.join('-')}-${code}`
    : `trip-${code}`;
}

// Hook: Auto-generate slug on project creation
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  
  // Only for projects collection
  if (e.collection.name !== 'projects') return;
  
  // Generate slug if not provided
  if (!record.get('customUrlSlug')) {
    const title = record.get('name') || 'trip';
    let slug = generateSlug(title);
    
    // Check uniqueness
    let counter = 1;
    while (true) {
      const existing = $app.dao().findFirstRecordByFilter(
        'projects',
        'customUrlSlug = {:slug}',
        { slug: slug }
      );
      
      if (!existing) break;
      
      slug = `${generateSlug(title)}-${counter}`;
      counter++;
    }
    
    record.set('customUrlSlug', slug);
  }
}, 'projects');
```

### Alternative: Client-Side Generation

If you prefer generating on the frontend:

```typescript
// lib/slugs.ts

import { customAlphabet } from 'nanoid';

// Create a custom nanoid with URL-safe characters
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 4);

export function generateSlug(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 2);
  
  const code = nanoid();
  
  return words.length > 0 
    ? `${words.join('-')}-${code}`
    : `trip-${code}`;
}
```

Then check uniqueness via PocketBase query before saving.

### Public URL Structure

```
Production:  https://blckbx.co.uk/itinerary/portugal-trip-aB3x
Development: http://localhost:3000/itinerary/portugal-trip-aB3x
```

The frontend route handles the slug:

```tsx
// App.tsx
<Route path="/itinerary/:slug" component={ViewItinerary} />
```

---

## 2. Google Maps Integration

### Current Implementation

Uses Google Maps JavaScript API with Advanced Markers:

**Components:**
- `MapVisualization.tsx` - Main map component
- `lib/mapUtils.ts` - Coordinate extraction and helpers
- `lib/collectLocations.ts` - Extracts locations from itinerary data

**How it works:**

1. **Extract coordinates from Google Maps URLs:**
```typescript
// Supports multiple URL formats:
// @lat,lng,zoom - https://maps.google.com/.../@40.7128,-74.0060,15z
// ?q=lat,lng    - https://maps.google.com/?q=40.7128,-74.0060
// /place/.../@  - https://maps.google.com/place/Name/@40.7128,-74.0060

function extractCoordinatesFromMapsUrl(url: string): { lat: number; lng: number } | null {
  // ... regex matching for each format
}
```

2. **Collect all locations from itinerary:**
```typescript
function collectLocations(data: FullItinerary): MapLocation[] {
  const locations: MapLocation[] = [];
  
  // Accommodations (blue markers)
  data.accommodations?.forEach(item => {
    const coords = extractCoordinatesFromMapsUrl(item.googleMapsLink);
    if (coords) {
      locations.push({
        ...coords,
        label: item.name,
        type: 'accommodation',
        color: '#3B82F6'
      });
    }
  });
  
  // Activities (red markers)
  // Dining (amber markers)
  // Custom sections (purple markers)
  // ...
  
  return locations;
}
```

3. **Render map with markers:**
```typescript
// Initialize Google Maps
const { Map } = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

// Calculate bounds to fit all markers
const bounds = new google.maps.LatLngBounds();
locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));

// Create map
const map = new Map(mapRef.current, {
  mapId: "itinerary-map",
  center: bounds.getCenter(),
  zoom: 12
});

map.fitBounds(bounds);

// Add markers with custom colors
locations.forEach(location => {
  const pin = new PinElement({
    background: location.color,
    borderColor: "#ffffff",
    glyphColor: "#ffffff",
    scale: 1.2
  });
  
  new AdvancedMarkerElement({
    map,
    position: { lat: location.lat, lng: location.lng },
    title: location.label,
    content: pin.element
  });
});
```

### PocketBase Migration

**No changes needed to the components** - they're purely frontend.

**Update for multi-destination:**

```typescript
// Updated collectLocations for multi-destination
function collectLocations(data: FullProject): MapLocation[] {
  const locations: MapLocation[] = [];
  
  // Loop through destinations
  Object.entries(data.itemsByDestination).forEach(([destId, items]) => {
    const destination = data.destinations.find(d => d.id === destId);
    
    items.accommodations?.forEach(item => {
      const coords = extractCoordinatesFromMapsUrl(item.googleMapsLink);
      if (coords) {
        locations.push({
          ...coords,
          label: item.name,
          type: 'accommodation',
          color: '#3B82F6',
          destinationId: destId,        // NEW
          destinationName: destination?.name  // NEW
        });
      }
    });
    
    // ... other item types
  });
  
  return locations;
}
```

**Optional enhancement - destination grouping:**

```typescript
// Show destination boundaries or group markers
interface MapLocation {
  lat: number;
  lng: number;
  label: string;
  type: 'accommodation' | 'activity' | 'dining' | 'custom';
  color: string;
  destinationId?: string;
  destinationName?: string;
}

// Different marker styles per destination (optional)
const destinationColors = {
  0: { border: '#1E40AF' },  // First destination - darker blue border
  1: { border: '#166534' },  // Second destination - green border
  2: { border: '#9333EA' },  // Third destination - purple border
};
```

### Environment Variables

```env
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Google Cloud Console Setup

1. Create project in Google Cloud Console
2. Enable APIs:
   - Maps JavaScript API
   - Maps Static API (for PDF export)
   - Places API (optional - for auto-fill enhancement)
3. Create API key
4. Restrict key:
   - HTTP referrers: `https://blckbx.co.uk/*`, `http://localhost:*`
   - API restrictions: Select the APIs above

---

## 3. FlightRadar24 Integration

### Current Implementation

**Not an API integration** - simply generates a link to FlightRadar24's website.

```typescript
// FlightCard.tsx

const cleanFlightNumber = flightNumber.replace(/\s/g, '').toUpperCase();
const flightTrackerUrl = `https://www.flightradar24.com/data/flights/${cleanFlightNumber.toLowerCase()}`;

// Example: BA123 -> https://www.flightradar24.com/data/flights/ba123

return (
  <Button asChild>
    <a href={flightTrackerUrl} target="_blank" rel="noopener noreferrer">
      Track Flight {cleanFlightNumber}
    </a>
  </Button>
);
```

### PocketBase Migration

**No changes needed** - this is purely frontend logic.

### PDF Integration

The same URL is used in the PDF template:

```typescript
// ItineraryPDFTemplate.tsx

const getFlightTrackerUrl = (flightNumber: string): string => {
  const clean = flightNumber.replace(/\s/g, '').toLowerCase();
  return `https://www.flightradar24.com/data/flights/${clean}`;
};

<Link src={getFlightTrackerUrl(flightNumber)} style={styles.flightCardTrackButton}>
  <Text>Track Flight {cleanFlightNumber}</Text>
</Link>
```

### Visual Design

The FlightCard has a distinctive design worth preserving:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✈️ BA123                                            Direct    │  <- Black header #1C1D1F
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    LHR ──────────────✈️────────────────▶ LIS                  │  <- Cream bg #F5F3F0
│   06:30                                   09:45                │
│   London Heathrow                         Lisbon               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📅 Oct 5, 2025    👥 2 passengers                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │  <- Orange #FFBB95
│  │ ⚠️ THINGS TO REMEMBER                                    │   │
│  │ Check in online 24h before...                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Track Flight BA123 ✈️]                                       │  <- Purple button #6B1488
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Competitor Feature Analysis

Based on research of Travefy, Wanderlog, TripIt, AXUS, TripMapper, Safari Portal, and others:

### Features BLCK BX Already Has ✅

| Feature | Notes |
|---------|-------|
| Drag-and-drop itinerary building | Via dnd-kit |
| Professional PDF export | Custom @react-pdf template |
| Multi-leg flight support | With layover indicators |
| Transfer tracking (taxi/train) | Outbound and return |
| Custom sections | Flexible field types |
| Map visualization | Google Maps with markers |
| Flight tracking links | FlightRadar24 |
| Template system | Save as template, duplicate |
| Mobile-responsive view | Client-facing pages |
| Image galleries per item | Multiple images supported |

### Features to Add (Prioritized)

#### HIGH PRIORITY - Already Planned

| Feature | Competitors | Notes |
|---------|-------------|-------|
| **Multi-destination** | TripMatrix, Wanderlog, AXUS | Already in schema design |
| **List/research mode** | Travefy, Wanderlog | Already in schema design |
| **Auto-fill from URL** | TripIt, Wanderlog | Already in n8n design |
| **AI research assistant** | Layla, TripPlanner AI | Already planned |

#### MEDIUM PRIORITY - Worth Adding

| Feature | Competitors | Implementation Notes |
|---------|-------------|----------------------|
| **Email confirmation import** | TripIt, Wanderlog | Parse forwarded emails for booking details. n8n workflow: receive email → extract data → create item |
| **Client feedback/approval** | Travefy, QuoteCloud | Add status field to projects: "awaiting_approval", "changes_requested", "approved". Client can leave comments. |
| **Collaborative editing** | Travefy, AXUS | PocketBase realtime subscriptions. Multiple users editing same project. |
| **Mobile app for clients** | TripMapper, AXUS, Moonstride | React Native or PWA. Offline access to itinerary. |
| **Supplier/vendor database** | TripMatrix, Moonstride | Save frequently used hotels, restaurants, taxi companies. Quick-add to itineraries. |
| **Route optimization** | Wanderlog | Reorder activities to minimize travel time. Google Directions API. |
| **Budget tracking** | Wanderlog, ClickUp | Add price fields, sum totals per category and trip. |
| **Document attachments** | AXUS, TripMapper | Attach PDFs (tickets, vouchers) to items. PocketBase file fields. |
| **In-app messaging** | TripMapper | Chat between agent and client within project. |

#### LOWER PRIORITY - Nice to Have

| Feature | Competitors | Implementation Notes |
|---------|-------------|----------------------|
| **Checklist/tasks** | TripMapper, ClickUp | Pre-trip checklist (passport, visa, packing). Per-traveller tasks. |
| **Weather integration** | Wanderlog | Auto-fetch weather forecast for dates. Already have manual weather field. |
| **Currency conversion** | Various | Show prices in client's currency |
| **Travel insurance integration** | WeTravel | Partner with insurance providers |
| **Commission tracking** | Travefy | Track earnings per booking |
| **White-labeling** | Safari Portal, TripMapper | Custom branding per client or partner agency |
| **Calendar export** | TripIt, Wanderlog | iCal/Google Calendar sync |
| **Live flight status** | TripIt Pro | API integration (costs money) |

### Feature Deep-Dives

#### Email Confirmation Import

**How TripIt does it:**
1. User forwards confirmation email to plans@tripit.com
2. System parses email for booking details
3. Automatically creates itinerary items

**Implementation for BLCK BX:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EMAIL IMPORT FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. Set up email receiving                                                       │
│     - Mailgun/SendGrid inbound webhook                                          │
│     - Or: IMAP polling                                                          │
│                                                                                  │
│  2. n8n workflow triggered                                                       │
│     - Receive email                                                              │
│     - Identify sender (match to user)                                           │
│     - Identify booking type (flight, hotel, activity)                           │
│     - Extract structured data with LLM                                          │
│                                                                                  │
│  3. Create item in project                                                       │
│     - Match to active project or create new                                     │
│     - Set sourceType: 'email_import'                                            │
│     - Flag for user review                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Client Feedback/Approval

```typescript
// New fields on projects collection
{
  "approvalStatus": "select",  // "draft", "sent_for_review", "changes_requested", "approved"
  "clientEmail": "email",      // For sending review links
  "clientAccessToken": "text", // Secure token for client access
}

// New collection: project_comments
{
  "project": "relation",
  "author": "text",           // "agent" or "client"
  "content": "text",
  "itemType": "text",         // Which section/item this refers to
  "itemId": "text",
  "resolved": "bool"
}
```

**Client review flow:**
1. Agent clicks "Send for Review"
2. Client receives email with unique link
3. Client views itinerary, can leave comments on specific items
4. Agent sees comments, makes changes
5. Client approves or requests more changes

#### Supplier Database

```typescript
// New collection: suppliers
{
  "user": "relation",
  "name": "text",
  "type": "select",           // "hotel", "restaurant", "taxi", "tour_operator"
  "contactName": "text",
  "contactEmail": "email",
  "contactPhone": "text",
  "address": "text",
  "googleMapsLink": "url",
  "websiteUrl": "url",
  "notes": "text",
  "defaultImages": "file[]",
  "tags": "json",             // ["luxury", "family-friendly", "lisbon"]
}
```

**Usage:**
- Quick-add supplier to itinerary
- Auto-fills all details
- Track which suppliers you use most
- Build preferred supplier lists

---

## 5. PDF Generation Notes

### Current Stack
- `@react-pdf/renderer` - React components to PDF
- Custom template with sidebar design
- Image proxy for external images (base64 encoding)

### Image Handling

The current system uses an image proxy because `@react-pdf/renderer` has strict URL validation:

```typescript
// Current: Proxy route that fetches and returns images
// /api/proxy-image/{base64-encoded-url}.jpg

// For PocketBase, images stored in PocketBase are accessed via:
// https://your-pb.com/api/files/{collection}/{record}/{filename}

// These URLs should work directly with @react-pdf/renderer
// But external URLs (from auto-fill) may still need proxy
```

### PocketBase Image URLs

```typescript
// Helper to get PocketBase file URL
function getPocketBaseFileUrl(record: any, filename: string): string {
  return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${filename}`;
}

// For items with images
const imageUrls = item.images.map(filename => 
  getPocketBaseFileUrl(item, filename)
);
```

### Multi-Destination PDF Structure

```
Page 1: Cover (trip title, destinations overview, travellers)
Page 2: Outbound Travel
Page 3-N: Destination 1 content
  - Destination header (name, dates, weather)
  - Accommodations
  - Activities  
  - Dining
  - Bars
Page N+1: Inter-destination travel (if applicable)
Page N+2 to M: Destination 2 content
... repeat for each destination
Page M+1: Return Travel
Page M+2: Helpful Information
```

---

## 6. Environment Variables Summary

```env
# PocketBase
VITE_POCKETBASE_URL=https://your-pocketbase-instance.com

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# n8n Webhooks
N8N_AUTOFILL_WEBHOOK_URL=https://your-n8n.com/webhook/autofill-extract
N8N_EMAIL_IMPORT_WEBHOOK_URL=https://your-n8n.com/webhook/email-import

# AI Service (if separate from n8n)
AI_API_KEY=your-anthropic-or-openai-key

# Optional: Email service for notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@blckbx.co.uk
SMTP_PASS=your-smtp-password
```

---

## 7. Files to Copy As-Is

These components work without modification after PocketBase migration:

```
src/components/
├── FlightCard.tsx          # Flight display with FR24 link
├── MapVisualization.tsx    # Google Maps component
├── MapModal.tsx            # Map in modal
├── VillaCard.tsx           # Accommodation card
├── ui/                     # All shadcn components
└── pdf/
    └── ItineraryPDFTemplate.tsx  # PDF generation (needs data shape update)

src/lib/
├── mapUtils.ts             # Coordinate extraction
├── googleMaps.ts           # Google Maps helpers
└── utils.ts                # General utilities

src/hooks/
└── useImagePreprocessor.ts # Image handling for PDF
```

---

## 8. Migration Checklist

### Phase 1: Core Migration
- [ ] Set up PocketBase collections (schema from design doc)
- [ ] Create PocketBase hooks (slug generation, etc.)
- [ ] Export data from Neon
- [ ] Transform and import to PocketBase
- [ ] Update frontend API calls to PocketBase SDK
- [ ] Test auth flow
- [ ] Test CRUD operations
- [ ] Test public itinerary view

### Phase 2: Feature Parity
- [ ] Google Maps working
- [ ] Flight cards working
- [ ] PDF generation working
- [ ] Image handling working
- [ ] Drag-and-drop working
- [ ] Templates/duplicate working

### Phase 3: New Features
- [ ] Multi-destination support
- [ ] List mode
- [ ] Auto-fill (n8n webhook)
- [ ] AI chat sidebar

### Phase 4: Enhancements
- [ ] Email import
- [ ] Client feedback/approval
- [ ] Supplier database
- [ ] Other features from priority list
