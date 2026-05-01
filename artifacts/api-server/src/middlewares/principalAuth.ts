import { type Request, type Response, type NextFunction } from "express";
import { db, principalTable } from "@workspace/db";
import { isNull, eq, and } from "drizzle-orm";
import { getAuth, createClerkClient } from "@clerk/express";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      principal?: typeof principalTable.$inferSelect;
    }
  }
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

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
      error: "Forbidden — this CoS is linked to a different account",
    });
    return;
  }

  let clerkUserEmail: string | undefined;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const primary = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    clerkUserEmail = primary?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  } catch (err) {
    logger.error({ err, userId }, "Failed to fetch Clerk user for email verification");
    res.status(500).json({ error: "Could not verify user identity" });
    return;
  }

  if (!clerkUserEmail || clerkUserEmail.toLowerCase() !== (unclaimedPrincipal.email ?? "").toLowerCase()) {
    logger.warn(
      { userId, clerkUserEmail, principalEmail: unclaimedPrincipal.email },
      "Rejected: authenticated user email does not match principal email",
    );
    res.status(403).json({
      error: "Forbidden — your account is not authorized as the principal for this CoS",
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
      error: "Forbidden — this CoS is linked to a different account",
    });
    return;
  }

  logger.info(
    { userId, principalId: claimed.id, email: clerkUserEmail },
    "Principal account claimed and bound to Clerk user",
  );
  req.principal = claimed;
  next();
}
