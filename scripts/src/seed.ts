import { db, principalTable, teamMembersTable, threadsTable, featureFlagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const PRINCIPAL_EMAIL = "sel@takeoversrentals.com";
  const PRINCIPAL_NAME = "Selmen Hassen";

  const [existingPrincipal] = await db.select().from(principalTable).limit(1);
  if (!existingPrincipal) {
    await db.insert(principalTable).values({
      name: PRINCIPAL_NAME,
      fullName: PRINCIPAL_NAME,
      email: PRINCIPAL_EMAIL,
      primaryEmail: PRINCIPAL_EMAIL,
      phone: process.env.PRINCIPAL_PHONE ?? "+1-PLACEHOLDER-PRINCIPAL",
      primaryPhone: process.env.PRINCIPAL_PHONE ?? null,
      timezone: "America/New_York",
      briefingMorningTime: "07:00",
      briefingEveningTime: "18:00",
      killSwitch: false,
      preferences: {},
    });
    console.log(`Created principal: ${PRINCIPAL_NAME} <${PRINCIPAL_EMAIL}>`);
  } else {
    await db
      .update(principalTable)
      .set({
        fullName: PRINCIPAL_NAME,
        primaryEmail: PRINCIPAL_EMAIL,
        briefingMorningTime: existingPrincipal.briefingMorningTime ?? "07:00",
        briefingEveningTime: existingPrincipal.briefingEveningTime ?? "18:00",
        killSwitch: existingPrincipal.killSwitch ?? false,
      })
      .where(eq(principalTable.id, existingPrincipal.id));
    console.log(`Updated principal: ${PRINCIPAL_NAME}`);
  }

  const existingMembers = await db.select().from(teamMembersTable).limit(1);
  if (existingMembers.length === 0) {
    const members = [
      {
        name: "Oscar Rivera",
        role: "Operations Manager — runs day-to-day property operations across all markets",
        phone: "+1-PLACEHOLDER-OSCAR",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Direct and data-driven. Prefers bullet points.",
      },
      {
        name: "Nick",
        role: "Property Manager — handles tenant relations and lease execution",
        phone: "+1-PLACEHOLDER-NICK",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Prefers concise updates. Responds quickly to texts.",
      },
      {
        name: "Josh",
        role: "Maintenance Lead — coordinates all repair and upkeep work across properties",
        phone: "+1-PLACEHOLDER-JOSH",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Practical. Needs clear task descriptions with location details.",
      },
      {
        name: "Orlando",
        role: "Leasing Agent — handles showings, applications, and move-ins",
        phone: "+1-PLACEHOLDER-ORLANDO",
        preferredCommsChannel: "email" as const,
        commsStyle: "Detail-oriented. Prefers written follow-ups.",
      },
      {
        name: "Joan",
        role: "Accounting — manages invoices, rent collections, and financial reporting",
        phone: "+1-PLACEHOLDER-JOAN",
        preferredCommsChannel: "email" as const,
        commsStyle: "Formal. Prefers numbered lists and structured communication.",
      },
      {
        name: "Kathy",
        role: "Guest Relations — handles guest issues, reviews, and hospitality coordination",
        phone: "+1-PLACEHOLDER-KATHY",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Empathetic. Good with escalations and guest issues.",
      },
      {
        name: "Karina",
        role: "External realtor partner — handles acquisitions and market sourcing",
        phone: "+1-PLACEHOLDER-KARINA",
        preferredCommsChannel: "email" as const,
        commsStyle: "Creative. Prefers context and rationale over bare instructions.",
      },
      {
        name: "Tahir",
        role: "IT & Systems — manages tech stack, software integrations, and automations",
        phone: "+1-PLACEHOLDER-TAHIR",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Technical. Prefers specific requirements and acceptance criteria.",
      },
      {
        name: "Richard",
        role: "Partner / Legal & Compliance — manages legal review, contracts, and regulatory items",
        phone: "+1-PLACEHOLDER-RICHARD",
        preferredCommsChannel: "email" as const,
        commsStyle: "Cautious. Prefers written records. Review timelines before committing.",
      },
      {
        name: "Brandon",
        role: "Partner / Revenue Manager — drives pricing strategy and revenue optimization",
        phone: "+1-PLACEHOLDER-BRANDON",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Analytical. Prefers data with context. Available mornings.",
      },
    ];

    await db.insert(teamMembersTable).values(members);
    console.log(`Created ${members.length} team members`);
  }

  const [existingThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);

  if (!existingThread) {
    await db.insert(threadsTable).values({
      title: "Talk",
      threadType: "principal_talk",
      channel: "pwa",
      status: "active",
      messageCount: 0,
    });
    console.log("Created principal_talk thread");
  }

  const flagNames = ["shadowTeamEnabled", "twilioEnabled", "autoBriefingEnabled", "voiceMemoEnabled"];
  for (const name of flagNames) {
    const [existing] = await db
      .select()
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.name, name))
      .limit(1);

    if (!existing) {
      await db.insert(featureFlagsTable).values({ name, enabled: false });
    }
  }
  console.log("Feature flags initialized (all OFF by default)");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
