# BlckBx Travel Helper - Product Specification

**Version:** 2.0.0
**Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Roles & Access](#3-user-roles--access)
4. [Pages & Routes](#4-pages--routes)
5. [Core Features](#5-core-features)
6. [Data Models](#6-data-models)
7. [Third-Party Integrations](#7-third-party-integrations)
8. [UI Components](#8-ui-components)
9. [Environment Configuration](#9-environment-configuration)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

BlckBx Travel Helper is a sophisticated web application for creating and managing personalized travel itineraries. It is designed primarily for luxury travel consultants who create detailed itineraries for their clients.

### 1.2 Target Users

- **Travel Consultants**: Create, manage, and publish professional travel itineraries
- **Travel Agencies**: Manage multiple itineraries across team members
- **Clients**: View published itineraries shared via unique URLs (no account required)

### 1.3 Key Value Propositions

- Professional PDF generation for client handouts
- URL-based autofill to quickly populate accommodation, dining, and activity details
- Multi-destination support with complex travel arrangements
- Shareable public URLs for client viewing
- Template system for reusable itinerary structures

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| Radix UI + Shadcn/ui | Component library |
| React Query (TanStack) | Server state management |
| React Hook Form | Form handling |
| Zod | Schema validation |
| @dnd-kit | Drag-and-drop functionality |
| @react-pdf/renderer | PDF generation |
| Framer Motion | Animations |
| Wouter | Routing |

### 2.2 Backend

| Technology | Purpose |
|------------|---------|
| PocketBase | Database, auth, and API |
| n8n | Automation workflows (autofill) |

### 2.3 External Services

| Service | Purpose |
|---------|---------|
| Google OAuth 2.0 | Authentication |
| Google Maps API | Location visualization (future) |
| FlightRadar24 | Flight tracking links |

---

## 3. User Roles & Access

### 3.1 Authentication

- Google OAuth 2.0 via PocketBase
- Auto-create user profile on first login
- Session management with persistent auth tokens

### 3.2 Access Levels

| Role | Access |
|------|--------|
| **Authenticated User** | Full CRUD on own itineraries, dashboard access |
| **Public Viewer** | Read-only access to published itineraries via share URL |

### 3.3 Protected vs Public Routes

- **Protected**: Dashboard, Create/Edit, Preview, Section Builder
- **Public**: View Itinerary (by slug), Login, OAuth Callback

---

## 4. Pages & Routes

### 4.1 Route Map

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/login` | Login | Public | Google OAuth sign-in |
| `/oauth/callback` | OAuthCallback | Public | OAuth redirect handler |
| `/` | Dashboard | Protected | Home - lists all projects |
| `/create` | CreateItinerary | Protected | Multi-step wizard for new itinerary |
| `/edit/:id` | CreateItinerary | Protected | Edit existing itinerary |
| `/itinerary/:slug` | ViewItinerary | Public | Published itinerary view |
| `/preview/:id` | PreviewArrange | Protected | Preview and reorder items |
| `/section-builder` | SectionBuilder | Protected | Create custom section templates |
| `/list/:id` | ListEditor | Protected | Simple list editor |

### 4.2 Dashboard Features

- Filter projects by: Published, Drafts, Templates, Lists
- Project cards with status badges
- Quick actions: Edit, Duplicate, Delete, View
- Save as Template functionality
- Create new itinerary or list

---

## 5. Core Features

### 5.1 Itinerary Creation Wizard

A 10-step guided process for creating comprehensive itineraries:

#### Step 1: Basic Information
- Itinerary title (auto-generates URL slug)
- Custom URL slug override
- Assistant name and email
- Traveller management (name, type: adult/child, age)

#### Step 2: Destinations
- Add multiple destinations
- Date range selection (start/end dates)
- Location details
- Weather information and forecast URL
- Notes field
- Drag-and-drop reordering

#### Step 3: Outbound Travel
- **Transfer to Airport**
  - Taxi booking (company, contact, pickup time, price)
  - Train option (station, time, booking reference)
  - Bus option
  - Shuttle option
- **Main Flight**
  - Single flight or multi-leg connecting flights
  - Flight number, departure/arrival airports
  - Departure/arrival times
  - Booking reference
  - Passengers and seat info
  - Things to remember notes
- **Multi-leg Flight Support**
  - Add unlimited connecting flights
  - Layover duration tracking
  - Per-leg flight details
- **Transfer to Accommodation**
  - Same options as transfer to airport

#### Step 4: Accommodation
- Add accommodations per destination
- **Autofill from URL** (booking.com, Airbnb, etc.)
- Fields: name, address, check-in details, booking reference
- Website URL, contact info
- Multiple images with primary image selection
- Google Maps link
- Notes
- Visibility toggle (show/hide in published view)

#### Step 5: Activities
- Add activities per destination
- **Autofill from URL** (TripAdvisor, Viator, etc.)
- Fields: name, description, price
- Contact details, address
- Website URL, Google Maps link
- Multiple images
- Notes and visibility toggle

#### Step 6: Dining
- Add restaurants per destination
- **Autofill from URL**
- Fields: name, cuisine type, price range
- Contact details, address
- Website URL, Google Maps link
- Multiple images
- Notes and visibility toggle

#### Step 7: Bars & Nightlife
- Add bars per destination
- **Autofill from URL**
- Fields: name, bar type, price range
- Contact details, address
- Website URL, Google Maps link
- Multiple images
- Notes and visibility toggle

#### Step 8: Additional Travel
- Mid-trip travel segments between destinations
- Supported types:
  - **Flight**: Flight number, airports, times, booking ref
  - **Train**: Stations, times, company, booking ref
  - **Ferry**: Ports, times, company, booking ref
  - **Car/Rental**: Pickup/dropoff, company, booking ref
- Date and time for each segment
- Notes field

#### Step 9: Return Travel
- Mirror of outbound travel structure
- Transfer to airport options
- Main flight (single or multi-leg)
- Transfer home options

#### Step 10: Helpful Information
- **Standard Fields:**
  - Local emergency number
  - Nearest British Embassy/Consulate
  - Travel insurance contact
  - Airline customer service
  - Local medical clinic/hospital
  - Local transport contacts
- **Custom Fields:**
  - Add unlimited label-value pairs
  - Flexible for any additional information

#### Step 11: Review & Publish
- Full itinerary preview
- Section-by-section summary
- Edit links to jump to any section
- Validation warnings (missing data)
- Save as Draft or Publish

### 5.2 PDF Generation

Professional PDF export with:

- **Cover Page**: Title, destination, dates, weather, traveller list
- **Sidebar**: Logo, trip title, assistant contact (fixed on all pages)
- **Sections**:
  - Destination overview with travel details
  - Accommodation cards with images
  - Activities listing
  - Dining recommendations
  - Bars and nightlife
  - Additional travel segments
  - Return travel details
  - Helpful information
- **Flight Cards**: Visual airport codes, times, multi-leg display
- **Dynamic Styling**: Title font size adjusts based on length
- **Page Numbers**: X / Y format in sidebar

### 5.3 Autofill System

URL-based data extraction via n8n webhook:

- **Supported Sources**: Booking.com, Airbnb, TripAdvisor, Viator, restaurant sites, etc.
- **Extracted Data**:
  - Name
  - Address
  - Description
  - Images (multiple)
  - Contact details
  - Prices
  - Website URL
- **UI**: Inline autofill button next to URL input
- **Feedback**: Loading state, success/error notifications

### 5.4 Travel Management

#### Multi-leg Flight Support
- Add unlimited connecting flights
- Per-leg details: airports, times, flight number
- Layover duration tracking
- Visual representation in view and PDF

#### Transfer Options
- Taxi: Company, contact, pickup time, price, payment status
- Train: Station, departure time, booking reference
- Bus: Station, departure time, booking reference
- Shuttle: Company, pickup time

#### Additional Travel Segments
- Flight, train, ferry, car rental
- Date and time scheduling
- Booking references
- Company/contact information

### 5.5 Sharing & Publishing

- **Custom URL Slugs**: `/itinerary/dubrovnik-2026`
- **Public View**: No authentication required
- **Share Options**:
  - Copy link to clipboard
  - Email sharing (multiple recipients)
  - WhatsApp sharing
- **PDF Download**: Available to public viewers

### 5.6 Template System

- Save any itinerary as a template
- Template name and description
- Reuse templates for new itineraries
- Templates listed separately in dashboard

### 5.7 Custom Sections (Section Builder)

- Create reusable section templates
- Define custom fields per section:
  - Text (single line)
  - Textarea (multi-line)
  - Number
  - Date
  - URL
  - Image
- Add section instances to itineraries
- Global vs user-specific sections

### 5.8 Item Arrangement

- **Preview & Arrange Page**: Drag-and-drop reorder all items
- **Per-section Reordering**: Within wizard steps
- **Display Order**: Persisted and respected in view/PDF

### 5.9 Visibility Controls

Each item (accommodation, activity, dining, bar) has:
- Visibility toggle
- Hidden items excluded from published view and PDF
- Still visible in edit mode for reference

---

## 6. Data Models

### 6.1 Project (Itinerary)

```typescript
interface Project {
  id: string;
  user: string;                    // Owner user ID
  name: string;                    // Itinerary title
  customUrlSlug: string;           // URL-friendly slug
  projectType: 'itinerary' | 'list';
  status: 'draft' | 'published';
  assistantName: string;
  assistantEmail: string;
  coverImage?: string;
  isTemplate: boolean;
  templateName?: string;
  templateDescription?: string;
  // Travel visibility flags
  outboundTravelVisible: number;
  returnTravelVisible: number;
  helpfulInfoVisible: number;
  // Timestamps
  created: string;
  updated: string;
}
```

### 6.2 Destination

```typescript
interface Destination {
  id: string;
  project: string;
  name: string;
  dates?: string;           // Display string
  startDate?: string;       // ISO date
  endDate?: string;         // ISO date
  location?: string;
  weather?: string;
  weatherUrl?: string;
  notes?: string;
  displayOrder: number;
}
```

### 6.3 Traveller

```typescript
interface Traveller {
  id: string;
  project: string;
  name: string;
  type: 'adult' | 'child';
  ageAtTravel?: number;
  displayOrder: number;
}
```

### 6.4 Accommodation / Activity / Dining / Bar

```typescript
interface BaseItem {
  id: string;
  project: string;
  destination?: string;      // Destination ID
  name: string;
  address?: string;
  googleMapsLink?: string;
  websiteUrl?: string;
  images: string[];
  primaryImage?: string;
  notes?: string;
  displayOrder: number;
  visible: boolean;
  sourceUrl?: string;
  sourceType?: 'manual' | 'autofill' | 'ai_suggested';
}

// Accommodation adds:
interface Accommodation extends BaseItem {
  checkInDetails?: string;
  bookingReference?: string;
  contactInfo?: string;
}

// Activity adds:
interface Activity extends BaseItem {
  description?: string;
  price?: string;
  contactDetails?: string;
}

// Dining adds:
interface Dining extends BaseItem {
  cuisineType?: string;
  priceRange?: string;
  contactDetails?: string;
}

// Bar adds:
interface Bar extends BaseItem {
  barType?: string;
  priceRange?: string;
  contactDetails?: string;
}
```

### 6.5 Travel Structures

```typescript
interface OutboundTravel {
  id: string;
  project: string;
  // Transfer to airport
  transferToAirportType?: 'taxi' | 'train' | 'bus' | 'shuttle';
  transferToAirportTaxiBooked?: number;
  transferToAirportCompany?: string;
  transferToAirportContact?: string;
  transferToAirportPickupTime?: string;
  transferToAirportPrice?: string;
  // ... similar fields for train, bus, shuttle

  // Main flight
  flightNumber?: string;
  flightDate?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  bookingReference?: string;
  passengersSeats?: string;
  thingsToRemember?: string;

  // Multi-leg support
  isMultiLeg?: boolean;
  legs?: FlightLeg[];

  // Transfer to accommodation
  transferToAccomType?: 'taxi' | 'train' | 'bus' | 'shuttle';
  // ... similar fields
}

interface FlightLeg {
  id: string;
  flightNumber?: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime?: string;
  arrivalTime?: string;
  layoverDuration?: string;
}
```

### 6.6 Additional Travel

```typescript
interface AdditionalTravelSegment {
  id: string;
  type: 'flight' | 'train' | 'ferry' | 'car' | 'bus' | 'taxi' | 'shuttle';
  date?: string;
  fromLocation?: string;
  toLocation?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightNumber?: string;
  company?: string;
  bookingReference?: string;
  notes?: string;
}
```

### 6.7 Helpful Information

```typescript
interface HelpfulInformation {
  id: string;
  project: string;
  localEmergency?: string;
  nearestEmbassy?: string;
  travelInsurance?: string;
  airlineCustomerService?: string;
  localMedicalClinic?: string;
  transportContacts?: string;
  customFields?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}
```

---

## 7. Third-Party Integrations

### 7.1 PocketBase

- **URL**: `https://pocketbase.blckbx.co.uk`
- **Purpose**: Backend database, authentication, file storage
- **Collections**: Projects, destinations, travellers, accommodations, activities, dining, bars, travel, helpful info

### 7.2 n8n Automation

- **Webhook URL**: `https://n8n.blckbx.co.uk/webhook/travel-autofill`
- **Purpose**: URL-based data extraction for autofill
- **Workflow**: Receives URL → Scrapes page → Returns structured data

### 7.3 Google Maps API (Future)

- **Purpose**: Location overview map showing all POIs
- **Features**: Color-coded markers, info windows, legend
- **Status**: Components built, awaiting API key configuration

### 7.4 FlightRadar24

- **Purpose**: External flight tracking
- **Integration**: Link generation from flight numbers
- **URL Pattern**: `https://www.flightradar24.com/data/flights/{flightNumber}`

---

## 8. UI Components

### 8.1 Core Components (Shadcn/ui)

- Button, Card, Dialog, Dropdown Menu
- Input, Label, Textarea, Select
- Checkbox, Radio Group, Switch
- Badge, Avatar, Separator
- Accordion, Tabs, Collapsible
- Toast, Alert Dialog, Tooltip
- Progress, Scroll Area, Slider
- Calendar, Date Picker, Popover

### 8.2 Custom Components

| Component | Purpose |
|-----------|---------|
| FlightCard | Visual flight display with airport codes |
| TravelSegmentCard | Generic travel segment display |
| AutofillInput | URL input with autofill trigger |
| DestinationBar | Horizontal destination selector |
| SortableItemCard | Drag-and-drop item card |
| ShareModal | Email/link sharing interface |
| MapVisualization | Google Maps with markers (disabled) |
| WizardNavigation | Step indicator and navigation |

### 8.3 Design Patterns

- **Color Scheme**:
  - Primary: Purple (#6B1488)
  - CTA/Accent: Yellow (#F5C518)
  - Background: Warm beige (#E8E4DE)
  - Text: Dark (#1a1a1a)

- **Typography**:
  - Headings: Serif font (display)
  - Body: Sans-serif (system)

- **Layout**:
  - Max width containers (4xl, 5xl)
  - Responsive grid layouts
  - Card-based content organization

- **Interactions**:
  - Drag-and-drop for reordering
  - Inline editing
  - Modal dialogs for forms
  - Toast notifications for feedback

---

## 9. Environment Configuration

### 9.1 Required Environment Variables

```env
# PocketBase
VITE_POCKETBASE_URL=https://pocketbase.blckbx.co.uk

# Google Maps (optional - for map feature)
VITE_GOOGLE_MAPS_API_KEY=your-api-key

# Autofill Webhook
VITE_AUTOFILL_WEBHOOK_URL=https://n8n.blckbx.co.uk/webhook/travel-autofill
```

### 9.2 Development Variables

```env
# Bypass auth for development
VITE_BYPASS_AUTH=true

# Dev credentials (optional)
VITE_PB_DEV_EMAIL=dev@example.com
VITE_PB_DEV_PASSWORD=devpassword
```

---

## 10. Future Enhancements

### 10.1 Planned Features

- [ ] **Location Overview Map**: Re-enable with Google Maps API key
- [ ] **AI Suggestions**: AI-powered activity recommendations
- [ ] **Collaborative Editing**: Multiple users editing same itinerary
- [ ] **Version History**: Track changes and revert
- [ ] **Client Feedback**: Comments/reactions on published itineraries
- [ ] **Mobile App**: Native iOS/Android companion apps
- [ ] **Calendar Integration**: Export to Google/Apple Calendar
- [ ] **Budget Tracking**: Cost estimation and tracking
- [ ] **Weather Integration**: Live weather data in itinerary

### 10.2 Technical Improvements

- [ ] **Offline Support**: Service worker for offline viewing
- [ ] **Image Optimization**: Automatic compression and resizing
- [ ] **Performance**: Lazy loading, code splitting
- [ ] **Testing**: Unit and E2E test coverage
- [ ] **Monitoring**: Error tracking and analytics

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save draft |
| `Ctrl/Cmd + Enter` | Proceed to next step |
| `Escape` | Close modal/dialog |

## Appendix B: File Structure

```
Travel_Helper/
├── client/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # Shadcn/ui components
│   │   │   ├── wizard/     # Wizard step components
│   │   │   └── pdf/        # PDF template components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   └── assets/         # Static assets
│   └── index.html
├── server/                  # Server configuration
├── shared/                  # Shared types and schema
├── .env                     # Environment variables
└── package.json
```

---

*This specification is maintained by the BlckBx development team.*
