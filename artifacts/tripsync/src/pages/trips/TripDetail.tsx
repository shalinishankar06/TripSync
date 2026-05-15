import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetTrip,
  useGetTripSummary,
  useDeleteTrip,
  getListTripsQueryKey,
  getGetTripQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Calendar, Users, Wallet, Map, CheckSquare, Receipt, BarChart3, Trash2, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import TripItinerary from "./TripItinerary";
import TripExpenses from "./TripExpenses";
import TripBudget from "./TripBudget";
import TripTasks from "./TripTasks";
import TripMembers from "./TripMembers";

export default function TripDetail() {
  const params = useParams<{ id: string }>();
  const tripId = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [converterOpen, setConverterOpen] = useState(false);

  const { data: trip, isLoading } = useGetTrip(tripId, {
    query: { enabled: !!tripId, queryKey: getGetTripQueryKey(tripId) },
  });
  const { data: summary } = useGetTripSummary(tripId, {
    query: { enabled: !!tripId, queryKey: ["trips", tripId, "summary"] as const },
  });
  const deleteTrip = useDeleteTrip();

  const handleDelete = () => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    deleteTrip.mutate(
      { id: tripId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
          toast({ title: "Trip deleted" });
          setLocation("/trips");
        },
        onError: () => toast({ title: "Error", description: "Failed to delete trip.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground mb-4">Trip not found.</p>
        <Button asChild variant="outline"><Link href="/trips">Back to Trips</Link></Button>
      </div>
    );
  }

  const daysCount = Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const budgetPct = summary ? Math.min(summary.budgetUsedPct, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Currency Converter Sheet */}
      <Sheet open={converterOpen} onOpenChange={setConverterOpen}>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Currency Converter
            </SheetTitle>
          </SheetHeader>
          <CurrencyConverter defaultFrom={trip.currency} />
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <div
  className="relative rounded-xl overflow-hidden h-48 flex items-end bg-cover bg-center"
  style={{
    backgroundImage: `url(${trip.coverImage})`,
  }}
>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative p-6 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <Button variant="ghost" size="sm" asChild className="text-white/80 hover:text-white mb-2 -ml-2">
                <Link href="/trips">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  All Trips
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-white">{trip.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-sm">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{trip.destination}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(trip.startDate), "MMM d")} – {format(new Date(trip.endDate), "MMM d, yyyy")}
                  <span className="ml-1 text-white/60">({daysCount} days)</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConverterOpen(true)}
                className="text-white/80 hover:text-white border border-white/20 hover:bg-white/10"
                data-testid="button-open-converter"
              >
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                Convert
              </Button>
              <Badge variant={trip.status === "active" ? "default" : "secondary"} className="capitalize">
                {trip.status}
              </Badge>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={handleDelete} data-testid="button-delete-trip">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Wallet className="h-3.5 w-3.5" />Budget</div>
            <div className="text-xl font-bold">{trip.currency} {trip.budget.toLocaleString()}</div>
            <Progress value={budgetPct} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">{budgetPct}% spent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Receipt className="h-3.5 w-3.5" />Spent</div>
            <div className="text-xl font-bold">{trip.currency} {(summary?.totalSpent ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{trip.currency} {(summary?.remaining ?? trip.budget).toLocaleString()} remaining</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" />Members</div>
            <div className="text-xl font-bold">{summary?.memberCount ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">travelers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckSquare className="h-3.5 w-3.5" />Tasks</div>
            <div className="text-xl font-bold">{summary?.pendingTaskCount ?? "—"} pending</div>
            <div className="text-xs text-muted-foreground mt-1">{summary?.taskCount ?? 0} total</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="itinerary">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="itinerary" data-testid="tab-itinerary">
            <Map className="h-4 w-4 mr-1.5" />Itinerary
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <Receipt className="h-4 w-4 mr-1.5" />Expenses
          </TabsTrigger>
          <TabsTrigger value="budget" data-testid="tab-budget">
            <BarChart3 className="h-4 w-4 mr-1.5" />Budget
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckSquare className="h-4 w-4 mr-1.5" />Tasks
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="h-4 w-4 mr-1.5" />Members
          </TabsTrigger>
        </TabsList>
        <TabsContent value="itinerary" className="mt-4"><TripItinerary tripId={tripId} trip={trip} /></TabsContent>
        <TabsContent value="expenses" className="mt-4"><TripExpenses tripId={tripId} trip={trip} /></TabsContent>
        <TabsContent value="budget" className="mt-4"><TripBudget tripId={tripId} trip={trip} /></TabsContent>
        <TabsContent value="tasks" className="mt-4"><TripTasks tripId={tripId} /></TabsContent>
        <TabsContent value="members" className="mt-4"><TripMembers tripId={tripId} /></TabsContent>
      </Tabs>
    </div>
  );
}
