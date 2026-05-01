import { db, principalTable, teamMembersTable, threadsTable, featureFlagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const [existingPrincipal] = await db.select().from(principalTable).limit(1);
  if (!existingPrincipal) {
    await db.insert(principalTable).values({
      name: "Selmen Hassen",
      email: "selmen@takeoverrentals.com",
      phone: "+1-PLACEHOLDER-PRINCIPAL",
      timezone: "America/New_York",
    });
    console.log("Created principal: Selmen Hassen");
  } else if (!existingPrincipal.email) {
    await db
      .update(principalTable)
      .set({ email: "selmen@takeoverrentals.com", timezone: "America/New_York" })
      .where(eq(principalTable.id, existingPrincipal.id));
    console.log("Updated principal with email and timezone");
  }

  const existingMembers = await db.select().from(teamMembersTable).limit(1);
  if (existingMembers.length === 0) {
    const members = [
      {
        name: "Oscar",
        role: "Operations Manager",
        phone: "+1-PLACEHOLDER-OSCAR",
        preferredCommsChannel: "slack" as const,
        commsStyle: "Direct and data-driven. Prefers bullet points.",
      },
      {
        name: "Nick",
        role: "Property Manager",
        phone: "+1-PLACEHOLDER-NICK",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Prefers concise updates. Responds quickly to texts.",
      },
      {
        name: "Josh",
        role: "Maintenance Lead",
        phone: "+1-PLACEHOLDER-JOSH",
        preferredCommsChannel: "sms" as const,
        commsStyle: "Practical. Needs clear task descriptions with location details.",
      },
      {
        name: "Orlando",
        role: "Leasing Agent",
        phone: "+1-PLACEHOLDER-ORLANDO",
        preferredCommsChannel: "email" as const,
        commsStyle: "Detail-oriented. Prefers written follow-ups.",
      },
      {
        name: "Joan",
        role: "Accounting",
        phone: "+1-PLACEHOLDER-JOAN",
        preferredCommsChannel: "email" as const,
        commsStyle: "Formal. Prefers numbered lists and structured communication.",
      },
      {
        name: "Kathy",
        role: "Guest Relations",
        phone: "+1-PLACEHOLDER-KATHY",
        preferredCommsChannel: "slack" as const,
        commsStyle: "Empathetic. Good with escalations and guest issues.",
      },
      {
        name: "Karina",
        role: "Marketing",
        phone: "+1-PLACEHOLDER-KARINA",
        preferredCommsChannel: "slack" as const,
        commsStyle: "Creative. Prefers context and rationale over bare instructions.",
      },
      {
        name: "Tahir",
        role: "IT & Systems",
        phone: "+1-PLACEHOLDER-TAHIR",
        preferredCommsChannel: "slack" as const,
        commsStyle: "Technical. Prefers specific requirements and acceptance criteria.",
      },
      {
        name: "Richard",
        role: "Legal & Compliance",
        phone: "+1-PLACEHOLDER-RICHARD",
        preferredCommsChannel: "email" as const,
        commsStyle: "Cautious. Prefers written records. Review timelines before committing.",
      },
      {
        name: "Brandon",
        role: "Revenue Manager",
        phone: "+1-PLACEHOLDER-BRANDON",
        preferredCommsChannel: "slack" as const,
        commsStyle: "Analytical. Prefers data with context. Available mornings.",
      },
    ];

    await db.insert(teamMembersTable).values(members);
    console.log(`Created ${members.length} team members with comms preferences`);
  }

  const [existingThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.title, "principal_talk"))
    .limit(1);

  if (!existingThread) {
    await db.insert(threadsTable).values({
      title: "principal_talk",
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
  console.log("Feature flags initialized (all OFF)");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
