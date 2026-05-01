import { Router, type IRouter } from "express";
import { db, briefingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateBriefingForDate } from "../lib/briefingGenerator";

const router: IRouter = Router();

router.get("/briefing/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;

  const [existing] = await db
    .select()
    .from(briefingsTable)
    .where(eq(briefingsTable.date, today));

  if (existing) {
    res.json({
      id: existing.id,
      date: existing.date,
      markdown: existing.markdown,
      generatedAt: existing.generatedAt.toISOString(),
      openTasksCount: existing.openTasksCount ?? null,
      escalationCount: existing.escalationCount ?? null,
    });
    return;
  }

  try {
    const briefing = await generateBriefingForDate(today);
    res.json({
      id: briefing.id,
      date: briefing.date,
      markdown: briefing.markdown,
      generatedAt: briefing.generatedAt.toISOString(),
      openTasksCount: briefing.openTasksCount ?? null,
      escalationCount: briefing.escalationCount ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ error: "Failed to generate briefing" });
  }
});

router.post("/briefing/today/regenerate", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;
  try {
    const briefing = await generateBriefingForDate(today);
    res.json({
      id: briefing.id,
      date: briefing.date,
      markdown: briefing.markdown,
      generatedAt: briefing.generatedAt.toISOString(),
      openTasksCount: briefing.openTasksCount ?? null,
      escalationCount: briefing.escalationCount ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate briefing");
    res.status(500).json({ error: "Failed to regenerate briefing" });
  }
});

export default router;
