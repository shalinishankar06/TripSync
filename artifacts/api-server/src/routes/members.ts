import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tripMembersTable } from "@workspace/db";
import {
  ListTripMembersParams,
  ListTripMembersResponse,
  AddTripMemberParams,
  AddTripMemberBody,
  RemoveTripMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeMember(m: typeof tripMembersTable.$inferSelect) {
  return {
    ...m,
    joinedAt: m.joinedAt.toISOString(),
  };
}

router.get("/trips/:id/members", async (req, res): Promise<void> => {
  const params = ListTripMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db
    .select()
    .from(tripMembersTable)
    .where(eq(tripMembersTable.tripId, params.data.id))
    .orderBy(tripMembersTable.joinedAt);
  res.json(ListTripMembersResponse.parse(members.map(serializeMember)));
});

router.post("/trips/:id/members", async (req, res): Promise<void> => {
  const params = AddTripMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddTripMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .insert(tripMembersTable)
    .values({ ...parsed.data, tripId: params.data.id })
    .returning();
  res.status(201).json(serializeMember(member));
});

router.delete("/trips/:tripId/members/:memberId", async (req, res): Promise<void> => {
  const params = RemoveTripMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const memberId = parseInt(raw, 10);
  const [member] = await db
    .delete(tripMembersTable)
    .where(and(eq(tripMembersTable.tripId, params.data.tripId), eq(tripMembersTable.id, memberId)))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
