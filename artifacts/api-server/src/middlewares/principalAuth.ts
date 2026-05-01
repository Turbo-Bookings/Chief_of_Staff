import { type Request, type Response, type NextFunction } from "express";
import { db, principalTable } from "@workspace/db";
import { isNull, or, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";

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

  const [principal] = await db
    .select()
    .from(principalTable)
    .where(
      or(
        eq(principalTable.clerkUserId, userId),
        isNull(principalTable.clerkUserId),
      ),
    )
    .limit(1);

  if (!principal) {
    res.status(403).json({
      error: "Forbidden — no principal account found",
    });
    return;
  }

  if (principal.clerkUserId && principal.clerkUserId !== userId) {
    res.status(403).json({
      error: "Forbidden — authenticated user does not match principal account",
    });
    return;
  }

  req.principal = principal;
  next();
}
