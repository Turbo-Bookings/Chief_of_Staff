import { pgEnum } from "drizzle-orm/pg-core";

export const threadTypeEnum = pgEnum("thread_type_enum", [
  "principal_talk",
  "team_member",
  "system_internal",
]);

export const channelEnum = pgEnum("channel_enum", [
  "pwa",
  "sms",
  "email",
  "whatsapp",
  "slack",
]);

export const threadStatusEnum = pgEnum("thread_status_enum", [
  "active",
  "archived",
  "muted",
]);

export const directionEnum = pgEnum("direction_enum", ["inbound", "outbound"]);

export const senderTypeEnum = pgEnum("sender_type_enum", [
  "principal",
  "agent",
  "team_member",
  "external",
]);

export const contentTypeEnum = pgEnum("content_type_enum", [
  "text",
  "voice",
  "image",
  "file",
  "system",
]);

export const taskStatusEnum = pgEnum("task_status_enum", [
  "captured",
  "dispatched",
  "acknowledged",
  "complete",
  "cancelled",
  "open",
  "in_progress",
  "done",
  "blocked",
]);

export const priorityEnum = pgEnum("priority_enum", [
  "urgent",
  "high",
  "normal",
  "low",
  "critical",
  "medium",
]);

export const authorityTierEnum = pgEnum("authority_tier_enum", ["A", "B", "C"]);

export const dispatchChannelEnum = pgEnum("dispatch_channel_enum", [
  "sms",
  "email",
  "pwa",
]);

export const commsChannelEnum = pgEnum("comms_channel_enum", [
  "slack",
  "sms",
  "email",
  "whatsapp",
]);

export const agentActionSourceEnum = pgEnum("agent_action_source_enum", [
  "capture",
  "briefing",
  "twilio",
  "manual",
  "cron",
]);
