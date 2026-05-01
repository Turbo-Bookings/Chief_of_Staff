import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { captureQueue } from "../lib/queue";

const router: IRouter = Router();

type ServiceStatus = "ok" | "error" | "not_configured";

async function checkPostgres(): Promise<ServiceStatus> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  if (!process.env.REDIS_URL) return "not_configured";
  try {
    if (!captureQueue) return "error";
    await captureQueue.getJobCounts();
    return "ok";
  } catch {
    return "error";
  }
}

async function checkObjectStorage(): Promise<ServiceStatus> {
  if (!process.env.PRIVATE_OBJECT_DIR || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    return "not_configured";
  }
  try {
    const res = await fetch("http://127.0.0.1:1106/credential", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

async function checkAiProxy(): Promise<ServiceStatus> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) return "not_configured";
  return "ok";
}

async function getHealthPayload() {
  const [postgres, redis, objectStorage, aiProxy] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkObjectStorage(),
    checkAiProxy(),
  ]);

  const services: Record<string, ServiceStatus> = {
    postgres,
    redis,
    object_storage: objectStorage,
    ai_proxy: aiProxy,
  };

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

router.get("/api/health", async (_req, res) => {
  const payload = await getHealthPayload();
  res.status(payload.status === "ok" ? 200 : 503).json(payload);
});

export default router;
