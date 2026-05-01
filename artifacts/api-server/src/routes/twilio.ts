import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { validateRequest } from "twilio";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function twilioSignatureMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    logger.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation (placeholder mode)");
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

router.post("/twilio/incoming", twilioSignatureMiddleware, (req, res): void => {
  const from = (req.body as Record<string, string>).From ?? "unknown";
  const body = (req.body as Record<string, string>).Body ?? "";
  logger.info({ from, body }, "Twilio incoming SMS webhook");
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

router.post("/twilio/voice", twilioSignatureMiddleware, (req, res): void => {
  const from = (req.body as Record<string, string>).From ?? "unknown";
  logger.info({ from }, "Twilio voice webhook");
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling Takeovers Rentals. Your message has been received.</Say></Response>`);
});

export default router;
