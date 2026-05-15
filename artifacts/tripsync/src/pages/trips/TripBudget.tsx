import {
  useGetTripExpenseAnalytics,
  useGetTripSummary,
  getGetTripExpenseAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const CATEGORY_COLORS = ["#1a56db", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#6b7280"];

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: "Accommodation",
  food: "Food & Drink",
  transport: "Transport",
  activities: "Activities",
  shopping: "Shopping",
  other: "Other",
};

interface Props {
  tripId: number;
  trip: { budget: number; currency: string };
}

export default function TripBudget({ tripId, trip }: Props) {
  const { data: analytics, isLoading } = useGetTripExpenseAnalytics(tripId, {
    query: { enabled: !!tripId, queryKey: getGetTripExpenseAnalyticsQueryKey(tripId) },
  });
  const { data: summary } = useGetTripSummary(tripId, {
    query: { enabled: !!tripId, queryKey: ["trips", tripId, "summary"] as const },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const budgetPct = summary ? Math.min(summary.budgetUsedPct, 100) : 0;
  const isOverBudget = summary ? summary.totalSpent > summary.totalBudget : false;

  const pieData = (analytics?.byCategory ?? []).map((c) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    value: c.amount,
  }));

  const barData = (analytics?.byPerson ?? []).map((p) => ({
    name: p.name.split(" ")[0],
    Paid: p.paid,
    Owes: p.owes,
  }));

  return (
    <div className="space-y-5">
      {/* Budget Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{trip.currency} {trip.budget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Budget</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
                {trip.currency} {(analytics?.totalSpent ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Spent</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${isOverBudget ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                {trip.currency} {Math.max(0, trip.budget - (analytics?.totalSpent ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{isOverBudget ? "Over budget!" : "Remaining"}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{budgetPct}% used</span>
              {isOverBudget && <span className="text-destructive font-medium">Over budget!</span>}
            </div>
            <Progress value={budgetPct} className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`} />
          </div>
        </CardContent>
      </Card>

      {(analytics?.byCategory.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No expense data yet. Add expenses to see analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Category Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${trip.currency} ${v.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {analytics?.byCategory.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    </div>
                    <span className="font-medium">{trip.currency} {c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-person Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Per-Person Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${trip.currency} ${v.toFixed(2)}`} />
                  <Bar dataKey="Paid" fill="#1a56db" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Owes" fill="#f97316" radius={[3, 3, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {analytics?.byPerson.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Paid <strong className="text-foreground">{trip.currency} {p.paid.toFixed(2)}</strong></span>
                      <span>Owes <strong className="text-foreground">{trip.currency} {p.owes.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
