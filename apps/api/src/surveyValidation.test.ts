import { describe, it, expect } from "bun:test";
import { isValidSurveyValue } from "./surveyValidation";

describe("isValidSurveyValue", () => {
  describe("likert", () => {
    it("accepts '1' through '5'", () => {
      for (const v of ["1", "2", "3", "4", "5"]) {
        expect(isValidSurveyValue("likert", v)).toBe(true);
      }
    });

    it("rejects '0' and '6'", () => {
      expect(isValidSurveyValue("likert", "0")).toBe(false);
      expect(isValidSurveyValue("likert", "6")).toBe(false);
    });

    it("rejects numeric strings with decimal or negative sign", () => {
      expect(isValidSurveyValue("likert", "1.0")).toBe(false);
      expect(isValidSurveyValue("likert", "-1")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidSurveyValue("likert", "")).toBe(false);
    });

    it("rejects yes/no strings", () => {
      expect(isValidSurveyValue("likert", "yes")).toBe(false);
      expect(isValidSurveyValue("likert", "no")).toBe(false);
    });
  });

  describe("yes_no", () => {
    it("accepts 'yes' and 'no'", () => {
      expect(isValidSurveyValue("yes_no", "yes")).toBe(true);
      expect(isValidSurveyValue("yes_no", "no")).toBe(true);
    });

    it("rejects uppercase variants", () => {
      expect(isValidSurveyValue("yes_no", "Yes")).toBe(false);
      expect(isValidSurveyValue("yes_no", "YES")).toBe(false);
      expect(isValidSurveyValue("yes_no", "No")).toBe(false);
    });

    it("rejects numeric strings", () => {
      for (const v of ["1", "2", "3", "4", "5"]) {
        expect(isValidSurveyValue("yes_no", v)).toBe(false);
      }
    });

    it("rejects empty string", () => {
      expect(isValidSurveyValue("yes_no", "")).toBe(false);
    });

    it("rejects 'true'/'false'", () => {
      expect(isValidSurveyValue("yes_no", "true")).toBe(false);
      expect(isValidSurveyValue("yes_no", "false")).toBe(false);
    });
  });
});
