import { db } from "./index";
import { ideaBanks, ideas, ideaTranslations } from "./schema";
import { eq } from "drizzle-orm";

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

  const existing = await db
    .select()
    .from(ideaBanks)
    .where(eq(ideaBanks.name, BANK_NAME))
    .limit(1);

  if (existing.length > 0) {
    console.log("Idea bank already exists — skipping.");
    process.exit(0);
  }

  const [bank] = await db.insert(ideaBanks).values({ name: BANK_NAME }).returning();
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

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
