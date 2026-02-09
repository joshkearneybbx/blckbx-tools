import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import type { FullItinerary } from "@shared/schema";
import logoUrl from "@assets/blckbx-logo.png";

export default function EditItinerary() {
  const [, params] = useRoute("/itinerary/edit/:id");
  const id = params?.id || "";

  const { data, isLoading, error } = useQuery<FullItinerary>({
    queryKey: ["/api/itineraries", id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" data-testid="loader-edit" />
          <p className="text-lg text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Itinerary Not Found</h1>
          <p className="text-muted-foreground">
            We couldn't load this itinerary for editing.
          </p>
          <Link href="/itinerary">
            <Button data-testid="button-back-home">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { itinerary, travelDetails, travellers, outboundTravel, accommodations, activities, dining, additionalTravel, returnTravel, helpfulInformation } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/itinerary">
                <img
                  src={logoUrl}
                  alt="BlckBx"
                  className="h-12 w-auto cursor-pointer hover-elevate active-elevate-2 rounded p-1"
                  data-testid="img-logo"
                />
              </Link>
              <div>
                <h1 className="text-xl font-serif font-semibold">Edit Itinerary</h1>
                <p className="text-sm text-muted-foreground">{itinerary.title}</p>
              </div>
            </div>
            
            <Link href={`/itinerary/${itinerary.customUrlSlug}`}>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-preview">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="travel">Travel</TabsTrigger>
            <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
            <TabsTrigger value="info">Information</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Core itinerary details and consultant information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Title</p>
                  <p className="text-lg">{itinerary.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">URL Slug</p>
                  <p className="text-sm font-mono text-muted-foreground">{itinerary.customUrlSlug}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Travel Assistant</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {itinerary.assistantName}</p>
                    <p><span className="font-medium">Email:</span> {itinerary.assistantEmail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {travelDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Travel Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {travelDetails.dates && <p><span className="font-medium">Dates:</span> {travelDetails.dates}</p>}
                  {travelDetails.location && <p><span className="font-medium">Location:</span> {travelDetails.location}</p>}
                  {travelDetails.weather && <p><span className="font-medium">Weather:</span> {travelDetails.weather}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Travellers ({travellers.length})</CardTitle>
                <CardDescription>
                  Traveller information and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {travellers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No travellers added yet</p>
                ) : (
                  <div className="space-y-2">
                    {travellers.map((traveller) => (
                      <div key={traveller.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{traveller.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {traveller.type === 'adult' ? 'Adult' : 'Child'}
                            {traveller.ageAtTravel && ` (Age: ${traveller.ageAtTravel})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            {outboundTravel && (
              <Card>
                <CardHeader>
                  <CardTitle>Outbound Travel</CardTitle>
                  <CardDescription>Transfer to airport, flight, and transfer to accommodation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {outboundTravel.flightNumber && (
                    <div>
                      <p className="font-medium mb-2">Flight Details</p>
                      <p>Flight: {outboundTravel.flightNumber}</p>
                      {(outboundTravel.departureAirport || outboundTravel.departureTime) && (
                        <p>Departure: {outboundTravel.departureAirport} {outboundTravel.departureTime && `at ${outboundTravel.departureTime}`}</p>
                      )}
                      {(outboundTravel.arrivalAirport || outboundTravel.arrivalTime) && (
                        <p>Arrival: {outboundTravel.arrivalAirport} {outboundTravel.arrivalTime && `at ${outboundTravel.arrivalTime}`}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {additionalTravel && additionalTravel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Travel ({additionalTravel.length})</CardTitle>
                  <CardDescription>Ferries, trains, and other transportation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {additionalTravel.map((travel) => (
                      <div key={travel.id} className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium capitalize">{travel.travelType}</p>
                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          {travel.travelType === 'car' && (
                            <>
                              {travel.vehicleDetails && <p>Vehicle: {travel.vehicleDetails}</p>}
                              {travel.vehicleRegistration && <p>Registration: {travel.vehicleRegistration}</p>}
                            </>
                          )}
                          {travel.travelType === 'flight' && (
                            <>
                              {travel.flightNumber && <p>Flight: {travel.flightNumber}</p>}
                              {travel.flightDepartureAirport && <p>From: {travel.flightDepartureAirport}</p>}
                              {travel.flightArrivalAirport && <p>To: {travel.flightArrivalAirport}</p>}
                            </>
                          )}
                          {travel.travelType === 'ferry' && (
                            <>
                              {travel.ferryDepartingFrom && <p>From: {travel.ferryDepartingFrom}</p>}
                              {travel.ferryDestination && <p>To: {travel.ferryDestination}</p>}
                              {travel.ferryDate && <p>Date: {travel.ferryDate}</p>}
                            </>
                          )}
                          {travel.travelType === 'train' && (
                            <>
                              {travel.trainDepartingFrom && <p>From: {travel.trainDepartingFrom}</p>}
                              {travel.trainDestination && <p>To: {travel.trainDestination}</p>}
                              {travel.trainDate && <p>Date: {travel.trainDate}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {returnTravel && (
              <Card>
                <CardHeader>
                  <CardTitle>Return Travel</CardTitle>
                  <CardDescription>Return flight and transfer home</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {returnTravel.flightNumber && (
                    <div>
                      <p className="font-medium mb-2">Return Flight</p>
                      <p>Flight: {returnTravel.flightNumber}</p>
                      {(returnTravel.departureAirport || returnTravel.departureTime) && (
                        <p>Departure: {returnTravel.departureAirport} {returnTravel.departureTime && `at ${returnTravel.departureTime}`}</p>
                      )}
                      {(returnTravel.arrivalAirport || returnTravel.arrivalTime) && (
                        <p>Arrival: {returnTravel.arrivalAirport} {returnTravel.arrivalTime && `at ${returnTravel.arrivalTime}`}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="accommodation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accommodations ({accommodations.length})</CardTitle>
                <CardDescription>
                  Hotels, villas, and other lodging options
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accommodations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No accommodations added yet</p>
                ) : (
                  <div className="space-y-4">
                    {accommodations.map((accom) => (
                      <div key={accom.id} className="p-4 rounded-lg border bg-card">
                        <p className="font-semibold text-lg mb-2">{accom.name}</p>
                        {accom.address && <p className="text-sm text-muted-foreground">{accom.address}</p>}
                        {accom.checkInDetails && (
                          <p className="text-sm text-muted-foreground mt-2">{accom.checkInDetails}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experiences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activities ({activities.length})</CardTitle>
                <CardDescription>
                  Tours, excursions, and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activities added yet</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <p className="font-semibold">{activity.name}</p>
                          {activity.price && <span className="text-primary font-semibold">{activity.price}</span>}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dining ({dining.length})</CardTitle>
                <CardDescription>
                  Restaurant recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dining.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No dining options added yet</p>
                ) : (
                  <div className="space-y-4">
                    {dining.map((restaurant) => (
                      <div key={restaurant.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{restaurant.name}</p>
                            {restaurant.cuisineType && <p className="text-sm text-muted-foreground">{restaurant.cuisineType}</p>}
                          </div>
                          {restaurant.priceRange && <span className="text-primary font-semibold">{restaurant.priceRange}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            {helpfulInformation ? (
              <Card>
                <CardHeader>
                  <CardTitle>Helpful Information</CardTitle>
                  <CardDescription>
                    Emergency contacts and important information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {helpfulInformation.localEmergency && (
                      <div>
                        <p className="font-medium text-sm mb-1">Local Emergency</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.localEmergency}</p>
                      </div>
                    )}
                    {helpfulInformation.nearestEmbassy && (
                      <div>
                        <p className="font-medium text-sm mb-1">Nearest Embassy</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.nearestEmbassy}</p>
                      </div>
                    )}
                    {helpfulInformation.travelInsurance && (
                      <div>
                        <p className="font-medium text-sm mb-1">Travel Insurance</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.travelInsurance}</p>
                      </div>
                    )}
                    {helpfulInformation.airlineCustomerService && (
                      <div>
                        <p className="font-medium text-sm mb-1">Airline Customer Service</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.airlineCustomerService}</p>
                      </div>
                    )}
                    {helpfulInformation.localMedicalClinic && (
                      <div>
                        <p className="font-medium text-sm mb-1">Local Medical Clinic</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.localMedicalClinic}</p>
                      </div>
                    )}
                    {helpfulInformation.transportContacts && (
                      <div>
                        <p className="font-medium text-sm mb-1">Transport Contacts</p>
                        <p className="text-sm text-muted-foreground">{helpfulInformation.transportContacts}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No helpful information added yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-muted/50">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              To add or edit sections, use the form wizard (coming soon)
            </p>
            <p className="text-sm text-muted-foreground">
              For now, you can view all sections and preview your itinerary
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
