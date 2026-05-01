import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

type ServiceStatus = "ok" | "error" | "not_configured";

async function getHealthPayload() {
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

  return { status: allOk ? "ok" : "degraded", services };
}

router.get("/health", async (_req, res) => {
  const payload = await getHealthPayload();
  res.status(payload.status === "ok" ? 200 : 503).json(payload);
});

router.get("/healthz", async (_req, res) => {
  const payload = await getHealthPayload();
  res.status(payload.status === "ok" ? 200 : 503).json(payload);
});

export default router;
