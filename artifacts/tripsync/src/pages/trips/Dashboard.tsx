import { useListTrips } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Plane, MapPin, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data, isLoading } = useListTrips();

  const apiData = data as any;

  const trips = Array.isArray(apiData)
    ? apiData
    : Array.isArray(apiData?.trips)
    ? apiData.trips
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
          <p className="text-muted-foreground">
            Manage your upcoming and past adventures.
          </p>
        </div>

        <Button asChild>
          <Link href="/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 bg-muted animate-pulse" />

              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>

              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Plane className="h-8 w-8 text-primary" />
          </div>

          <CardTitle className="text-xl mb-2">
            No trips planned yet
          </CardTitle>

          <CardDescription className="mb-6 max-w-sm">
            Start planning your next adventure. Invite friends, build
            itineraries, and track expenses together.
          </CardDescription>

          <Button asChild>
            <Link href="/trips/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Trip
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip: any) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="hover-elevate cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 group h-full flex flex-col">
                <div className="h-32 bg-muted relative overflow-hidden">
                  {trip.coverImage ? (
                    <img
                      src={trip.coverImage}
                      alt={trip.destination}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/80 to-accent flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-white opacity-50" />
                    </div>
                  )}

                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={
                        trip.status === "planning"
                          ? "secondary"
                          : trip.status === "active"
                          ? "default"
                          : "outline"
                      }
                      className="shadow-sm"
                    >
                      {trip.status
                        ? trip.status.charAt(0).toUpperCase() +
                          trip.status.slice(1)
                        : "Unknown"}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                    {trip.name || "Untitled Trip"}
                  </CardTitle>

                  <CardDescription className="flex items-center text-sm">
                    <MapPin className="mr-1 h-3 w-3 shrink-0" />

                    <span className="line-clamp-1">
                      {trip.destination || "Unknown Destination"}
                    </span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 flex-1">
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 shrink-0" />

                      <span>
                        {trip.startDate && trip.endDate
                          ? `${format(
                              new Date(trip.startDate),
                              "MMM d"
                            )} - ${format(
                              new Date(trip.endDate),
                              "MMM d, yyyy"
                            )}`
                          : "Dates not set"}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <Wallet className="mr-2 h-4 w-4 shrink-0" />

                      <span>
                        Budget: {trip.currency || "$"}{" "}
                        {trip.budget
                          ? Number(trip.budget).toLocaleString()
                          : "0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}