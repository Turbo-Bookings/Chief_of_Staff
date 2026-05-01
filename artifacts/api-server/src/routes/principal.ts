import { Router, type IRouter } from "express";
import { db, principalTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function serializePrincipal(p: typeof principalTable.$inferSelect) {
  return {
    id: p.id,
    fullName: p.fullName ?? p.name,
    primaryPhone: p.primaryPhone ?? p.phone ?? null,
    primaryEmail: p.primaryEmail ?? p.email ?? null,
    briefingMorningTime: p.briefingMorningTime ?? "07:00",
    briefingEveningTime: p.briefingEveningTime ?? "18:00",
    timezone: p.timezone,
    killSwitch: p.killSwitch ?? false,
    preferences: (p.preferences as Record<string, unknown>) ?? {},
  };
}

router.get("/principal", async (req, res): Promise<void> => {
  const [principal] = await db.select().from(principalTable).limit(1);

  if (!principal) {
    res.status(404).json({ error: "Principal not found" });
    return;
  }

  res.json(serializePrincipal(principal));
});

router.patch("/principal", async (req, res): Promise<void> => {
  const [principal] = await db.select().from(principalTable).limit(1);

  if (!principal) {
    res.status(404).json({ error: "Principal not found" });
    return;
  }

  const {
    fullName,
    primaryPhone,
    briefingMorningTime,
    briefingEveningTime,
    timezone,
    killSwitch,
    preferences,
  } = req.body as {
    fullName?: string | null;
    primaryPhone?: string | null;
    briefingMorningTime?: string | null;
    briefingEveningTime?: string | null;
    timezone?: string | null;
    killSwitch?: boolean | null;
    preferences?: Record<string, unknown> | null;
  };

  const updates: Partial<typeof principalTable.$inferInsert> = {};

  if (fullName !== undefined && fullName !== null) {
    updates.fullName = fullName;
    updates.name = fullName;
  }
  if (primaryPhone !== undefined) updates.primaryPhone = primaryPhone ?? undefined;
  if (briefingMorningTime !== undefined) updates.briefingMorningTime = briefingMorningTime ?? undefined;
  if (briefingEveningTime !== undefined) updates.briefingEveningTime = briefingEveningTime ?? undefined;
  if (timezone !== undefined && timezone !== null) updates.timezone = timezone;
  if (killSwitch !== undefined && killSwitch !== null) updates.killSwitch = killSwitch;
  if (preferences !== undefined && preferences !== null) updates.preferences = preferences;

  const [updated] = await db
    .update(principalTable)
    .set(updates)
    .where(eq(principalTable.id, principal.id))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Failed to update principal" });
    return;
  }

  res.json(serializePrincipal(updated));
});

export default router;
