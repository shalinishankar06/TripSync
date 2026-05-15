import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, itineraryItemsTable } from "@workspace/db";
import {
  ListItineraryItemsParams,
  ListItineraryItemsResponse,
  CreateItineraryItemParams,
  CreateItineraryItemBody,
  UpdateItineraryItemParams,
  UpdateItineraryItemBody,
  UpdateItineraryItemResponse,
  DeleteItineraryItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeItem(item: typeof itineraryItemsTable.$inferSelect) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
  };
}

router.get("/trips/:id/itinerary", async (req, res): Promise<void> => {
  const params = ListItineraryItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const items = await db
    .select()
    .from(itineraryItemsTable)
    .where(eq(itineraryItemsTable.tripId, params.data.id))
    .orderBy(itineraryItemsTable.day, itineraryItemsTable.sortOrder);
  res.json(ListItineraryItemsResponse.parse(items.map(serializeItem)));
});

router.post("/trips/:id/itinerary", async (req, res): Promise<void> => {
  const params = CreateItineraryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateItineraryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(itineraryItemsTable)
    .values({ ...parsed.data, tripId: params.data.id })
    .returning();
  res.status(201).json(serializeItem(item));
});

router.patch("/itinerary/:id", async (req, res): Promise<void> => {
  const params = UpdateItineraryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateItineraryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(itineraryItemsTable)
    .set(parsed.data)
    .where(eq(itineraryItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Itinerary item not found" });
    return;
  }
  res.json(UpdateItineraryItemResponse.parse(serializeItem(item)));
});

router.delete("/itinerary/:id", async (req, res): Promise<void> => {
  const params = DeleteItineraryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(itineraryItemsTable)
    .where(eq(itineraryItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Itinerary item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
