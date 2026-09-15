/**
 * The standard questions a patient answers when they have no reports to hand,
 * or would rather not share them yet. Short enough to finish in a minute, and
 * enough for a coordinator to place the case.
 */
export const INTAKE_QUESTIONS = [
  { id: "problem", question: "What is the main problem, in your own words?" },
  { id: "duration", question: "How long has it been going on?" },
  { id: "diagnosis", question: "Has a doctor given it a name? If so, what did they call it?" },
  { id: "advice", question: "What did that doctor advise — surgery, medicine, more tests?" },
  { id: "treatmentSoFar", question: "What treatment have you already had for it?" },
  { id: "age", question: "How old is the patient?" },
  { id: "conditions", question: "Any diabetes, blood pressure, heart or kidney condition?" },
  { id: "mobility", question: "Can the patient walk and travel unaided at the moment?" },
] as const;

export type IntakeAnswers = Partial<Record<(typeof INTAKE_QUESTIONS)[number]["id"], string>>;
