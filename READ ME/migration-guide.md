# BLCK BX Data Migration Guide

## Overview

This guide walks you through migrating data from your Replit PostgreSQL database to the new PocketBase setup.

---

## Method 1: Using Replit's Built-in Export (Easiest)

### Step 1: Export Data from Replit

1. Go to your Replit project
2. Open the Shell in Replit
3. Run this command to export all data to JSON:

```bash
# Export all tables to JSON files
mkdir -p export_data

# Export users
psql $DATABASE_URL -c "SELECT * FROM users" > export_data/users.csv

# Export itineraries (projects)
psql $DATABASE_URL -c "SELECT * FROM itineraries" > export_data/itineraries.csv

# Export all related tables
psql $DATABASE_URL -c "SELECT * FROM travel_details" > export_data/travel_details.csv
psql $DATABASE_URL -c "SELECT * FROM travellers" > export_data/travellers.csv
psql $DATABASE_URL -c "SELECT * FROM outbound_travel" > export_data/outbound_travel.csv
psql $DATABASE_URL -c "SELECT * FROM return_travel" > export_data/return_travel.csv
psql $DATABASE_URL -c "SELECT * FROM additional_travel" > export_data/additional_travel.csv
psql $DATABASE_URL -c "SELECT * FROM accommodations" > export_data/accommodations.csv
psql $DATABASE_URL -c "SELECT * FROM activities" > export_data/activities.csv
psql $DATABASE_URL -c "SELECT * FROM dining" > export_data/dining.csv
psql $DATABASE_URL -c "SELECT * FROM helpful_information" > export_data/helpful_information.csv
psql $DATABASE_URL -c "SELECT * FROM custom_sections" > export_data/custom_sections.csv
psql $DATABASE_URL -c "SELECT * FROM custom_fields" > export_data/custom_fields.csv
psql $DATABASE_URL -c "SELECT * FROM custom_section_items" > export_data/custom_section_items.csv
psql $DATABASE_URL -c "SELECT * FROM custom_field_values" > export_data/custom_field_values.csv
```

4. Download the `export_data` folder from Replit (right-click → Download)

---

## Method 2: Using pgAdmin or Database Client

### Step 1: Connect to Your Neon/Replit Database

1. Get your `DATABASE_URL` from Replit environment variables
2. Use a tool like:
   - **pgAdmin** (desktop app)
   - **TablePlus** (desktop app)
   - **DBeaver** (desktop app)
   - **Postico** (Mac only)

### Step 2: Export Each Table

For each table, export as **CSV** or **JSON**:

| Table | Export As |
|-------|----------|
| users | users.json |
| itineraries | projects.json |
| travel_details | destinations.json |
| travellers | travellers.json |
| outbound_travel | outbound_travel.json |
| return_travel | return_travel.json |
| additional_travel | inter_destination_travel.json |
| accommodations | accommodations.json |
| activities | activities.json |
| dining | dining.json |
| helpful_information | helpful_information.json |
| custom_sections | custom_sections.json |
| custom_fields | custom_fields.json |
| custom_section_items | custom_section_items.json |
| custom_field_values | custom_field_values.json |

---

## Import to PocketBase

### Option A: Using PocketBase Admin UI (Small Datasets)

1. Go to `https://pocketbase.blckbx.co.uk/_/`
2. Login as admin
3. For each collection:
   - Click on the collection name
   - Click "Import records" (or "New record" → "Import")
   - Upload the JSON file
   - Map fields if needed

**Import Order:**
```
1. users
2. projects (itineraries)
3. destinations (travel_details)
4. travellers
5. outbound_travel
6. return_travel
7. inter_destination_travel
8. accommodations
9. activities
10. dining
11. helpful_information
12. custom_sections
13. custom_fields
14. custom_section_items
15. custom_field_values
```

### Option B: Using PocketBase Python Script (Large Datasets)

Create `scripts/import-to-pocketbase.py`:

```python
import pocketbase
import json
import os

PB_URL = "https://pocketbase.blckbx.co.uk"
PB_ADMIN_EMAIL = "admin@blckbx.co.uk"
PB_ADMIN_PASSWORD = "your-password"

DATA_DIR = "./export_data"

# Initialize PocketBase
pb = pocketbase.PocketBase(PB_URL)

# Login as admin
pb.admins.auth_with_password(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)

def import_collection(collection_name, filename):
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filename}")
        return

    with open(filepath, 'r') as f:
        records = json.load(f)

    print(f"\n📦 Importing {collection_name}...")

    for i, record in enumerate(records):
        try:
            # Transform record if needed
            transformed = transform_record(collection_name, record)
            pb.collection(collection_name).create(transformed)
            print(f"  ✓ Imported {i+1}/{len(records)}")
        except Exception as e:
            print(f"  ✗ Failed to import record {i+1}: {e}")

def transform_record(collection_name, record):
    """Transform PostgreSQL record to PocketBase format"""
    result = record.copy()

    # Remove id - PocketBase generates its own
    result.pop('id', None)

    # Rename fields for PocketBase
    if 'userId' in result:
        result['user'] = result.pop('userId')

    if 'itineraryId' in result:
        result['project'] = result.pop('itineraryId')

    if 'title' in result:
        result['name'] = result.pop('title')

    # Convert integer booleans
    for field in ['isTemplate', 'visible', 'isRequired', 'isGlobal']:
        if field in result and isinstance(result[field], int):
            result[field] = result[field] == 1

    return result

# Import in order
collections = [
    ("users", "users.json"),
    ("projects", "itineraries.json"),
    ("destinations", "travel_details.json"),
    ("travellers", "travellers.json"),
    ("outbound_travel", "outbound_travel.json"),
    ("return_travel", "return_travel.json"),
    ("inter_destination_travel", "additional_travel.json"),
    ("accommodations", "accommodations.json"),
    ("activities", "activities.json"),
    ("dining", "dining.json"),
    ("helpful_information", "helpful_information.json"),
    ("custom_sections", "custom_sections.json"),
    ("custom_fields", "custom_fields.json"),
    ("custom_section_items", "custom_section_items.json"),
    ("custom_field_values", "custom_field_values.json"),
]

for collection, filename in collections:
    import_collection(collection, filename)

print("\n✅ Import complete!")
```

Run with:
```bash
pip install pocketbase
python scripts/import-to-pocketbase.py
```

---

## Field Mapping Reference

### itineraries → projects

| PostgreSQL | PocketBase | Notes |
|------------|------------|-------|
| id | (auto-generated) | Don't include |
| userId | user | Foreign key |
| title | name | Renamed |
| status | status | Keep as-is |
| isTemplate | isTemplate | Convert 0/1 to false/true |
| customUrlSlug | customUrlSlug | Keep as-is |
| assistantName | assistantName | Keep as-is |
| assistantEmail | assistantEmail | Keep as-is |

### travel_details → destinations

| PostgreSQL | PocketBase | Notes |
|------------|------------|-------|
| id | (auto-generated) | Don't include |
| itineraryId | project | Foreign key |
| location | name | Use location as name |
| dates | dates | Keep as-is |
| weather | weather | Keep as-is |

### Common Conversions

- **Integer booleans**: `0` → `false`, `1` → `true`
- **Date strings**: Keep as string or convert to ISO format
- **Array fields**: May need to split comma-separated strings
- **JSONB fields**: Parse to JSON objects

---

## Post-Migration Tasks

### 1. Verify Foreign Keys

After import, verify that relationships are correct:

```javascript
// In PocketBase UI or API
const projects = await pb.collection('projects').getFullList({
  filter: 'user != ""'
});

projects.forEach(project => {
  console.log(`Project ${project.name} -> User: ${project.user}`);
});
```

### 2. Update User Passwords

Users from Replit won't have passwords in PocketBase. Users need to:
1. Go to the login page
2. Click "Forgot password"
3. Reset their password

### 3. Verify URL Slugs

Check that customUrlSlug values are unique:

```javascript
const slugs = await pb.collection('projects').getFullList({
  fields: 'customUrlSlug'
});
```

### 4. Test Itinerary Viewing

1. Pick a published itinerary
2. Try to view it at `/itinerary/{customUrlSlug}`
3. Verify all related data loads correctly

---

## Troubleshooting

### Issue: "Foreign key constraint failed"

**Cause**: Trying to import child records before parent records exist.

**Solution**: Import in the correct order (users → projects → related tables)

### Issue: "Duplicate key error"

**Cause**: Records already exist in PocketBase.

**Solution**: Either delete existing records or use "upsert" instead of "create"

### Issue: "Field not found"

**Cause**: Field name mismatch between PostgreSQL and PocketBase.

**Solution**: Check the field mapping reference above and rename fields in JSON before import

### Issue: "Invalid boolean value"

**Cause**: Integer 0/1 instead of boolean true/false.

**Solution**: Use the transform_record function in the Python script to convert

---

## Quick Reference: Export SQL Commands

```sql
-- Quick export of all tables to CSV (run in Replit shell)
\copy users TO 'users.csv' WITH CSV HEADER
\copy itineraries TO 'itineraries.csv' WITH CSV HEADER
\copy travel_details TO 'travel_details.csv' WITH CSV HEADER
\copy travellers TO 'travellers.csv' WITH CSV HEADER
\copy outbound_travel TO 'outbound_travel.csv' WITH CSV HEADER
\copy return_travel TO 'return_travel.csv' WITH CSV HEADER
\copy additional_travel TO 'additional_travel.csv' WITH CSV HEADER
\copy accommodations TO 'accommodations.csv' WITH CSV HEADER
\copy activities TO 'activities.csv' WITH CSV HEADER
\copy dining TO 'dining.csv' WITH CSV HEADER
\copy helpful_information TO 'helpful_information.csv' WITH CSV HEADER
\copy custom_sections TO 'custom_sections.csv' WITH CSV HEADER
\copy custom_fields TO 'custom_fields.csv' WITH CSV HEADER
\copy custom_section_items TO 'custom_section_items.csv' WITH CSV HEADER
\copy custom_field_values TO 'custom_field_values.csv' WITH CSV HEADER
```

---

## Need Help?

If you encounter issues:

1. **Check the data**: Open the exported JSON/CSV files to verify the structure
2. **Check PocketBase logs**: Go to `/api/logs` in your PocketBase instance
3. **Test with one record**: Import just one record first to test the mapping
4. **Use the migration script**: The Node.js script in `scripts/migrate-data.js` handles transformations automatically
