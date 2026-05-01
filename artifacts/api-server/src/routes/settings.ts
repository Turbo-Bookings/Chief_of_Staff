import { Router, type IRouter } from "express";
import { db, featureFlagsTable, principalTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const FLAG_NAMES = ["shadowTeamEnabled", "twilioEnabled", "autoBriefingEnabled", "voiceMemoEnabled"] as const;

async function getFlags(): Promise<Record<string, boolean>> {
  const flags = await db.select().from(featureFlagsTable);
  const result: Record<string, boolean> = {
    shadowTeamEnabled: false,
    twilioEnabled: false,
    autoBriefingEnabled: false,
    voiceMemoEnabled: false,
  };
  for (const flag of flags) {
    result[flag.name] = flag.enabled;
  }
  return result;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const [principal] = await db.select().from(principalTable).limit(1);
  const flags = await getFlags();

  res.json({
    flags: {
      shadowTeamEnabled: flags.shadowTeamEnabled ?? false,
      twilioEnabled: flags.twilioEnabled ?? false,
      autoBriefingEnabled: flags.autoBriefingEnabled ?? false,
      voiceMemoEnabled: flags.voiceMemoEnabled ?? false,
    },
    principalName: principal?.name ?? null,
    principalPhone: principal?.phone ?? null,
  });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { flags } = parsed.data;

  if (flags) {
    for (const flagName of FLAG_NAMES) {
      const value = flags[flagName];
      if (value !== undefined && value !== null) {
        const [existing] = await db
          .select()
          .from(featureFlagsTable)
          .where(eq(featureFlagsTable.name, flagName));

        if (existing) {
          await db
            .update(featureFlagsTable)
            .set({ enabled: value })
            .where(eq(featureFlagsTable.name, flagName));
        } else {
          await db.insert(featureFlagsTable).values({ name: flagName, enabled: value });
        }
      }
    }
  }

  const [principal] = await db.select().from(principalTable).limit(1);
  const updatedFlags = await getFlags();

  res.json({
    flags: {
      shadowTeamEnabled: updatedFlags.shadowTeamEnabled ?? false,
      twilioEnabled: updatedFlags.twilioEnabled ?? false,
      autoBriefingEnabled: updatedFlags.autoBriefingEnabled ?? false,
      voiceMemoEnabled: updatedFlags.voiceMemoEnabled ?? false,
    },
    principalName: principal?.name ?? null,
    principalPhone: principal?.phone ?? null,
  });
});

export default router;
