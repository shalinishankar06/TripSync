import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, tripsTable, tripMembersTable, itineraryItemsTable, expensesTable, tasksTable } from "@workspace/db";
import {
  CreateTripBody,
  GetTripParams,
  GetTripResponse,
  UpdateTripParams,
  UpdateTripBody,
  UpdateTripResponse,
  DeleteTripParams,
  ListTripsResponse,
  GetTripSummaryParams,
  GetTripSummaryResponse,
  GetTripExpenseAnalyticsParams,
  GetTripExpenseAnalyticsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeTrip(trip: typeof tripsTable.$inferSelect) {
  return {
    ...trip,
    budget: parseFloat(String(trip.budget)),
    createdAt: trip.createdAt.toISOString(),
  };
}

router.get("/trips", async (req, res): Promise<void> => {
  const trips = await db.select().from(tripsTable).orderBy(tripsTable.createdAt);
  res.json(ListTripsResponse.parse(trips.map(serializeTrip)));
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trip] = await db.insert(tripsTable).values(parsed.data).returning();
  res.status(201).json(GetTripResponse.parse(serializeTrip(trip)));
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const params = GetTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, params.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(GetTripResponse.parse(serializeTrip(trip)));
});

router.patch("/trips/:id", async (req, res): Promise<void> => {
  const params = UpdateTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trip] = await db.update(tripsTable).set(parsed.data).where(eq(tripsTable.id, params.data.id)).returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(UpdateTripResponse.parse(serializeTrip(trip)));
});

router.delete("/trips/:id", async (req, res): Promise<void> => {
  const params = DeleteTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db.delete(tripsTable).where(eq(tripsTable.id, params.data.id)).returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.sendStatus(204);
});

// ── TRIP SUMMARY (wow) ────────────────────────────────────────────────────────
router.get("/trips/:id/summary", async (req, res): Promise<void> => {
  const params = GetTripSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tripId = params.data.id;
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const members = await db.select().from(tripMembersTable).where(eq(tripMembersTable.tripId, tripId));
  const itinerary = await db.select().from(itineraryItemsTable).where(eq(itineraryItemsTable.tripId, tripId));
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.tripId, tripId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.tripId, tripId));

  const totalBudget = parseFloat(String(trip.budget));
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
  const remaining = totalBudget - totalSpent;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const pendingTaskCount = tasks.filter((t) => t.status !== "done").length;

  const summary = {
    tripId,
    totalBudget,
    totalSpent,
    remaining,
    budgetUsedPct,
    memberCount: members.length,
    itineraryCount: itinerary.length,
    taskCount: tasks.length,
    pendingTaskCount,
    expenseCount: expenses.length,
  };

  res.json(GetTripSummaryResponse.parse(summary));
});

// ── EXPENSE ANALYTICS (wow) ───────────────────────────────────────────────────
router.get("/trips/:id/expense-analytics", async (req, res): Promise<void> => {
  const params = GetTripExpenseAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tripId = params.data.id;
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.tripId, tripId));
  const members = await db.select().from(tripMembersTable).where(eq(tripMembersTable.tripId, tripId));

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

  // By category
  const categoryMap: Record<string, { amount: number; count: number }> = {};
  for (const e of expenses) {
    if (!categoryMap[e.category]) categoryMap[e.category] = { amount: 0, count: 0 };
    categoryMap[e.category].amount += parseFloat(String(e.amount));
    categoryMap[e.category].count += 1;
  }
  const byCategory = Object.entries(categoryMap).map(([category, { amount, count }]) => ({ category, amount, count }));

  // By person (paidBy)
  const payerMap: Record<string, number> = {};
  for (const e of expenses) {
    if (!payerMap[e.paidBy]) payerMap[e.paidBy] = 0;
    payerMap[e.paidBy] += parseFloat(String(e.amount));
  }
  const memberCount = members.length || 1;
  const equalShare = totalSpent / memberCount;
  const byPerson = Object.entries(payerMap).map(([name, paid]) => ({
    name,
    paid,
    owes: Math.max(0, equalShare - paid),
  }));

  res.json(GetTripExpenseAnalyticsResponse.parse({ tripId, totalSpent, byCategory, byPerson }));
});

export default router;
