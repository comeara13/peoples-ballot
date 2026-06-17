import { db } from "./index";
import {
  affiliations,
  assessmentQuestions,
  ballots,
  glossaryTerms,
  ideaBanks,
  ideaGlossaryTerms,
  ideas,
  ideaTranslations,
  parties,
  tags,
  testimonials,
} from "./schema";
import { eq, inArray, isNull, and } from "drizzle-orm";

// Glossary terms relevant to Chicago 2019 equity voting context.
// Each entry lists the term and which idea indices (0-based into IDEAS[]) it applies to.
const GLOSSARY: { title: string; body: string; ideaIndices: number[] }[] = [
  {
    title: "TIF (Tax Increment Financing)",
    body: `A public financing method where future property-tax revenue *increases* within a designated district are set aside to fund infrastructure or development in that same district — rather than flowing to schools, parks, or other city services.\n\n**How it works in Chicago:** When a TIF district is created, the "base" tax value is frozen. As property values rise, the extra tax revenue goes into a TIF fund controlled by the mayor's office and the local alderman, outside the normal city budget process.\n\n**Why it's contested:** Critics argue TIF funds are used to subsidize wealthy developers in already-booming areas rather than underserved neighborhoods, and that they divert money from public schools and social services.`,
    ideaIndices: [1, 19, 29],
  },
  {
    title: "Returning Citizens / Returning Residents",
    body: `People who have been released from incarceration (jail or prison) and are re-entering their communities. The term emphasizes their status as full members of society rather than defining them by past convictions.\n\n**Barriers they often face:** difficulty finding employment due to background checks, ineligibility for public housing, loss of professional licenses, and gaps in education or job skills from time spent incarcerated.\n\n**Why the language matters:** "Returning citizen" is preferred over "ex-offender" or "ex-convict" because it centers reintegration and civic participation rather than past legal status.`,
    ideaIndices: [5, 16, 36],
  },
  {
    title: "Community Benefits Agreement (CBA)",
    body: `A legally enforceable contract between a developer and a coalition of community groups. In exchange for public subsidies, zoning variances, or other city support, the developer commits to specific community benefits.\n\n**Common provisions include:**\n- Local hiring targets and living-wage jobs\n- Affordable housing set-asides\n- Community facilities (parks, health clinics, schools)\n- Environmental protections\n\n**Limitations:** CBAs are only as strong as the coalition that negotiates them. Without an organized community, developers can offer weak or unenforceable terms.`,
    ideaIndices: [15, 37],
  },
  {
    title: "Restorative Justice",
    body: `An approach to harm and conflict that prioritizes repairing relationships and addressing root causes rather than purely punishing offenders.\n\n**Key practices include:**\n- Victim-offender mediation (bringing harmed and responsible parties together)\n- Community circles where peers, family, and community members participate\n- Making amends through community service or restitution\n\n**Evidence:** Studies show restorative approaches reduce reoffending rates and increase victim satisfaction compared to traditional incarceration, particularly for non-violent offenses.\n\n**Contrast with retributive justice**, which focuses on punishment proportional to the offense.`,
    ideaIndices: [36],
  },
  {
    title: "Racial Equity Impact Assessment (REIA)",
    body: `A structured process to evaluate how a proposed policy, budget, or decision will affect different racial and ethnic groups — before it is adopted.\n\n**Typically examines:**\n- Who benefits and who bears costs, broken down by race\n- Whether the policy closes or widens existing racial disparities\n- Unintended consequences for communities of color\n\n**Chicago context:** Chicago has some of the most severe racial wealth and health gaps of any major U.S. city. Proponents argue REIAs force decision-makers to make racial impact visible and accountable, rather than treating race as an afterthought.`,
    ideaIndices: [2, 10],
  },
  {
    title: "Aldermanic Prerogative",
    body: `An informal but powerful Chicago tradition where the City Council generally defers to the local alderman on zoning, permits, and development decisions within their ward — even when those decisions affect the broader city.\n\n**How it works:** Although zoning decisions technically require full Council approval, in practice aldermen rarely vote against a colleague's wishes in their own ward. This gives individual aldermen enormous power over neighborhood development.\n\n**Criticisms:**\n- Enables corruption and pay-to-play deals (several aldermen have been convicted of related charges)\n- Can block affordable housing or community services that the broader city supports\n- Concentrates power in one person rather than the community`,
    ideaIndices: [7],
  },
  {
    title: "Accessory Dwelling Unit (ADU)",
    body: `A secondary, self-contained housing unit located on the same lot as a primary single-family home. Also called a "granny flat," "in-law suite," "coach house," or "backyard cottage."\n\n**Types include:**\n- Basement or attic apartments within the main home\n- Garage conversions\n- Small detached cottages in the backyard\n\n**Benefits:** ADUs can provide affordable rental housing without requiring new land, generate income for homeowners, allow multigenerational living, and increase housing supply in established neighborhoods.\n\n**Chicago context:** Much of Chicago's zoning historically prohibited ADUs. Allowing them could add tens of thousands of housing units without displacing existing residents.`,
    ideaIndices: [25],
  },
  {
    title: "Bus Rapid Transit (BRT)",
    body: `A high-frequency, high-reliability bus service that operates more like a light rail than a typical bus route.\n\n**Key features:**\n- **Dedicated lanes** — buses travel in their own lane, unaffected by car traffic\n- **Off-board fare payment** — passengers pay before boarding, reducing dwell time\n- **Level boarding** — platforms at the same height as the bus floor for faster, accessible boarding\n- **Real-time information** and enhanced stations\n\n**Why it matters:** BRT can dramatically cut travel times on congested corridors at a fraction of the cost of building a new rail line. Critics note that without truly dedicated lanes, "BRT" often delivers little improvement over ordinary bus service.`,
    ideaIndices: [39],
  },
];

const BANK_NAME = "Vote Equity — Chicago 2019";

const IDEAS: { text: string }[] = [
  {
    text: "Expand CPS's Universal Trauma Screening project to more effectively support Chicago students.",
  },
  {
    text: "Require all development projects using city resources, i.e. TIF funds, to create living-wage jobs and hire from high-poverty neighborhoods.",
  },
  {
    text: "Require a Racial Equity Impact Assessment of every budget before it is voted on by the City Council.",
  },
  { text: "Change election day to be during the summer to increase voter turnout." },
  {
    text: "Create a statutory waiver for the imposition of criminal court fees and costs on the poor.",
  },
  {
    text: "Prioritize jobs creation and placement for returning citizens and those who live in the highest-poverty neighborhoods in our city.",
  },
  {
    text: "Divert funds from the City of Chicago's $4 million/day Policing Budget and invest in mental health services and youth jobs and recreation.",
  },
  { text: "End the practice of honoring aldermanic prerogative in zoning decisions." },
  { text: "Make public transportation free." },
  {
    text: "Create civilian crisis-intervention teams to support people with behavioral health issues or who are in crisis.",
  },
  {
    text: "Require community-led Racial Equity Impact Assessments to be done before every school action decision.",
  },
  {
    text: "Require resources allocation be based on community-led Community Needs and Assets assessments in each of Chicago's 77 defined communities.",
  },
  {
    text: "Create a progressive sliding scale for fee-based services, such as transit, sewage, garbage removal, and water.",
  },
  {
    text: "End the suspension of driver's licenses for simple non-payment of tickets, fines, or other debt.",
  },
  {
    text: "Spend $150 million/year to prevent homelessness and help doubled-up families by raising the tax on luxury and commercial real estate deals.",
  },
  {
    text: "Require Community Benefits Agreements for all new developments, to guarantee protections for our existing communities.",
  },
  {
    text: "Provide re-entry support services such as housing, job training, expungement services, and mental health support to returning residents.",
  },
  {
    text: "Reform city contracting policies to ensure that significant money and jobs are awarded to minority and women-owned businesses.",
  },
  {
    text: "Require meaningful community engagement, such as community assemblies, to include the most disadvantaged in developing policies and budgets.",
  },
  {
    text: "Change TIF regulations to allow TIF funds to be used for support services in schools like counselors, social workers, nurses and librarians.",
  },
  {
    text: "Create green jobs for Black and Brown communities building sustainable city infrastructure on the South and West sides.",
  },
  {
    text: "Create green jobs for Black and Brown communities including the immediate remediation of lead contamination in Chicago's water supply.",
  },
  {
    text: "Establish a formal 'equity-focused quality control' process in Cook County's court-based criminal risk assessment tool.",
  },
  { text: "Create an independent redistricting commission to draw ward maps." },
  { text: "Chicago should not require two forms of identification to register to vote." },
  {
    text: "Legalize and incentivize the creation of accessory dwelling units, small self-contained units on the same lot as a single-family home.",
  },
  {
    text: "Ensure equitable access to early childhood education by streamlining the application and enrollment process.",
  },
  {
    text: "Increase community safety by creating a pre-arrest diversion program that allows officers to address incidents without arrest.",
  },
  {
    text: "Consolidate wards to create a smaller City Council that will be better able to legislate.",
  },
  {
    text: "Create elected Chicago Plan and TIF Commissions, to create more accountability in major planning projects.",
  },
  {
    text: "Build affordable housing in the far Northwest Side communities that currently have little or no affordable housing options.",
  },
  {
    text: "Fix the broken property tax system and raise revenue from previously under-taxed downtown commercial and luxury real estate.",
  },
  {
    text: "Adopt a more equitable school funding formula that better accounts for differences in student and neighborhood needs and resources.",
  },
  {
    text: "Reform the police department to address issues concerning mental health, implicit bias, and the lack of transparency among the force.",
  },
  {
    text: "Fully fund special education and bilingual education programs in our neighborhood public schools.",
  },
  { text: "Ensure open forums for candidates for all elections." },
  {
    text: "Reform the justice system to incorporate restorative justice and other healing practices instead of jail, especially for non-violent events.",
  },
  {
    text: "Establish Community Benefit Agreements for all large-scale developments like the Obama Presidential Center to protect long-time residents.",
  },
  {
    text: "Fully fund neighborhood public schools so they can provide the education and supports students need to thrive.",
  },
  {
    text: "Invest in expanded and more frequent CTA bus service, including Bus Rapid Transit routes.",
  },
];

async function seed() {
  console.log(`Seeding "${BANK_NAME}"...`);

  const existing = await db.select().from(ideaBanks).where(eq(ideaBanks.name, BANK_NAME)).limit(1);

  if (existing.length > 0) {
    console.log("Idea bank already exists — skipping.");
    process.exit(0);
  }

  const [bank] = await db
    .insert(ideaBanks)
    .values({
      name: BANK_NAME,
      questionHeading: "Which idea would best help build a community that works for all of us?",
    })
    .returning();
  console.log(`Created idea bank: ${bank.id}`);

  const inserted = await db
    .insert(ideas)
    .values(IDEAS.map(() => ({ ideaBankId: bank.id })))
    .returning();
  console.log(`Inserted ${inserted.length} ideas`);

  await db.insert(ideaTranslations).values(
    inserted.map((idea, i) => ({
      ideaId: idea.id,
      language: "en",
      text: IDEAS[i].text,
    })),
  );
  console.log(`Inserted ${inserted.length} English translations`);

  const [party] = await db
    .insert(parties)
    .values({ ideaBankId: bank.id, name: "April 2026 Community Meeting" })
    .returning();
  console.log(`Created party: ${party.id}`);

  await db.insert(affiliations).values([
    { ideaBankId: bank.id, name: "Current WFP MI Member" },
    { ideaBankId: bank.id, name: "482Forward" },
    { ideaBankId: bank.id, name: "DSA" },
  ]);
  console.log("Inserted 3 affiliation groups");

  await db.insert(assessmentQuestions).values([
    {
      ideaBankId: bank.id,
      text: "I believe that my government listens to me.",
      type: "likert",
      position: 0,
    },
    {
      ideaBankId: bank.id,
      text: "I participate in civic or political activities (e.g., voting, attending meetings, signing petitions) because it makes a difference.",
      type: "likert",
      position: 1,
    },
  ]);
  console.log("Inserted 2 assessment questions");

  await db.insert(tags).values([
    { name: "School Board", type: "scale" },
    { name: "City/Town", type: "scale" },
    { name: "County", type: "scale" },
    { name: "State", type: "scale" },
    { name: "Federal", type: "scale" },
    { name: "Any", type: "scale" },
    { name: "Housing", type: "issue_category" },
    { name: "Education", type: "issue_category" },
    { name: "Public Safety", type: "issue_category" },
    { name: "Transportation", type: "issue_category" },
    { name: "Environment", type: "issue_category" },
    { name: "Healthcare", type: "issue_category" },
  ]).onConflictDoNothing();
  console.log("Inserted 12 tags (6 scale, 6 issue_category)");

  const insertedTerms = await db
    .insert(glossaryTerms)
    .values(GLOSSARY.map(({ title, body }) => ({ title, body })))
    .onConflictDoNothing()
    .returning();

  // onConflictDoNothing().returning() only returns newly inserted rows, so if any
  // terms pre-existed the array would be shorter than GLOSSARY and indices would misalign.
  // Re-fetch all terms by title to get stable IDs regardless of pre-existing rows.
  const termTitles = GLOSSARY.map((g) => g.title);
  const allTermRows = await db
    .select()
    .from(glossaryTerms)
    .where(and(inArray(glossaryTerms.title, termTitles), isNull(glossaryTerms.archivedAt)));
  const termByTitle = new Map(allTermRows.map((t) => [t.title, t]));
  console.log(`Inserted ${insertedTerms.length} new glossary terms (${allTermRows.length} active total)`);

  const ideaLinks: { ideaId: string; termId: string }[] = [];
  for (const entry of GLOSSARY) {
    const term = termByTitle.get(entry.title);
    if (!term) continue;
    for (const ideaIdx of entry.ideaIndices) {
      const idea = inserted[ideaIdx];
      if (idea) ideaLinks.push({ ideaId: idea.id, termId: term.id });
    }
  }
  if (ideaLinks.length > 0) {
    await db.insert(ideaGlossaryTerms).values(ideaLinks).onConflictDoNothing();
  }
  console.log(`Linked ${ideaLinks.length} idea↔glossary-term associations`);

  const seedBallots = await db
    .insert(ballots)
    .values([
      { ideaBankId: bank.id, partyId: party.id, status: "submitted" },
      { ideaBankId: bank.id, partyId: party.id, status: "submitted" },
      { ideaBankId: bank.id, partyId: party.id, status: "submitted" },
    ])
    .returning();
  console.log(`Created ${seedBallots.length} seed ballots`);

  await db.insert(testimonials).values([
    {
      ballotId: seedBallots[0].id,
      text: "I've seen firsthand how under-resourced our neighborhood schools are. My kids deserve the same opportunities as kids in wealthier neighborhoods.",
    },
    {
      ballotId: seedBallots[1].id,
      text: "Mental health support saved my life. We need to stop treating this as a luxury and start treating it as the public health issue it is.",
    },
    {
      ballotId: seedBallots[2].id,
      text: "My brother came home from prison two years ago and couldn't find a single employer willing to give him a chance. We're setting people up to fail.",
    },
  ]);
  console.log("Inserted 3 seed testimonials");

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
