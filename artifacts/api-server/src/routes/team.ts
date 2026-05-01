import { Router, type IRouter } from "express";
import { db, teamMembersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { GetTeamMemberParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/team", async (_req, res): Promise<void> => {
  const members = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.isActive, true))
    .orderBy(asc(teamMembersTable.name));
  res.json(members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    phone: m.phone ?? null,
    email: m.email ?? null,
    avatarUrl: m.avatarUrl ?? null,
    isActive: m.isActive,
  })));
});

router.get("/team/:id", async (req, res): Promise<void> => {
  const params = GetTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.id, params.data.id));

  if (!member) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }

  res.json({
    id: member.id,
    name: member.name,
    role: member.role,
    phone: member.phone ?? null,
    email: member.email ?? null,
    avatarUrl: member.avatarUrl ?? null,
    isActive: member.isActive,
  });
});

export default router;
