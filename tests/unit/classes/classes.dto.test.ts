import { describe, it, expect } from "@jest/globals";
import { DanceStyle, DanceLevel } from "@prisma/client";
import {
  DanceStyleFilterSchema,
  SearchQueryParamsSchema,
  ClassWithInstructorSchema,
} from "../../../src/modules/classes/classes.dto";

describe("classes.dto", () => {
  describe("DanceStyleFilterSchema", () => {
    it("should validate valid enum values", () => {
      expect(DanceStyleFilterSchema.parse("salsa")).toBe("salsa");
      expect(DanceStyleFilterSchema.parse("bachata")).toBe("bachata");
      expect(DanceStyleFilterSchema.parse("reggaeton")).toBe("reggaeton");
    });

    it("should reject invalid values", () => {
      expect(() => DanceStyleFilterSchema.parse("invalid")).toThrow();
      expect(() => DanceStyleFilterSchema.parse("")).toThrow();
      expect(() => DanceStyleFilterSchema.parse("SALSA")).toThrow();
    });
  });

  describe("SearchQueryParamsSchema", () => {
    it("should default type to 'any' when missing", () => {
      const result = SearchQueryParamsSchema.parse({});
      expect(result.type).toBe("any");
    });

    it("should accept optional type parameter", () => {
      const result1 = SearchQueryParamsSchema.parse({ type: "salsa" });
      expect(result1.type).toBe("salsa");

      const result2 = SearchQueryParamsSchema.parse({ type: "any" });
      expect(result2.type).toBe("any");
    });

    it("should validate type when provided", () => {
      expect(() =>
        SearchQueryParamsSchema.parse({ type: "invalid" })
      ).toThrow();
      expect(() => SearchQueryParamsSchema.parse({ type: "SALSA" })).toThrow();
    });
  });

  describe("ClassWithInstructorSchema", () => {
    const validClassData = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Class",
      description: "Test description",
      style: DanceStyle.SALSA,
      level: DanceLevel.LEVEL_1,
      maxSpots: 20,
      durationMin: 60,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      instructor: {
        id: "660e8400-e29b-41d4-a716-446655440000",
        name: "John Doe",
        email: "john@example.com",
      },
    };

    it("should validate valid class data", () => {
      const result = ClassWithInstructorSchema.parse(validClassData);
      expect(result).toEqual(validClassData);
    });

    it("should allow null instructor", () => {
      const classWithoutInstructor = {
        ...validClassData,
        instructor: null,
      };
      const result = ClassWithInstructorSchema.parse(classWithoutInstructor);
      expect(result.instructor).toBeNull();
    });

    it("should allow null description", () => {
      const classWithoutDescription = {
        ...validClassData,
        description: null,
      };
      const result = ClassWithInstructorSchema.parse(classWithoutDescription);
      expect(result.description).toBeNull();
    });

    it("should reject missing required fields", () => {
      const { id, ...missingId } = validClassData;
      expect(() => ClassWithInstructorSchema.parse(missingId)).toThrow();

      const { title, ...missingTitle } = validClassData;
      expect(() => ClassWithInstructorSchema.parse(missingTitle)).toThrow();

      const { style, ...missingStyle } = validClassData;
      expect(() => ClassWithInstructorSchema.parse(missingStyle)).toThrow();
    });

    it("should reject invalid UUIDs", () => {
      const invalidId = {
        ...validClassData,
        id: "not-a-uuid",
      };
      expect(() => ClassWithInstructorSchema.parse(invalidId)).toThrow();
    });

    it("should reject invalid email in instructor", () => {
      const invalidInstructor = {
        ...validClassData,
        instructor: {
          ...validClassData.instructor!,
          email: "not-an-email",
        },
      };
      expect(() =>
        ClassWithInstructorSchema.parse(invalidInstructor)
      ).toThrow();
    });

    it("should reject invalid dance style", () => {
      const invalidStyle = {
        ...validClassData,
        style: "INVALID_STYLE" as any,
      };
      expect(() => ClassWithInstructorSchema.parse(invalidStyle)).toThrow();
    });

    it("should reject invalid dance level", () => {
      const invalidLevel = {
        ...validClassData,
        level: "INVALID_LEVEL" as any,
      };
      expect(() => ClassWithInstructorSchema.parse(invalidLevel)).toThrow();
    });

    it("should reject non-integer maxSpots", () => {
      const invalidMaxSpots = {
        ...validClassData,
        maxSpots: 20.5,
      };
      expect(() => ClassWithInstructorSchema.parse(invalidMaxSpots)).toThrow();
    });

    it("should reject non-integer durationMin", () => {
      const invalidDuration = {
        ...validClassData,
        durationMin: 60.5,
      };
      expect(() => ClassWithInstructorSchema.parse(invalidDuration)).toThrow();
    });
  });
});
