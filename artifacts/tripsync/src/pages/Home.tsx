import { useEffect } from "react";
import { useListTrips } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: trips, isLoading } = useListTrips();

  useEffect(() => {
    if (trips && trips.length > 0) {
      setLocation("/trips");
    }
  }, [trips, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (trips && trips.length > 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] max-w-md mx-auto text-center space-y-6">
      <div className="bg-primary/10 p-6 rounded-full">
        <Plane className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Your Next Adventure Awaits</h1>
      <p className="text-muted-foreground text-lg">
        Plan trips, manage expenses, and collaborate with your travel group all in one place.
      </p>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/trips/new">
          <Plus className="mr-2 h-5 w-5" />
          Create your first trip
        </Link>
      </Button>
    </div>
  );
}
