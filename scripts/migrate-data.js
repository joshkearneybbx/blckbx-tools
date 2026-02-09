#!/usr/bin/env node

/**
 * BLCK BX Data Migration Script
 *
 * Exports data from Replit PostgreSQL to JSON files for PocketBase import
 *
 * Usage:
 *   1. Set DATABASE_URL environment variable to your Replit PostgreSQL
 *   2. Run: node scripts/migrate-data.js
 *   3. Import generated JSON files to PocketBase
 */

import { neon, neonConfig, neonInt } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create database connection
const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// Output directory
const OUTPUT_DIR = './migrations/data';

import fs from 'fs';
import path from 'path';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to convert database record to PocketBase format
function toPocketBaseFormat(tableName, record) {
  const pbRecord = { ...record };

  // Remove id field - PocketBase generates its own
  delete pbRecord.id;

  // Convert date fields to ISO strings
  const dateFields = ['createdAt', 'updatedAt', 'expire', 'flightDate', 'trainDate', 'ferryDate'];
  dateFields.forEach(field => {
    if (pbRecord[field]) {
      pbRecord[field] = new Date(pbRecord[field]).toISOString();
    }
  });

  // Convert integer boolean fields (0/1 to true/false)
  const booleanFields = [
    'isTemplate', 'outboundTravelVisible', 'returnTravelVisible', 'helpfulInfoVisible',
    'transferToAirportTaxiBooked', 'transferToAccomTaxiBooked',
    'isMultiLeg', 'visible', 'isRequired', 'isGlobal'
  ];
  booleanFields.forEach(field => {
    if (pbRecord[field] !== undefined) {
      pbRecord[field] = pbRecord[field] === 1;
    }
  });

  // Rename userId to user for PocketBase relation
  if (pbRecord.userId) {
    pbRecord.user = pbRecord.userId;
    delete pbRecord.userId;
  }

  // Rename itineraryId to project for PocketBase relation
  if (pbRecord.itineraryId) {
    pbRecord.project = pbRecord.itineraryId;
    delete pbRecord.itineraryId;
  }

  // Rename title to name
  if (pbRecord.title) {
    pbRecord.name = pbRecord.title;
    delete pbRecord.title;
  }

  // Handle status field - convert 'published'/'draft'/'template' to appropriate values
  if (tableName === 'itineraries') {
    // Keep status as-is for now, but handle template status
    if (pbRecord.isTemplate) {
      pbRecord.status = 'template';
    }
  }

  // Convert images array if it's stored as comma-separated string
  if (pbRecord.images && typeof pbRecord.images === 'string') {
    pbRecord.images = pbRecord.images.split(',').filter(Boolean);
  }

  // Convert legs/transfer JSONB fields
  const jsonFields = ['legs', 'transferToAirportTaxis', 'transferToAirportTrains',
                     'transferToAccomTaxis', 'transferToAccomTrains',
                     'transferHomeTaxis', 'transferHomeTrains',
                     'flightLegs', 'ferryLegs'];
  jsonFields.forEach(field => {
    if (pbRecord[field] && typeof pbRecord[field] === 'string') {
      try {
        pbRecord[field] = JSON.parse(pbRecord[field]);
      } catch (e) {
        console.warn(`Failed to parse ${field} as JSON:`, e);
      }
    }
  });

  return pbRecord;
}

// Helper to save JSON file
function saveJSON(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✓ Exported: ${filename} (${data.length} records)`);
}

// Map old table names to PocketBase collection names
const TABLE_MAPPING = {
  'users': 'users',
  'itineraries': 'projects',
  'travel_details': 'destinations', // Will need to create destinations from this
  'travellers': 'travellers',
  'outbound_travel': 'outbound_travel',
  'return_travel': 'return_travel',
  'additional_travel': 'inter_destination_travel',
  'accommodations': 'accommodations',
  'activities': 'activities',
  'dining': 'dining',
  'bars': 'bars',
  'helpful_information': 'helpful_information',
  'custom_sections': 'custom_sections',
  'custom_fields': 'custom_fields',
  'custom_section_items': 'custom_section_items',
  'custom_field_values': 'custom_field_values'
};

// ID mapping for foreign key relationships
const ID_MAPPING = {
  users: {},      // old_id -> new_id
  itineraries: {}, // old_id -> new_id
  destinations: {},
  custom_sections: {},
  custom_section_items: {},
  custom_fields: {}
};

async function migrateUsers() {
  console.log('\n📦 Exporting users...');

  const users = await db.select().from(schema.users);

  const transformed = users.map(u => toPocketBaseFormat('users', u));

  // Save for reference
  saveJSON('01_users.json', transformed);

  // Build ID mapping
  users.forEach(u => {
    ID_MAPPING.users[u.id] = u.id; // Will be updated after PocketBase import
  });

  return transformed;
}

async function migrateItineraries() {
  console.log('\n📦 Exporting itineraries (projects)...');

  const itineraries = await db.select().from(schema.itineraries);

  const transformed = itineraries.map(i => toPocketBaseFormat('itineraries', i));

  saveJSON('02_projects.json', transformed);

  itineraries.forEach(i => {
    ID_MAPPING.itineraries[i.id] = i.id;
  });

  return transformed;
}

async function migrateTravelDetails() {
  console.log('\n📦 Exporting travel_details (destinations)...');

  const details = await db.select().from(schema.travelDetails);

  const transformed = details.map(d => ({
    ...toPocketBaseFormat('travel_details', d),
    name: d.location || 'Destination',
    displayOrder: d.displayOrder || 0
  }));

  saveJSON('03_destinations.json', transformed);

  details.forEach(d => {
    ID_MAPPING.destinations[d.id] = d.id;
  });

  return transformed;
}

async function migrateTravellers() {
  console.log('\n📦 Exporting travellers...');
  const travellers = await db.select().from(schema.travellers);
  const transformed = travellers.map(t => toPocketBaseFormat('travellers', t));
  saveJSON('04_travellers.json', transformed);
  return transformed;
}

async function migrateOutboundTravel() {
  console.log('\n📦 Exporting outbound_travel...');
  const travel = await db.select().from(schema.outboundTravel);
  const transformed = travel.map(t => toPocketBaseFormat('outbound_travel', t));
  saveJSON('05_outbound_travel.json', transformed);
  return transformed;
}

async function migrateReturnTravel() {
  console.log('\n📦 Exporting return_travel...');
  const travel = await db.select().from(schema.returnTravel);
  const transformed = travel.map(t => toPocketBaseFormat('return_travel', t));
  saveJSON('06_return_travel.json', transformed);
  return transformed;
}

async function migrateAdditionalTravel() {
  console.log('\n📦 Exporting additional_travel (inter_destination_travel)...');
  const travel = await db.select().from(schema.additionalTravel);
  const transformed = travel.map(t => toPocketBaseFormat('additional_travel', t));
  saveJSON('07_inter_destination_travel.json', transformed);
  return transformed;
}

async function migrateAccommodations() {
  console.log('\n📦 Exporting accommodations...');
  const items = await db.select().from(schema.accommodations);
  const transformed = items.map(i => toPocketBaseFormat('accommodations', i));
  saveJSON('08_accommodations.json', transformed);
  return transformed;
}

async function migrateActivities() {
  console.log('\n📦 Exporting activities...');
  const items = await db.select().from(schema.activities);
  const transformed = items.map(i => toPocketBaseFormat('activities', i));
  saveJSON('09_activities.json', transformed);
  return transformed;
}

async function migrateDining() {
  console.log('\n📦 Exporting dining...');
  const items = await db.select().from(schema.dining);
  const transformed = items.map(i => toPocketBaseFormat('dining', i));
  saveJSON('10_dining.json', transformed);
  return transformed;
}

async function migrateBars() {
  console.log('\n📦 Exporting bars...');
  try {
    const items = await db.select().from(schema.bars);
    const transformed = items.map(i => toPocketBaseFormat('bars', i));
    saveJSON('11_bars.json', transformed);
    return transformed;
  } catch (e) {
    console.log('  ⚠ Bars table may not exist yet, skipping...');
    return [];
  }
}

async function migrateHelpfulInformation() {
  console.log('\n📦 Exporting helpful_information...');
  const info = await db.select().from(schema.helpfulInformation);
  const transformed = info.map(i => toPocketBaseFormat('helpful_information', i));
  saveJSON('12_helpful_information.json', transformed);
  return transformed;
}

async function migrateCustomSections() {
  console.log('\n📦 Exporting custom_sections...');
  const sections = await db.select().from(schema.customSections);
  const transformed = sections.map(s => toPocketBaseFormat('custom_sections', s));
  saveJSON('13_custom_sections.json', transformed);

  sections.forEach(s => {
    ID_MAPPING.custom_sections[s.id] = s.id;
  });

  return transformed;
}

async function migrateCustomFields() {
  console.log('\n📦 Exporting custom_fields...');
  const fields = await db.select().from(schema.customFields);
  const transformed = fields.map(f => toPocketBaseFormat('custom_fields', f));
  saveJSON('14_custom_fields.json', transformed);

  fields.forEach(f => {
    ID_MAPPING.custom_fields[f.id] = f.id;
  });

  return transformed;
}

async function migrateCustomSectionItems() {
  console.log('\n📦 Exporting custom_section_items...');
  const items = await db.select().from(schema.customSectionItems);
  const transformed = items.map(i => toPocketBaseFormat('custom_section_items', i));
  saveJSON('15_custom_section_items.json', transformed);

  items.forEach(i => {
    ID_MAPPING.custom_section_items[i.id] = i.id;
  });

  return transformed;
}

async function migrateCustomFieldValues() {
  console.log('\n📦 Exporting custom_field_values...');
  const values = await db.select().from(schema.customFieldValues);
  const transformed = values.map(v => toPocketBaseFormat('custom_field_values', v));
  saveJSON('16_custom_field_values.json', transformed);
  return transformed;
}

async function createIDMappingReport() {
  console.log('\n📊 Creating ID mapping report...');

  const report = {
    timestamp: new Date().toISOString(),
    mapping: ID_MAPPING,
    instructions: `
After importing data to PocketBase:

1. Import users first and note the new PocketBase IDs
2. Update the ID mapping with new PocketBase IDs
3. Re-export data with updated foreign keys
4. Import remaining collections in order:
   - 01_users.json
   - 02_projects.json (update user field with new IDs)
   - 03_destinations.json (update project field)
   - 04_travellers.json
   - 05_outbound_travel.json
   - 06_return_travel.json
   - 07_inter_destination_travel.json
   - 08_accommodations.json
   - 09_activities.json
   - 10_dining.json
   - 11_bars.json
   - 12_helpful_information.json
   - 13_custom_sections.json
   - 14_custom_fields.json
   - 15_custom_section_items.json
   - 16_custom_field_values.json
    `
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'id_mapping_report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('✓ ID mapping report saved');
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting BLCK BX data migration from PostgreSQL to JSON');
  console.log(`Output directory: ${OUTPUT_DIR}`);

  try {
    await migrateUsers();
    await migrateItineraries();
    await migrateTravelDetails();
    await migrateTravellers();
    await migrateOutboundTravel();
    await migrateReturnTravel();
    await migrateAdditionalTravel();
    await migrateAccommodations();
    await migrateActivities();
    await migrateDining();
    await migrateBars();
    await migrateHelpfulInformation();
    await migrateCustomSections();
    await migrateCustomFields();
    await migrateCustomSectionItems();
    await migrateCustomFieldValues();

    await createIDMappingReport();

    console.log('\n✅ Migration complete!');
    console.log(`\n📁 Data exported to: ${OUTPUT_DIR}/`);
    console.log('\n📝 Next steps:');
    console.log('1. Review the exported JSON files');
    console.log('2. Import to PocketBase using the Admin UI or API');
    console.log('3. Update foreign key relationships after import');
    console.log('4. Test the migrated data');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
