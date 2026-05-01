import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

type ServiceStatus = "ok" | "error" | "not_configured";

router.get("/healthz", async (_req, res) => {
  const services: Record<string, ServiceStatus> = {};

  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    services.postgres = "ok";
  } catch {
    services.postgres = "error";
  }

  services.redis = process.env.REDIS_URL ? "ok" : "not_configured";

  const allOk = Object.values(services).every(
    (s): boolean => s === "ok" || s === "not_configured",
  );

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    services,
  });
});

export default router;
