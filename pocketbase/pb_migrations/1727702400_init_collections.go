package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	"github.com/pocketbase/pocketbase/models"
)

// initCollections creates all the necessary collections for BLCK BX
func initCollections(dao *daos.DAO) error {
	// Define all collections
	collections := []struct {
		Name      string
		Type      string
		Schema    []map[string]any
		Options   map[string]any
	}{
		{
			Name: "projects",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "user_field",
					"name":        "user",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "users", "maxSelect": 1},
				},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "customUrlSlug", "name": "customUrlSlug", "type": "text", "unique": true},
				{"id": "projectType", "name": "projectType", "type": "select", "options": map[string]any{"values": []string{"itinerary", "list"}}, "default": "itinerary"},
				{"id": "status", "name": "status", "type": "select", "options": map[string]any{"values": []string{"draft", "published"}}, "default": "draft"},
				{"id": "isTemplate", "name": "isTemplate", "type": "bool", "default": false},
				{"id": "templateName", "name": "templateName", "type": "text"},
				{"id": "templateDescription", "name": "templateDescription", "type": "text"},
				{"id": "assistantName", "name": "assistantName", "type": "text", "required": true},
				{"id": "assistantEmail", "name": "assistantEmail", "type": "email", "required": true},
				{"id": "outboundTravelVisible", "name": "outboundTravelVisible", "type": "bool", "default": true},
				{"id": "returnTravelVisible", "name": "returnTravelVisible", "type": "bool", "default": true},
				{"id": "helpfulInfoVisible", "name": "helpfulInfoVisible", "type": "bool", "default": true},
				{"id": "coverImage", "name": "coverImage", "type": "file", "options": map[string]any{"maxSelect": 1, "maxSize": 5242880}},
			},
		},
		{
			Name: "destinations",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "dates", "name": "dates", "type": "text"},
				{"id": "location", "name": "location", "type": "text"},
				{"id": "weather", "name": "weather", "type": "text"},
				{"id": "weatherUrl", "name": "weatherUrl", "type": "url"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
			},
		},
		{
			Name: "travellers",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "type", "name": "type", "type": "select", "options": map[string]any{"values": []string{"adult", "child"}}, "required": true, "default": "adult"},
				{"id": "ageAtTravel", "name": "ageAtTravel", "type": "number"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
			},
		},
		{
			Name: "outbound_travel",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"unique":      true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "transferToAirportType", "name": "transferToAirportType", "type": "select", "options": map[string]any{"values": []string{"none", "taxi", "train"}}, "default": "none"},
				{"id": "transferToAirportCompany", "name": "transferToAirportCompany", "type": "text"},
				{"id": "transferToAirportContact", "name": "transferToAirportContact", "type": "text"},
				{"id": "transferToAirportCollectionTime", "name": "transferToAirportCollectionTime", "type": "text"},
				{"id": "transferToAirportPickupLocation", "name": "transferToAirportPickupLocation", "type": "text"},
				{"id": "transferToAirportPaymentStatus", "name": "transferToAirportPaymentStatus", "type": "text"},
				{"id": "transferToAirportTaxis", "name": "transferToAirportTaxis", "type": "json"},
				{"id": "transferToAirportTrains", "name": "transferToAirportTrains", "type": "json"},
				{"id": "flightNumber", "name": "flightNumber", "type": "text"},
				{"id": "flightDate", "name": "flightDate", "type": "text"},
				{"id": "departureAirport", "name": "departureAirport", "type": "text"},
				{"id": "arrivalAirport", "name": "arrivalAirport", "type": "text"},
				{"id": "departureTime", "name": "departureTime", "type": "text"},
				{"id": "arrivalTime", "name": "arrivalTime", "type": "text"},
				{"id": "passengersSeats", "name": "passengersSeats", "type": "text"},
				{"id": "thingsToRemember", "name": "thingsToRemember", "type": "text"},
				{"id": "isMultiLeg", "name": "isMultiLeg", "type": "bool", "default": false},
				{"id": "legs", "name": "legs", "type": "json"},
				{"id": "transferToAccomType", "name": "transferToAccomType", "type": "select", "options": map[string]any{"values": []string{"none", "taxi", "train"}}, "default": "none"},
				{"id": "transferToAccomCompany", "name": "transferToAccomCompany", "type": "text"},
				{"id": "transferToAccomContact", "name": "transferToAccomContact", "type": "text"},
				{"id": "transferToAccomCollectionTime", "name": "transferToAccomCollectionTime", "type": "text"},
				{"id": "transferToAccomPickupLocation", "name": "transferToAccomPickupLocation", "type": "text"},
				{"id": "transferToAccomPaymentStatus", "name": "transferToAccomPaymentStatus", "type": "text"},
				{"id": "transferToAccomTaxis", "name": "transferToAccomTaxis", "type": "json"},
				{"id": "transferToAccomTrains", "name": "transferToAccomTrains", "type": "json"},
			},
		},
		{
			Name: "accommodations",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "destination", "name": "destination", "type": "relation", "options": map[string]any{"collectionId": "destinations", "maxSelect": 1}},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "address", "name": "address", "type": "text"},
				{"id": "googleMapsLink", "name": "googleMapsLink", "type": "url"},
				{"id": "checkInDetails", "name": "checkInDetails", "type": "text"},
				{"id": "bookingReference", "name": "bookingReference", "type": "text"},
				{"id": "websiteUrl", "name": "websiteUrl", "type": "url"},
				{"id": "contactInfo", "name": "contactInfo", "type": "text"},
				{"id": "images", "name": "images", "type": "json"},
				{"id": "notes", "name": "notes", "type": "text"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
				{"id": "visible", "name": "visible", "type": "bool", "default": true},
				{"id": "sourceUrl", "name": "sourceUrl", "type": "url"},
				{"id": "sourceType", "name": "sourceType", "type": "select", "options": map[string]any{"values": []string{"manual", "autofill", "ai_suggested"}}, "default": "manual"},
			},
		},
		{
			Name: "activities",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "destination", "name": "destination", "type": "relation", "options": map[string]any{"collectionId": "destinations", "maxSelect": 1}},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "description", "name": "description", "type": "text"},
				{"id": "price", "name": "price", "type": "text"},
				{"id": "contactDetails", "name": "contactDetails", "type": "text"},
				{"id": "address", "name": "address", "type": "text"},
				{"id": "googleMapsLink", "name": "googleMapsLink", "type": "url"},
				{"id": "websiteUrl", "name": "websiteUrl", "type": "url"},
				{"id": "images", "name": "images", "type": "json"},
				{"id": "notes", "name": "notes", "type": "text"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
				{"id": "visible", "name": "visible", "type": "bool", "default": true},
				{"id": "sourceUrl", "name": "sourceUrl", "type": "url"},
				{"id": "sourceType", "name": "sourceType", "type": "select", "options": map[string]any{"values": []string{"manual", "autofill", "ai_suggested"}}, "default": "manual"},
			},
		},
		{
			Name: "dining",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "destination", "name": "destination", "type": "relation", "options": map[string]any{"collectionId": "destinations", "maxSelect": 1}},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "cuisineType", "name": "cuisineType", "type": "text"},
				{"id": "priceRange", "name": "priceRange", "type": "text"},
				{"id": "contactDetails", "name": "contactDetails", "type": "text"},
				{"id": "address", "name": "address", "type": "text"},
				{"id": "googleMapsLink", "name": "googleMapsLink", "type": "url"},
				{"id": "websiteUrl", "name": "websiteUrl", "type": "url"},
				{"id": "images", "name": "images", "type": "json"},
				{"id": "notes", "name": "notes", "type": "text"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
				{"id": "visible", "name": "visible", "type": "bool", "default": true},
				{"id": "sourceUrl", "name": "sourceUrl", "type": "url"},
				{"id": "sourceType", "name": "sourceType", "type": "select", "options": map[string]any{"values": []string{"manual", "autofill", "ai_suggested"}}, "default": "manual"},
			},
		},
		{
			Name: "bars",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "destination", "name": "destination", "type": "relation", "options": map[string]any{"collectionId": "destinations", "maxSelect": 1}},
				{"id": "name", "name": "name", "type": "text", "required": true},
				{"id": "barType", "name": "barType", "type": "text"},
				{"id": "priceRange", "name": "priceRange", "type": "text"},
				{"id": "contactDetails", "name": "contactDetails", "type": "text"},
				{"id": "address", "name": "address", "type": "text"},
				{"id": "googleMapsLink", "name": "googleMapsLink", "type": "url"},
				{"id": "websiteUrl", "name": "websiteUrl", "type": "url"},
				{"id": "images", "name": "images", "type": "json"},
				{"id": "notes", "name": "notes", "type": "text"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
				{"id": "visible", "name": "visible", "type": "bool", "default": true},
				{"id": "sourceUrl", "name": "sourceUrl", "type": "url"},
				{"id": "sourceType", "name": "sourceType", "type": "select", "options": map[string]any{"values": []string{"manual", "autofill", "ai_suggested"}}, "default": "manual"},
			},
		},
		{
			Name: "inter_destination_travel",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "travelType", "name": "travelType", "type": "select", "options": map[string]any{"values": []string{"car", "flight", "ferry", "train"}}, "required": true},
				{"id": "vehicleDetails", "name": "vehicleDetails", "type": "text"},
				{"id": "vehicleRegistration", "name": "vehicleRegistration", "type": "text"},
				{"id": "carContactDetails", "name": "carContactDetails", "type": "text"},
				{"id": "carBookingDetails", "name": "carBookingDetails", "type": "text"},
				{"id": "flightNumber", "name": "flightNumber", "type": "text"},
				{"id": "flightDate", "name": "flightDate", "type": "text"},
				{"id": "flightDepartureAirport", "name": "flightDepartureAirport", "type": "text"},
				{"id": "flightArrivalAirport", "name": "flightArrivalAirport", "type": "text"},
				{"id": "flightDepartureTime", "name": "flightDepartureTime", "type": "text"},
				{"id": "flightArrivalTime", "name": "flightArrivalTime", "type": "text"},
				{"id": "flightPassengersSeats", "name": "flightPassengersSeats", "type": "text"},
				{"id": "flightThingsToRemember", "name": "flightThingsToRemember", "type": "text"},
				{"id": "flightIsMultiLeg", "name": "flightIsMultiLeg", "type": "bool", "default": false},
				{"id": "flightLegs", "name": "flightLegs", "type": "json"},
				{"id": "ferryDepartingFrom", "name": "ferryDepartingFrom", "type": "text"},
				{"id": "ferryDestination", "name": "ferryDestination", "type": "text"},
				{"id": "ferryDate", "name": "ferryDate", "type": "text"},
				{"id": "ferryPrice", "name": "ferryPrice", "type": "text"},
				{"id": "ferryContactDetails", "name": "ferryContactDetails", "type": "text"},
				{"id": "ferryAdditionalNotes", "name": "ferryAdditionalNotes", "type": "text"},
				{"id": "ferryBookingReference", "name": "ferryBookingReference", "type": "text"},
				{"id": "trainDepartingFrom", "name": "trainDepartingFrom", "type": "text"},
				{"id": "trainDestination", "name": "trainDestination", "type": "text"},
				{"id": "trainDate", "name": "trainDate", "type": "text"},
				{"id": "trainPrice", "name": "trainPrice", "type": "text"},
				{"id": "trainContactDetails", "name": "trainContactDetails", "type": "text"},
				{"id": "trainAdditionalNotes", "name": "trainAdditionalNotes", "type": "text"},
				{"id": "trainBookingReference", "name": "trainBookingReference", "type": "text"},
				{"id": "displayOrder", "name": "displayOrder", "type": "number", "default": 0},
				{"id": "visible", "name": "visible", "type": "bool", "default": true},
			},
		},
		{
			Name: "return_travel",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"unique":      true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "transferToAirportType", "name": "transferToAirportType", "type": "select", "options": map[string]any{"values": []string{"none", "taxi", "train"}}, "default": "none"},
				{"id": "transferToAirportCompany", "name": "transferToAirportCompany", "type": "text"},
				{"id": "transferToAirportContact", "name": "transferToAirportContact", "type": "text"},
				{"id": "transferToAirportCollectionTime", "name": "transferToAirportCollectionTime", "type": "text"},
				{"id": "transferToAirportPickupLocation", "name": "transferToAirportPickupLocation", "type": "text"},
				{"id": "transferToAirportPaymentStatus", "name": "transferToAirportPaymentStatus", "type": "text"},
				{"id": "transferToAirportTaxis", "name": "transferToAirportTaxis", "type": "json"},
				{"id": "transferToAirportTrains", "name": "transferToAirportTrains", "type": "json"},
				{"id": "flightNumber", "name": "flightNumber", "type": "text"},
				{"id": "flightDate", "name": "flightDate", "type": "text"},
				{"id": "departureAirport", "name": "departureAirport", "type": "text"},
				{"id": "arrivalAirport", "name": "arrivalAirport", "type": "text"},
				{"id": "departureTime", "name": "departureTime", "type": "text"},
				{"id": "arrivalTime", "name": "arrivalTime", "type": "text"},
				{"id": "passengersSeats", "name": "passengersSeats", "type": "text"},
				{"id": "thingsToRemember", "name": "thingsToRemember", "type": "text"},
				{"id": "isMultiLeg", "name": "isMultiLeg", "type": "bool", "default": false},
				{"id": "legs", "name": "legs", "type": "json"},
				{"id": "transferHomeType", "name": "transferHomeType", "type": "select", "options": map[string]any{"values": []string{"none", "taxi", "train"}}, "default": "none"},
				{"id": "transferHomeCompany", "name": "transferHomeCompany", "type": "text"},
				{"id": "transferHomeContact", "name": "transferHomeContact", "type": "text"},
				{"id": "transferHomeCollectionTime", "name": "transferHomeCollectionTime", "type": "text"},
				{"id": "transferHomePickupLocation", "name": "transferHomePickupLocation", "type": "text"},
				{"id": "transferHomePaymentStatus", "name": "transferHomePaymentStatus", "type": "text"},
				{"id": "transferHomeTaxis", "name": "transferHomeTaxis", "type": "json"},
				{"id": "transferHomeTrains", "name": "transferHomeTrains", "type": "json"},
			},
		},
		{
			Name: "helpful_information",
			Type: "base",
			Schema: []map[string]any{
				{
					"id":          "project_field",
					"name":        "project",
					"type":        "relation",
					"required":    true,
					"unique":      true,
					"options":     map[string]any{"collectionId": "projects", "maxSelect": 1},
				},
				{"id": "localEmergency", "name": "localEmergency", "type": "text"},
				{"id": "nearestEmbassy", "name": "nearestEmbassy", "type": "text"},
				{"id": "travelInsurance", "name": "travelInsurance", "type": "text"},
				{"id": "airlineCustomerService", "name": "airlineCustomerService", "type": "text"},
				{"id": "localMedicalClinic", "name": "localMedicalClinic", "type": "text"},
				{"id": "transportContacts", "name": "transportContacts", "type": "text"},
			},
		},
	}

	// Create each collection
	for _, col := range collections {
		collection := &models.Collection{}
		collection.SetName(col.Name)
		collection.SetType(col.Type)
		collection.SetSchema(col.Schema)

		// Set default options
		if col.Options != nil {
			collection.SetOptions(col.Options)
		}

		// Save the collection
		if err := dao.SaveCollection(collection); err != nil {
			return err
		}
	}

	return nil
}
