import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/twilio/incoming", (req, res): void => {
  logger.info({ body: req.body }, "Twilio incoming SMS webhook (placeholder)");
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

router.post("/twilio/voice", (req, res): void => {
  logger.info({ body: req.body }, "Twilio voice webhook (placeholder)");
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling Takeovers Rentals. Your message has been received.</Say></Response>`);
});

export default router;
