import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { validateRequest } from "twilio";
import { randomUUID } from "crypto";
import { db, captureJobsTable, messagesTable, agentActionsLogTable } from "@workspace/db";
import { enqueueCapture } from "../lib/queue";
import { getOrCreatePrincipalThread } from "../lib/captureProcessor";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TWILIO_AUTH_TOKEN_PLACEHOLDER = "PLACEHOLDER";

function twilioSignatureMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken || authToken === TWILIO_AUTH_TOKEN_PLACEHOLDER) {
    logger.warn("TWILIO_AUTH_TOKEN not set or placeholder — skipping signature validation in dev mode");
    return next();
  }

  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) {
    logger.warn("Missing X-Twilio-Signature header");
    res.status(403).json({ error: "Missing Twilio signature" });
    return;
  }

  const host = process.env.API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  const url = `${host}${req.originalUrl}`;
  const params = req.body as Record<string, string>;

  const isValid = validateRequest(authToken, signature, url, params);
  if (!isValid) {
    logger.warn({ url }, "Invalid Twilio signature");
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
}

router.post("/webhooks/twilio/sms-inbound", twilioSignatureMiddleware, async (req, res): Promise<void> => {
  const body = req.body as Record<string, string>;
  const from = body.From ?? "unknown";
  const messageBody = body.Body ?? "";
  const mediaUrl = body.MediaUrl0;
  const numMedia = parseInt(body.NumMedia ?? "0", 10);

  logger.info({ from, bodyLength: messageBody.length }, "Twilio inbound SMS");

  const principalPhone = process.env.PRINCIPAL_PHONE;
  if (principalPhone && from !== principalPhone) {
    logger.warn({ from }, "SMS from unauthorized sender — rejecting with 403");
    res.status(403).json({ error: "Unauthorized sender" });
    return;
  }

  const principalThread = await getOrCreatePrincipalThread();

  const contentType: "text" | "voice" = numMedia > 0 && mediaUrl ? "voice" : "text";
  const audioObjectPath = contentType === "voice" ? mediaUrl ?? null : null;

  const [message] = await db
    .insert(messagesTable)
    .values({
      threadId: principalThread.id,
      role: "user",
      content: messageBody,
      audioObjectPath,
      direction: "inbound",
      senderType: "principal",
      contentType,
      contentUrl: audioObjectPath,
      externalId: body.MessageSid ?? null,
    })
    .returning();

  const jobId = randomUUID();

  await db.insert(captureJobsTable).values({
    jobId,
    messageId: message!.id,
    status: "queued",
    audioObjectPath,
    rawText: contentType === "text" ? messageBody : null,
  });

  await enqueueCapture(jobId);

  logger.info({ jobId, messageId: message!.id, from }, "Capture job enqueued for inbound SMS");

  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Got it. Processing now — I'll update your task list shortly.</Message></Response>`);
});

router.post("/webhooks/twilio/sms-status", twilioSignatureMiddleware, async (req, res): Promise<void> => {
  const body = req.body as Record<string, string>;
  logger.info({ sid: body.MessageSid, status: body.MessageStatus }, "Twilio SMS status callback");

  await db.insert(agentActionsLogTable).values({
    action: "twilio_status_callback",
    source: "twilio",
    payload: body as unknown as Record<string, unknown>,
  }).catch((err) => logger.error({ err }, "Failed to log SMS status callback"));

  res.status(204).send();
});

router.post("/twilio/incoming", twilioSignatureMiddleware, (req, res): void => {
  const from = (req.body as Record<string, string>).From ?? "unknown";
  const body = (req.body as Record<string, string>).Body ?? "";
  logger.info({ from, body }, "Twilio incoming SMS webhook (legacy path)");
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

export default router;
