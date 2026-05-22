export function isValidSurveyValue(type: "likert" | "yes_no", value: string): boolean {
  return type === "likert"
    ? ["1", "2", "3", "4", "5"].includes(value)
    : ["yes", "no"].includes(value);
}
