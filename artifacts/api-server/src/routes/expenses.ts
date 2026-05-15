import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, expensesTable, tripMembersTable } from "@workspace/db";
import {
  ListExpensesParams,
  ListExpensesResponse,
  CreateExpenseParams,
  CreateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseBody,
  UpdateExpenseResponse,
  DeleteExpenseParams,
  GetTripBalancesParams,
  GetTripBalancesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: parseFloat(String(e.amount)),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/trips/:id/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.tripId, params.data.id))
    .orderBy(expensesTable.createdAt);
  res.json(ListExpensesResponse.parse(expenses.map(serializeExpense)));
});

router.post("/trips/:id/expenses", async (req, res): Promise<void> => {
  const params = CreateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [expense] = await db
    .insert(expensesTable)
    .values({ ...parsed.data, tripId: params.data.id })
    .returning();
  res.status(201).json(serializeExpense(expense));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [expense] = await db
    .update(expensesTable)
    .set(parsed.data)
    .where(eq(expensesTable.id, params.data.id))
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(UpdateExpenseResponse.parse(serializeExpense(expense)));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [expense] = await db
    .delete(expensesTable)
    .where(eq(expensesTable.id, params.data.id))
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.sendStatus(204);
});

// ── BALANCES ──────────────────────────────────────────────────────────────────
router.get("/trips/:id/balances", async (req, res): Promise<void> => {
  const params = GetTripBalancesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tripId = params.data.id;
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.tripId, tripId));
  const members = await db.select().from(tripMembersTable).where(eq(tripMembersTable.tripId, tripId));

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
  const memberCount = members.length || 1;
  const equalShare = totalSpent / memberCount;

  const payerMap: Record<string, number> = {};
  for (const m of members) payerMap[m.name] = 0;
  for (const e of expenses) {
    if (payerMap[e.paidBy] === undefined) payerMap[e.paidBy] = 0;
    payerMap[e.paidBy] += parseFloat(String(e.amount));
  }

  const balances = Object.entries(payerMap).map(([name, paid]) => ({
    name,
    paid,
    owes: equalShare,
    balance: paid - equalShare,
  }));

  res.json(GetTripBalancesResponse.parse(balances));
});

export default router;
