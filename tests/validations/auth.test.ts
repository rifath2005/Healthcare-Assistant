import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema } from "@/lib/validations/auth";

describe("Authentication Validation Schemas", () => {
  describe("signupSchema", () => {
    it("should accept valid patient registration data", () => {
      const validData = {
        fullName: "Dr. Jane Doe",
        email: "JANE.DOE@EXAMPLE.COM",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
        terms: true,
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("jane.doe@example.com"); // Normalized lowercase
      }
    });

    it("should reject weak passwords lacking required character variety", () => {
      const weakPasswordData = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "password", // No uppercase, no digits, no special chars
        confirmPassword: "password",
        terms: true,
      };

      const result = signupSchema.safeParse(weakPasswordData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true);
      }
    });

    it("should reject mismatched password and confirmPassword", () => {
      const mismatchData = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "SecurePassword123!",
        confirmPassword: "DifferentPassword456!",
        terms: true,
      };

      const result = signupSchema.safeParse(mismatchData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
      }
    });

    it("should reject invalid email formats", () => {
      const invalidEmailData = {
        fullName: "Jane Doe",
        email: "not-an-email",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
        terms: true,
      };

      const result = signupSchema.safeParse(invalidEmailData);
      expect(result.success).toBe(false);
    });

    it("should reject if terms are not accepted", () => {
      const noTermsData = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
        terms: false,
      };

      const result = signupSchema.safeParse(noTermsData);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login credentials", () => {
      const validLogin = {
        email: "PATIENT@CLINIC.ORG",
        password: "AnyPassword123",
        rememberMe: true,
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("patient@clinic.org");
      }
    });

    it("should reject empty password", () => {
      const emptyPass = {
        email: "patient@clinic.org",
        password: "",
      };

      const result = loginSchema.safeParse(emptyPass);
      expect(result.success).toBe(false);
    });
  });
});
