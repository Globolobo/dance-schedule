import { describe, it, expect } from "@jest/globals";
import { ZodError, z } from "zod";
import { formatValidationErrors } from "../../../src/utils/validation";

describe("validation", () => {
  describe("formatValidationErrors", () => {
    it("should format single error correctly", () => {
      const schema = z.object({
        name: z.string(),
      });

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        const formatted = formatValidationErrors(error as ZodError);
        expect(formatted).toContain("name");
        expect(formatted).toMatch(/expected string|Expected string/i);
      }
    });

    it("should format multiple errors correctly", () => {
      const schema = z.object({
        name: z.string(),
        email: z.email(),
        age: z.number(),
      });

      try {
        schema.parse({ name: 123, email: "invalid", age: "not-a-number" });
      } catch (error) {
        const formatted = formatValidationErrors(error as ZodError);
        expect(formatted).toContain("name");
        expect(formatted).toContain("email");
        expect(formatted).toContain("age");
        const errorCount = formatted.split(",").length;
        expect(errorCount).toBeGreaterThanOrEqual(3);
      }
    });

    it("should handle nested paths", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
          }),
        }),
      });

      try {
        schema.parse({
          user: {
            name: 123,
            address: {
              street: 456,
            },
          },
        });
      } catch (error) {
        const formatted = formatValidationErrors(error as ZodError);
        expect(formatted).toContain("user.name");
        expect(formatted).toContain("user.address.street");
      }
    });

    it("should handle empty path (root level errors)", () => {
      const schema = z.string();

      try {
        schema.parse(123);
      } catch (error) {
        const formatted = formatValidationErrors(error as ZodError);
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe("string");
      }
    });
  });
});
