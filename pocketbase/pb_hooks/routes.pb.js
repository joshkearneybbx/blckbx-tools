/// <reference path="../pb_data/types.d.ts" />

// Helper function to get all records for a project
function getProjectRecords(projectId) {
  const destinations = $app.dao().findRecordsByFilter(
    "destinations",
    "project = {:projectId}",
    "-displayOrder",
    0, 50,
    { projectId: projectId }
  );

  const travellers = $app.dao().findRecordsByFilter(
    "travellers",
    "project = {:projectId}",
    "displayOrder",
    0, 50,
    { projectId: projectId }
  );

  const accommodations = $app.dao().findRecordsByFilter(
    "accommodations",
    "project = {:projectId}",
    "displayOrder",
    0, 100,
    { projectId: projectId }
  );

  const activities = $app.dao().findRecordsByFilter(
    "activities",
    "project = {:projectId}",
    "displayOrder",
    0, 100,
    { projectId: projectId }
  );

  const dining = $app.dao().findRecordsByFilter(
    "dining",
    "project = {:projectId}",
    "displayOrder",
    0, 100,
    { projectId: projectId }
  );

  const bars = $app.dao().findRecordsByFilter(
    "bars",
    "project = {:projectId}",
    "displayOrder",
    0, 100,
    { projectId: projectId }
  );

  const additionalTravel = $app.dao().findRecordsByFilter(
    "additional_travel",
    "project = {:projectId}",
    "displayOrder",
    0, 50,
    { projectId: projectId }
  );

  // Get outbound travel (single record or null)
  let outboundTravel = null;
  try {
    outboundTravel = $app.dao().findFirstRecordByFilter(
      "outbound_travel",
      "project = {:projectId}",
      { projectId: projectId }
    );
  } catch (e) {
    // No outbound travel found
  }

  // Get return travel (single record or null)
  let returnTravel = null;
  try {
    returnTravel = $app.dao().findFirstRecordByFilter(
      "return_travel",
      "project = {:projectId}",
      { projectId: projectId }
    );
  } catch (e) {
    // No return travel found
  }

  // Get helpful information (single record or null)
  let helpfulInfo = null;
  try {
    helpfulInfo = $app.dao().findFirstRecordByFilter(
      "helpful_information",
      "project = {:projectId}",
      { projectId: projectId }
    );
  } catch (e) {
    // No helpful info found
  }

  // Get inter-destination travel
  const interDestinationTravel = $app.dao().findRecordsByFilter(
    "inter_destination_travel",
    "fromDestination.project = {:projectId} || toDestination.project = {:projectId}",
    "displayOrder",
    0, 50,
    { projectId: projectId }
  );

  // Get custom section items
  const customSectionItems = $app.dao().findRecordsByFilter(
    "custom_section_items",
    "project = {:projectId}",
    "displayOrder",
    0, 50,
    { projectId: projectId }
  );

  return {
    destinations: destinations.map(r => r.export()),
    travellers: travellers.map(r => r.export()),
    accommodations: accommodations.map(r => r.export()),
    activities: activities.map(r => r.export()),
    dining: dining.map(r => r.export()),
    bars: bars.map(r => r.export()),
    additionalTravel: additionalTravel.map(r => r.export()),
    outboundTravel: outboundTravel ? outboundTravel.export() : null,
    returnTravel: returnTravel ? returnTravel.export() : null,
    helpfulInformation: helpfulInfo ? helpfulInfo.export() : null,
    interDestinationTravel: interDestinationTravel.map(r => r.export()),
    customSectionItems: customSectionItems.map(r => r.export()),
  };
}

// Public itinerary view by slug (no auth required)
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
  const records = getProjectRecords(project.id);

  return c.json(200, {
    project: project.export(),
    ...records
  });
});

// Get full project data (auth required)
routerAdd("GET", "/api/projects/:id/full", (c) => {
  const authRecord = c.get("authRecord");
  const projectId = c.pathParam("id");

  if (!authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const project = $app.dao().findRecordById("projects", projectId);

  if (!project || project.get("user") !== authRecord.id) {
    return c.json(404, { error: "Project not found" });
  }

  // Fetch all related data
  const records = getProjectRecords(projectId);

  return c.json(200, {
    project: project.export(),
    ...records
  });
}, $apis.requireRecordAuth());

// Auto-fill proxy to n8n
routerAdd("POST", "/api/autofill/extract", (c) => {
  const authRecord = c.get("authRecord");

  if (!authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const data = $apis.requestInfo(c).data;

  if (!data || !data.url) {
    return c.json(400, { success: false, error: "URL is required" });
  }

  try {
    const webhookUrl = $os.getenv("N8N_AUTOFILL_WEBHOOK_URL");

    if (!webhookUrl) {
      return c.json(500, { success: false, error: "Autofill service not configured" });
    }

    const response = $http.send({
      url: webhookUrl,
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

// Duplicate project
routerAdd("POST", "/api/projects/:id/duplicate", (c) => {
  const authRecord = c.get("authRecord");

  if (!authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const projectId = c.pathParam("id");

  const project = $app.dao().findRecordById("projects", projectId);

  if (!project || project.get("user") !== authRecord.id) {
    return c.json(404, { error: "Project not found" });
  }

  // Generate unique slug for duplicate
  const originalName = project.get("name");
  const baseCode = randomCode(4);
  let newSlug = project.get("customUrlSlug") + "-" + baseCode;

  // Ensure uniqueness
  let counter = 1;
  while (true) {
    const existing = $app.dao().findFirstRecordByFilter(
      "projects",
      "customUrlSlug = {:slug}",
      { slug: newSlug }
    );
    if (!existing) break;
    newSlug = project.get("customUrlSlug") + "-" + baseCode + "-" + counter;
    counter++;
  }

  // Create duplicate project
  const collection = $app.dao().findCollectionByNameOrId("projects");
  const newProject = new Record(collection);

  newProject.set("user", authRecord.id);
  newProject.set("name", originalName + " (Copy)");
  newProject.set("customUrlSlug", newSlug);
  newProject.set("projectType", project.get("projectType"));
  newProject.set("status", "draft");
  newProject.set("isTemplate", false);
  newProject.set("assistantName", project.get("assistantName"));
  newProject.set("assistantEmail", project.get("assistantEmail"));
  newProject.set("outboundTravelVisible", project.get("outboundTravelVisible"));
  newProject.set("returnTravelVisible", project.get("returnTravelVisible"));
  newProject.set("helpfulInfoVisible", project.get("helpfulInfoVisible"));

  $app.dao().saveRecord(newProject);

  // Duplicate destinations and their items
  const destinations = $app.dao().findRecordsByFilter(
    "destinations",
    "project = {:projectId}",
    "displayOrder",
    0, 50,
    { projectId: projectId }
  );

  const destinationMap = {};

  for (const dest of destinations) {
    const destCollection = $app.dao().findCollectionByNameOrId("destinations");
    const newDest = new Record(destCollection);

    newDest.set("project", newProject.id);
    newDest.set("name", dest.get("name"));
    newDest.set("dates", dest.get("dates"));
    newDest.set("location", dest.get("location"));
    newDest.set("weather", dest.get("weather"));
    newDest.set("weatherUrl", dest.get("weatherUrl"));
    newDest.set("displayOrder", dest.get("displayOrder"));

    $app.dao().saveRecord(newDest);
    destinationMap[dest.id] = newDest.id;
  }

  // Duplicate travellers
  const travellers = $app.dao().findRecordsByFilter(
    "travellers",
    "project = {:projectId}",
    0, 50,
    { projectId: projectId }
  );

  for (const traveller of travellers) {
    const travellerCollection = $app.dao().findCollectionByNameOrId("travellers");
    const newTraveller = new Record(travellerCollection);

    newTraveller.set("project", newProject.id);
    newTraveller.set("name", traveller.get("name"));
    newTraveller.set("type", traveller.get("type"));
    newTraveller.set("ageAtTravel", traveller.get("ageAtTravel"));
    newTraveller.set("displayOrder", traveller.get("displayOrder"));

    $app.dao().saveRecord(newTraveller);
  }

  // Duplicate accommodations with new destination references
  const accommodations = $app.dao().findRecordsByFilter(
    "accommodations",
    "project = {:projectId}",
    0, 100,
    { projectId: projectId }
  );

  for (const accom of accommodations) {
    const accomCollection = $app.dao().findCollectionByNameOrId("accommodations");
    const newAccom = new Record(accomCollection);

    newAccom.set("project", newProject.id);
    const oldDestId = accom.get("destination");
    newAccom.set("destination", oldDestId && destinationMap[oldDestId] ? destinationMap[oldDestId] : null);
    newAccom.set("name", accom.get("name"));
    newAccom.set("address", accom.get("address"));
    newAccom.set("googleMapsLink", accom.get("googleMapsLink"));
    newAccom.set("checkInDetails", accom.get("checkInDetails"));
    newAccom.set("bookingReference", accom.get("bookingReference"));
    newAccom.set("websiteUrl", accom.get("websiteUrl"));
    newAccom.set("contactInfo", accom.get("contactInfo"));
    newAccom.set("images", accom.get("images"));
    newAccom.set("notes", accom.get("notes"));
    newAccom.set("displayOrder", accom.get("displayOrder"));
    newAccom.set("visible", accom.get("visible"));
    newAccom.set("sourceUrl", accom.get("sourceUrl"));
    newAccom.set("sourceType", accom.get("sourceType"));

    $app.dao().saveRecord(newAccom);
  }

  // Duplicate activities
  const activities = $app.dao().findRecordsByFilter(
    "activities",
    "project = {:projectId}",
    0, 100,
    { projectId: projectId }
  );

  for (const activity of activities) {
    const activityCollection = $app.dao().findCollectionByNameOrId("activities");
    const newActivity = new Record(activityCollection);

    newActivity.set("project", newProject.id);
    const oldDestId = activity.get("destination");
    newActivity.set("destination", oldDestId && destinationMap[oldDestId] ? destinationMap[oldDestId] : null);
    newActivity.set("name", activity.get("name"));
    newActivity.set("description", activity.get("description"));
    newActivity.set("price", activity.get("price"));
    newActivity.set("contactDetails", activity.get("contactDetails"));
    newActivity.set("address", activity.get("address"));
    newActivity.set("googleMapsLink", activity.get("googleMapsLink"));
    newActivity.set("websiteUrl", activity.get("websiteUrl"));
    newActivity.set("images", activity.get("images"));
    newActivity.set("notes", activity.get("notes"));
    newActivity.set("displayOrder", activity.get("displayOrder"));
    newActivity.set("visible", activity.get("visible"));
    newActivity.set("sourceUrl", activity.get("sourceUrl"));
    newActivity.set("sourceType", activity.get("sourceType"));

    $app.dao().saveRecord(newActivity);
  }

  // Duplicate dining
  const dining = $app.dao().findRecordsByFilter(
    "dining",
    "project = {:projectId}",
    0, 100,
    { projectId: projectId }
  );

  for (const d of dining) {
    const diningCollection = $app.dao().findCollectionByNameOrId("dining");
    const newD = new Record(diningCollection);

    newD.set("project", newProject.id);
    const oldDestId = d.get("destination");
    newD.set("destination", oldDestId && destinationMap[oldDestId] ? destinationMap[oldDestId] : null);
    newD.set("name", d.get("name"));
    newD.set("cuisineType", d.get("cuisineType"));
    newD.set("priceRange", d.get("priceRange"));
    newD.set("contactDetails", d.get("contactDetails"));
    newD.set("address", d.get("address"));
    newD.set("googleMapsLink", d.get("googleMapsLink"));
    newD.set("websiteUrl", d.get("websiteUrl"));
    newD.set("images", d.get("images"));
    newD.set("notes", d.get("notes"));
    newD.set("displayOrder", d.get("displayOrder"));
    newD.set("visible", d.get("visible"));
    newD.set("sourceUrl", d.get("sourceUrl"));
    newD.set("sourceType", d.get("sourceType"));

    $app.dao().saveRecord(newD);
  }

  // Duplicate bars
  const bars = $app.dao().findRecordsByFilter(
    "bars",
    "project = {:projectId}",
    0, 100,
    { projectId: projectId }
  );

  for (const bar of bars) {
    const barCollection = $app.dao().findCollectionByNameOrId("bars");
    const newBar = new Record(barCollection);

    newBar.set("project", newProject.id);
    const oldDestId = bar.get("destination");
    newBar.set("destination", oldDestId && destinationMap[oldDestId] ? destinationMap[oldDestId] : null);
    newBar.set("name", bar.get("name"));
    newBar.set("barType", bar.get("barType"));
    newBar.set("priceRange", bar.get("priceRange"));
    newBar.set("contactDetails", bar.get("contactDetails"));
    newBar.set("address", bar.get("address"));
    newBar.set("googleMapsLink", bar.get("googleMapsLink"));
    newBar.set("websiteUrl", bar.get("websiteUrl"));
    newBar.set("images", bar.get("images"));
    newBar.set("notes", bar.get("notes"));
    newBar.set("displayOrder", bar.get("displayOrder"));
    newBar.set("visible", bar.get("visible"));
    newBar.set("sourceUrl", bar.get("sourceUrl"));
    newBar.set("sourceType", bar.get("sourceType"));

    $app.dao().saveRecord(newBar);
  }

  // Duplicate additional travel
  const additionalTravel = $app.dao().findRecordsByFilter(
    "additional_travel",
    "project = {:projectId}",
    0, 50,
    { projectId: projectId }
  );

  for (const travel of additionalTravel) {
    const travelCollection = $app.dao().findCollectionByNameOrId("additional_travel");
    const newTravel = new Record(travelCollection);

    newTravel.set("project", newProject.id);
    newTravel.set("travelType", travel.get("travelType"));
    newTravel.set("vehicleDetails", travel.get("vehicleDetails"));
    newTravel.set("vehicleRegistration", travel.get("vehicleRegistration"));
    newTravel.set("carContactDetails", travel.get("carContactDetails"));
    newTravel.set("carBookingDetails", travel.get("carBookingDetails"));
    newTravel.set("flightNumber", travel.get("flightNumber"));
    newTravel.set("flightDate", travel.get("flightDate"));
    newTravel.set("flightDepartureAirport", travel.get("flightDepartureAirport"));
    newTravel.set("flightArrivalAirport", travel.get("flightArrivalAirport"));
    newTravel.set("flightDepartureTime", travel.get("flightDepartureTime"));
    newTravel.set("flightArrivalTime", travel.get("flightArrivalTime"));
    newTravel.set("flightPassengersSeats", travel.get("flightPassengersSeats"));
    newTravel.set("flightThingsToRemember", travel.get("flightThingsToRemember"));
    newTravel.set("flightIsMultiLeg", travel.get("flightIsMultiLeg"));
    newTravel.set("flightLegs", travel.get("flightLegs"));
    newTravel.set("ferryDepartingFrom", travel.get("ferryDepartingFrom"));
    newTravel.set("ferryDestination", travel.get("ferryDestination"));
    newTravel.set("ferryDate", travel.get("ferryDate"));
    newTravel.set("ferryPrice", travel.get("ferryPrice"));
    newTravel.set("ferryContactDetails", travel.get("ferryContactDetails"));
    newTravel.set("ferryAdditionalNotes", travel.get("ferryAdditionalNotes"));
    newTravel.set("ferryBookingReference", travel.get("ferryBookingReference"));
    newTravel.set("trainDepartingFrom", travel.get("trainDepartingFrom"));
    newTravel.set("trainDestination", travel.get("trainDestination"));
    newTravel.set("trainDate", travel.get("trainDate"));
    newTravel.set("trainPrice", travel.get("trainPrice"));
    newTravel.set("trainContactDetails", travel.get("trainContactDetails"));
    newTravel.set("trainAdditionalNotes", travel.get("trainAdditionalNotes"));
    newTravel.set("trainBookingReference", travel.get("trainBookingReference"));
    newTravel.set("displayOrder", travel.get("displayOrder"));
    newTravel.set("visible", travel.get("visible"));

    $app.dao().saveRecord(newTravel);
  }

  return c.json(200, {
    id: newProject.id,
    name: newProject.get("name"),
    customUrlSlug: newProject.get("customUrlSlug")
  });

}, $apis.requireRecordAuth());
