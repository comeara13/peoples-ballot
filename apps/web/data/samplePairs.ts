import type { Pair } from "@/types/ballot";

const rawPairs: Array<{ id: string; left: { id: string; text: string }; right: { id: string; text: string } }> = [
  {
    id: "pair-1",
    left: {
      id: "68718",
      text: "Expand CPS's Universal Trauma Screening project to more effectively support Chicago students.",
    },
    right: {
      id: "77993",
      text: "Require all development projects using city resources, i.e. TIF funds, to create living-wage jobs and hire from high-poverty neighborhoods.",
    },
  },
  {
    id: "pair-2",
    left: {
      id: "32140",
      text: "Require a Racial Equity Impact Assessment of every budget before it is voted on by the City Council.",
    },
    right: {
      id: "15506",
      text: "Change election day to be during the summer to increase voter turnout.",
    },
  },
  {
    id: "pair-3",
    left: {
      id: "49995",
      text: "Create a statutory waiver for the imposition of criminal court fees and costs on the poor.",
    },
    right: {
      id: "70002",
      text: "Prioritize jobs creation and placement for returning citizens and those who live in the highest-poverty neighborhoods in our city.",
    },
  },
  {
    id: "pair-4",
    left: {
      id: "34190",
      text: "Divert funds from the City of Chicago's $4 million/day Policing Budget and invest in mental health services and youth jobs and recreation.",
    },
    right: {
      id: "51304",
      text: "End the practice of honoring aldermanic prerogative in zoning decisions.",
    },
  },
  {
    id: "pair-5",
    left: { id: "77259", text: "Make public transportation free." },
    right: {
      id: "90788",
      text: "Create civilian crisis-intervention teams to support people with behavioral health issues or who are in crisis.",
    },
  },
  {
    id: "pair-6",
    left: {
      id: "23290",
      text: "Require community-led Racial Equity Impact Assessments to be done before every school action decision.",
    },
    right: {
      id: "14822",
      text: "Require resources allocation be based on community-led Community Needs and Assets assessments in each of Chicago's 77 defined communities.",
    },
  },
  {
    id: "pair-7",
    left: {
      id: "77293",
      text: "Create a progressive sliding scale for fee-based services, such as transit, sewage, garbage removal, and water.",
    },
    right: {
      id: "74245",
      text: "End the suspension of driver's licenses for simple non-payment of tickets, fines, or other debt.",
    },
  },
  {
    id: "pair-8",
    left: {
      id: "89777",
      text: "Spend $150 million/year to prevent homelessness and help doubled-up families by raising the tax on luxury and commercial real estate deals.",
    },
    right: {
      id: "86091",
      text: "Require Community Benefits Agreements for all new developments, to guarantee protections for our existing communities.",
    },
  },
  {
    id: "pair-9",
    left: {
      id: "80348",
      text: "Provide re-entry support services such as housing, job training, expungement services, and mental health support to returning residents.",
    },
    right: {
      id: "78493",
      text: "Reform city contracting policies to ensure that significant money and jobs are awarded to minority and women-owned businesses.",
    },
  },
  {
    id: "pair-10",
    left: {
      id: "63849",
      text: "Require meaningful community engagement, such as community assemblies, to include the most disadvantaged in developing policies and budgets.",
    },
    right: {
      id: "62907",
      text: "Change TIF regulations to allow TIF funds to be used for support services in schools like counselors, social workers, nurses and librarians.",
    },
  },
  {
    id: "pair-11",
    left: {
      id: "39474",
      text: "Create green jobs for Black and Brown communities building sustainable city infrastructure on the South and West sides.",
    },
    right: {
      id: "78801",
      text: "Create green jobs for Black and Brown communities including the immediate remediation of lead contamination in Chicago's water supply.",
    },
  },
  {
    id: "pair-12",
    left: {
      id: "73559",
      text: "Establish a formal 'equity-focused quality control' process in Cook County's court-based criminal risk assessment tool.",
    },
    right: {
      id: "39998",
      text: "Create an independent redistricting commission to draw ward maps.",
    },
  },
  {
    id: "pair-13",
    left: {
      id: "42775",
      text: "Chicago should not require two forms of identification to register to vote.",
    },
    right: {
      id: "75790",
      text: "Legalize and incentivize the creation of accessory dwelling units, small self-contained units on the same lot as a single-family home.",
    },
  },
  {
    id: "pair-14",
    left: {
      id: "22570",
      text: "Ensure equitable access to early childhood education by streamlining the application and enrollment process.",
    },
    right: {
      id: "66212",
      text: "Increase community safety by creating a pre-arrest diversion program that allows officers to address incidents without arrest.",
    },
  },
  {
    id: "pair-15",
    left: {
      id: "65174",
      text: "Consolidate wards to create a smaller City Council that will be better able to legislate.",
    },
    right: {
      id: "69315",
      text: "Create elected Chicago Plan and TIF Commissions, to create more accountability in major planning projects.",
    },
  },
  {
    id: "pair-16",
    left: {
      id: "31166",
      text: "Build affordable housing in the far Northwest Side communities that currently have little or no affordable housing options.",
    },
    right: {
      id: "81570",
      text: "Fix the broken property tax system and raise revenue from previously under-taxed downtown commercial and luxury real estate.",
    },
  },
  {
    id: "pair-17",
    left: {
      id: "59806",
      text: "Adopt a more equitable school funding formula that better accounts for differences in student and neighborhood needs and resources.",
    },
    right: {
      id: "49785",
      text: "Reform the police department to address issues concerning mental health, implicit bias, and the lack of transparency among the force.",
    },
  },
  {
    id: "pair-18",
    left: {
      id: "50085",
      text: "Fully fund special education and bilingual education programs in our neighborhood public schools.",
    },
    right: { id: "52483", text: "Ensure open forums for candidates for all elections." },
  },
  {
    id: "pair-19",
    left: {
      id: "60110",
      text: "Reform the justice system to incorporate restorative justice and other healing practices instead of jail, especially for non-violent events.",
    },
    right: {
      id: "96623",
      text: "Establish Community Benefit Agreements for all large-scale developments like the Obama Presidential Center to protect long-time residents.",
    },
  },
  {
    id: "pair-20",
    left: {
      id: "11234",
      text: "Fully fund neighborhood public schools so they can provide the education and supports students need to thrive.",
    },
    right: {
      id: "55678",
      text: "Invest in expanded and more frequent CTA bus service, including Bus Rapid Transit routes.",
    },
  },
];

export const samplePairs: Pair[] = rawPairs.map((p) => ({
  ...p,
  left: { ...p.left, glossaryTerms: [] },
  right: { ...p.right, glossaryTerms: [] },
}));
