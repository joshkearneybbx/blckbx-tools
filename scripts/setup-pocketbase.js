#!/usr/bin/env node

/**
 * PocketBase Collection Setup Script
 *
 * Run this script to create all required collections in PocketBase.
 *
 * Usage:
 *   node scripts/setup-pocketbase.js
 *
 * Environment variables:
 *   POCKETBASE_URL - Default: http://localhost:8090
 *   PB_ADMIN_EMAIL - Default: admin@blckbx.co.uk
 *   PB_ADMIN_PASSWORD - Default: your-secure-password
 */

const PB_URL = process.env.POCKETBASE_URL || 'https://pocketbase.blckbx.co.uk';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@blckbx.co.uk';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!PB_ADMIN_PASSWORD) {
  console.error('ERROR: PB_ADMIN_PASSWORD environment variable is required');
  console.error('Export it with: export PB_ADMIN_PASSWORD=your-password');
  process.exit(1);
}

// Collection definitions
const collections = [
  {
    name: "projects",
    type: "base",
    schema: [
      { id: "user_field", name: "user", type: "relation", required: true, options: { collectionId: "users", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "customUrlSlug", name: "customUrlSlug", "type": "text", unique: true },
      { id: "projectType", name: "projectType", type: "select", options: { values: ["itinerary", "list"] }, default: "itinerary" },
      { id: "status", name: "status", type: "select", options: { values: ["draft", "published"] }, default: "draft" },
      { id: "isTemplate", name: "isTemplate", type: "bool", default: false },
      { id: "templateName", name: "templateName", type: "text" },
      { id: "templateDescription", name: "templateDescription", type: "text" },
      { id: "assistantName", name: "assistantName", type: "text", required: true },
      { id: "assistantEmail", name: "assistantEmail", type: "email", required: true },
      { id: "outboundTravelVisible", name: "outboundTravelVisible", type: "bool", default: true },
      { id: "returnTravelVisible", name: "returnTravelVisible", type: "bool", default: true },
      { id: "helpfulInfoVisible", name: "helpfulInfoVisible", type: "bool", default: true },
      { id: "coverImage", name: "coverImage", type: "file", options: { maxSelect: 1, maxSize: 5242880 } },
    ],
  },
  {
    name: "destinations",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "dates", name: "dates", type: "text" },
      { id: "location", name: "location", type: "text" },
      { id: "weather", name: "weather", type: "text" },
      { id: "weatherUrl", name: "weatherUrl", type: "url" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
    ],
  },
  {
    name: "travellers",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "type", name: "type", type: "select", options: { values: ["adult", "child"] }, required: true, default: "adult" },
      { id: "ageAtTravel", name: "ageAtTravel", type: "number" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
    ],
  },
  {
    name: "outbound_travel",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, unique: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "transferToAirportType", name: "transferToAirportType", type: "select", options: { values: ["none", "taxi", "train"] }, default: "none" },
      { id: "transferToAirportCompany", name: "transferToAirportCompany", type: "text" },
      { id: "transferToAirportContact", name: "transferToAirportContact", type: "text" },
      { id: "transferToAirportCollectionTime", name: "transferToAirportCollectionTime", type: "text" },
      { id: "transferToAirportPickupLocation", name: "transferToAirportPickupLocation", type: "text" },
      { id: "transferToAirportPaymentStatus", name: "transferToAirportPaymentStatus", type: "text" },
      { id: "transferToAirportTaxis", name: "transferToAirportTaxis", type: "json" },
      { id: "transferToAirportTrains", name: "transferToAirportTrains", type: "json" },
      { id: "transferToAccomType", name: "transferToAccomType", type: "select", options: { values: ["none", "taxi", "train"] }, default: "none" },
      { id: "transferToAccomCompany", name: "transferToAccomCompany", type: "text" },
      { id: "transferToAccomContact", name: "transferToAccomContact", type: "text" },
      { id: "transferToAccomCollectionTime", name: "transferToAccomCollectionTime", type: "text" },
      { id: "transferToAccomPickupLocation", name: "transferToAccomPickupLocation", type: "text" },
      { id: "transferToAccomPaymentStatus", name: "transferToAccomPaymentStatus", type: "text" },
      { id: "transferToAccomTaxis", name: "transferToAccomTaxis", type: "json" },
      { id: "transferToAccomTrains", name: "transferToAccomTrains", type: "json" },
      { id: "flightNumber", name: "flightNumber", type: "text" },
      { id: "flightDate", name: "flightDate", type: "text" },
      { id: "departureAirport", name: "departureAirport", type: "text" },
      { id: "arrivalAirport", name: "arrivalAirport", type: "text" },
      { id: "departureTime", name: "departureTime", type: "text" },
      { id: "arrivalTime", name: "arrivalTime", type: "text" },
      { id: "passengersSeats", name: "passengersSeats", type: "text" },
      { id: "thingsToRemember", name: "thingsToRemember", type: "text" },
      { id: "isMultiLeg", name: "isMultiLeg", type: "bool", default: false },
      { id: "legs", name: "legs", type: "json" },
    ],
  },
  {
    name: "accommodations",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "destination", name: "destination", type: "relation", options: { collectionId: "destinations", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "address", name: "address", type: "text" },
      { id: "googleMapsLink", name: "googleMapsLink", type: "url" },
      { id: "checkInDetails", name: "checkInDetails", type: "text" },
      { id: "bookingReference", name: "bookingReference", type: "text" },
      { id: "websiteUrl", name: "websiteUrl", type: "url" },
      { id: "contactInfo", name: "contactInfo", type: "text" },
      { id: "images", name: "images", type: "json" },
      { id: "notes", name: "notes", type: "text" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
      { id: "visible", name: "visible", type: "bool", default: true },
      { id: "sourceUrl", name: "sourceUrl", type: "url" },
      { id: "sourceType", name: "sourceType", type: "select", options: { values: ["manual", "autofill", "ai_suggested"] }, default: "manual" },
    ],
  },
  {
    name: "activities",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "destination", name: "destination", type: "relation", options: { collectionId: "destinations", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "description", name: "description", type: "text" },
      { id: "price", name: "price", type: "text" },
      { id: "contactDetails", name: "contactDetails", type: "text" },
      { id: "address", name: "address", type: "text" },
      { id: "googleMapsLink", name: "googleMapsLink", type: "url" },
      { id: "websiteUrl", name: "websiteUrl", type: "url" },
      { id: "images", name: "images", type: "json" },
      { id: "notes", name: "notes", type: "text" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
      { id: "visible", name: "visible", type: "bool", default: true },
      { id: "sourceUrl", name: "sourceUrl", type: "url" },
      { id: "sourceType", name: "sourceType", type: "select", options: { values: ["manual", "autofill", "ai_suggested"] }, default: "manual" },
    ],
  },
  {
    name: "dining",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "destination", name: "destination", type: "relation", options: { collectionId: "destinations", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "cuisineType", name: "cuisineType", type: "text" },
      { id: "priceRange", name: "priceRange", type: "text" },
      { id: "contactDetails", name: "contactDetails", type: "text" },
      { id: "address", name: "address", type: "text" },
      { id: "googleMapsLink", name: "googleMapsLink", type: "url" },
      { id: "websiteUrl", name: "websiteUrl", type: "url" },
      { id: "images", name: "images", type: "json" },
      { id: "notes", name: "notes", type: "text" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
      { id: "visible", name: "visible", type: "bool", default: true },
      { id: "sourceUrl", name: "sourceUrl", type: "url" },
      { id: "sourceType", name: "sourceType", type: "select", options: { values: ["manual", "autofill", "ai_suggested"] }, default: "manual" },
    ],
  },
  {
    name: "bars",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "destination", name: "destination", type: "relation", options: { collectionId: "destinations", maxSelect: 1 } },
      { id: "name", name: "name", type: "text", required: true },
      { id: "barType", name: "barType", type: "text" },
      { id: "priceRange", name: "priceRange", type: "text" },
      { id: "contactDetails", name: "contactDetails", type: "text" },
      { id: "address", name: "address", type: "text" },
      { id: "googleMapsLink", name: "googleMapsLink", type: "url" },
      { id: "websiteUrl", name: "websiteUrl", type: "url" },
      { id: "images", name: "images", type: "json" },
      { id: "notes", name: "notes", type: "text" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
      { id: "visible", name: "visible", type: "bool", default: true },
      { id: "sourceUrl", name: "sourceUrl", type: "url" },
      { id: "sourceType", name: "sourceType", type: "select", options: { values: ["manual", "autofill", "ai_suggested"] }, default: "manual" },
    ],
  },
  {
    name: "inter_destination_travel",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "travelType", name: "travelType", type: "select", options: { values: ["car", "flight", "ferry", "train"] }, required: true },
      { id: "vehicleDetails", name: "vehicleDetails", type: "text" },
      { id: "vehicleRegistration", name: "vehicleRegistration", type: "text" },
      { id: "carContactDetails", name: "carContactDetails", type: "text" },
      { id: "carBookingDetails", name: "carBookingDetails", type: "text" },
      { id: "flightNumber", name: "flightNumber", type: "text" },
      { id: "flightDate", name: "flightDate", type: "text" },
      { id: "flightDepartureAirport", name: "flightDepartureAirport", type: "text" },
      { id: "flightArrivalAirport", name: "flightArrivalAirport", type: "text" },
      { id: "flightDepartureTime", name: "flightDepartureTime", type: "text" },
      { id: "flightArrivalTime", name: "flightArrivalTime", type: "text" },
      { id: "flightPassengersSeats", name: "flightPassengersSeats", type: "text" },
      { id: "flightThingsToRemember", name: "flightThingsToRemember", type: "text" },
      { id: "flightIsMultiLeg", name: "flightIsMultiLeg", type: "bool", default: false },
      { id: "flightLegs", name: "flightLegs", type: "json" },
      { id: "ferryDepartingFrom", name: "ferryDepartingFrom", type: "text" },
      { id: "ferryDestination", name: "ferryDestination", type: "text" },
      { id: "ferryDate", name: "ferryDate", type: "text" },
      { id: "ferryPrice", name: "ferryPrice", type: "text" },
      { id: "ferryContactDetails", name: "ferryContactDetails", type: "text" },
      { id: "ferryAdditionalNotes", name: "ferryAdditionalNotes", type: "text" },
      { id: "ferryBookingReference", name: "ferryBookingReference", type: "text" },
      { id: "trainDepartingFrom", name: "trainDepartingFrom", type: "text" },
      { id: "trainDestination", name: "trainDestination", type: "text" },
      { id: "trainDate", name: "trainDate", type: "text" },
      { id: "trainPrice", name: "trainPrice", type: "text" },
      { id: "trainContactDetails", name: "trainContactDetails", type: "text" },
      { id: "trainAdditionalNotes", name: "trainAdditionalNotes", type: "text" },
      { id: "trainBookingReference", name: "trainBookingReference", type: "text" },
      { id: "displayOrder", name: "displayOrder", type: "number", default: 0 },
      { id: "visible", name: "visible", type: "bool", default: true },
    ],
  },
  {
    name: "return_travel",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, unique: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "transferToAirportType", name: "transferToAirportType", type: "select", options: { values: ["none", "taxi", "train"] }, default: "none" },
      { id: "transferToAirportCompany", name: "transferToAirportCompany", type: "text" },
      { id: "transferToAirportContact", name: "transferToAirportContact", type: "text" },
      { id: "transferToAirportCollectionTime", name: "transferToAirportCollectionTime", type: "text" },
      { id: "transferToAirportPickupLocation", name: "transferToAirportPickupLocation", type: "text" },
      { id: "transferToAirportPaymentStatus", name: "transferToAirportPaymentStatus", type: "text" },
      { id: "transferToAirportTaxis", name: "transferToAirportTaxis", type: "json" },
      { id: "transferToAirportTrains", name: "transferToAirportTrains", type: "json" },
      { id: "flightNumber", name: "flightNumber", type: "text" },
      { id: "flightDate", name: "flightDate", type: "text" },
      { id: "departureAirport", name: "departureAirport", type: "text" },
      { id: "arrivalAirport", name: "arrivalAirport", type: "text" },
      { id: "departureTime", name: "departureTime", type: "text" },
      { id: "arrivalTime", name: "arrivalTime", type: "text" },
      { id: "passengersSeats", name: "passengersSeats", type: "text" },
      { id: "thingsToRemember", name: "thingsToRemember", type: "text" },
      { id: "isMultiLeg", name: "isMultiLeg", type: "bool", default: false },
      { id: "legs", name: "legs", type: "json" },
      { id: "transferHomeType", name: "transferHomeType", type: "select", options: { values: ["none", "taxi", "train"] }, default: "none" },
      { id: "transferHomeCompany", name: "transferHomeCompany", type: "text" },
      { id: "transferHomeContact", name: "transferHomeContact", type: "text" },
      { id: "transferHomeCollectionTime", name: "transferHomeCollectionTime", type: "text" },
      { id: "transferHomePickupLocation", name: "transferHomePickupLocation", type: "text" },
      { id: "transferHomePaymentStatus", name: "transferHomePaymentStatus", type: "text" },
      { id: "transferHomeTaxis", name: "transferHomeTaxis", type: "json" },
      { id: "transferHomeTrains", name: "transferHomeTrains", type: "json" },
    ],
  },
  {
    name: "helpful_information",
    type: "base",
    schema: [
      { id: "project_field", name: "project", type: "relation", required: true, unique: true, options: { collectionId: "projects", maxSelect: 1 } },
      { id: "localEmergency", name: "localEmergency", type: "text" },
      { id: "nearestEmbassy", name: "nearestEmbassy", type: "text" },
      { id: "travelInsurance", name: "travelInsurance", type: "text" },
      { id: "airlineCustomerService", name: "airlineCustomerService", type: "text" },
      { id: "localMedicalClinic", name: "localMedicalClinic", type: "text" },
      { id: "transportContacts", name: "transportContacts", type: "text" },
    ],
  },
];

async function setupPocketBase() {
  console.log(`🔧 Setting up PocketBase collections at ${PB_URL}`);

  let token;

  try {
    // Login as admin
    console.log('\n📝 Logging in as admin...');
    const authResponse = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: PB_ADMIN_EMAIL,
        password: PB_ADMIN_PASSWORD,
      }),
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(`Auth failed: ${JSON.stringify(error)}`);
    }

    const authData = await authResponse.json();
    token = authData.token;
    console.log('✅ Logged in successfully');

    // Check existing collections
    console.log('\n🔍 Checking existing collections...');
    const listResponse = await fetch(`${PB_URL}/api/collections`, {
      headers: { 'Authorization': token },
    });

    const existingData = await listResponse.json();
    const existingCollections = new Set(existingData.items?.map(c => c.name) || []);
    console.log(`Found ${existingCollections.size} existing collections`);

    // Create collections
    console.log('\n📦 Creating collections...');
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const collection of collections) {
      if (existingCollections.has(collection.name)) {
        console.log(`  ⊙ ${collection.name} - already exists, skipping`);
        skipped++;
        continue;
      }

      try {
        const response = await fetch(`${PB_URL}/api/collections`, {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(collection),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(JSON.stringify(error));
        }

        const result = await response.json();
        console.log(`  ✅ ${collection.name} - created (ID: ${result.id})`);
        created++;
      } catch (error) {
        console.error(`  ❌ ${collection.name} - failed: ${error.message}`);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⊙ Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);

    if (created > 0) {
      console.log('\n🎉 Setup complete! You can now use the application.');
    } else if (skipped > 0 && errors === 0) {
      console.log('\n✨ All collections already exist. No action needed.');
    } else {
      console.log('\n⚠️ Setup completed with errors. Check the messages above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupPocketBase();
