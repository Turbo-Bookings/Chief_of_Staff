import { type Request, type Response, type NextFunction } from "express";
import { db, principalTable } from "@workspace/db";
import { isNull, eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      principal?: typeof principalTable.$inferSelect;
    }
  }
}

export async function principalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [principalByClerkId] = await db
    .select()
    .from(principalTable)
    .where(eq(principalTable.clerkUserId, userId))
    .limit(1);

  if (principalByClerkId) {
    req.principal = principalByClerkId;
    return next();
  }

  const [unclaimedPrincipal] = await db
    .select()
    .from(principalTable)
    .where(isNull(principalTable.clerkUserId))
    .limit(1);

  if (!unclaimedPrincipal) {
    logger.warn({ userId }, "Rejected: all principal accounts are claimed by another user");
    res.status(403).json({
      error: "Forbidden — this CoS is linked to a different user account",
    });
    return;
  }

  const [claimed] = await db
    .update(principalTable)
    .set({ clerkUserId: userId })
    .where(and(eq(principalTable.id, unclaimedPrincipal.id), isNull(principalTable.clerkUserId)))
    .returning();

  if (!claimed) {
    logger.warn({ userId }, "Principal claim race — another user claimed principal concurrently");
    res.status(403).json({
      error: "Forbidden — this CoS is linked to a different user account",
    });
    return;
  }

  logger.info({ userId, principalId: claimed.id }, "Principal account claimed and bound to Clerk user");
  req.principal = claimed;
  next();
}
