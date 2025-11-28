import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DanceStyle, DanceLevel } from "@prisma/client";
import { searchClasses } from "../../../src/modules/classes/classes.service";
import type { ClassInstanceWithDefinition } from "../../../src/modules/classes/classes.dto";

jest.mock("../../../src/modules/classes/classes.dao", () => ({
  findClasses: jest.fn(),
}));

import { findClasses } from "../../../src/modules/classes/classes.dao";

const mockFindClasses = findClasses as jest.MockedFunction<typeof findClasses>;

describe("classes.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchClasses", () => {
    const mockInstance: ClassInstanceWithDefinition = {
      id: "instance-1",
      definitionId: "class-1",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      bookedCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      definition: {
        id: "class-1",
        title: "Test Class",
        description: "Test description",
        style: DanceStyle.SALSA,
        level: DanceLevel.LEVEL_1,
        maxSpots: 20,
        durationMin: 60,
        instructorId: "instructor-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        instructor: {
          id: "instructor-1",
          name: "John Doe",
          email: "john@example.com",
        },
      },
    };

    it.each([
      {
        filter: "salsa",
        expectedWhere: { definition: { style: DanceStyle.SALSA } },
        expectedStyle: DanceStyle.SALSA,
      },
      {
        filter: "bachata",
        expectedWhere: { definition: { style: DanceStyle.BACHATA } },
        expectedStyle: DanceStyle.BACHATA,
      },
      {
        filter: "reggaeton",
        expectedWhere: { definition: { style: DanceStyle.REGGAETON } },
        expectedStyle: DanceStyle.REGGAETON,
      },
      {
        filter: "any",
        expectedWhere: {},
        expectedStyle: DanceStyle.SALSA,
      },
    ])(
      "should map '$filter' filter to correct where clause",
      async ({ filter, expectedWhere, expectedStyle }) => {
        const testInstance = {
          ...mockInstance,
          definition: {
            ...mockInstance.definition,
            style: expectedStyle,
          },
        };
        mockFindClasses.mockResolvedValue([testInstance]);

        const result = await searchClasses(filter as any);

        expect(mockFindClasses).toHaveBeenCalledWith(expectedWhere);
        expect(result).toEqual({
          classes: [testInstance],
          count: 1,
        });
      }
    );

    it("should return correct count", async () => {
      const multipleInstances = [
        mockInstance,
        { ...mockInstance, id: "instance-2" },
        { ...mockInstance, id: "instance-3" },
      ];
      mockFindClasses.mockResolvedValue(multipleInstances);

      const result = await searchClasses("any");

      expect(result.count).toBe(3);
      expect(result.classes).toHaveLength(3);
    });

    it("should format response structure correctly", async () => {
      mockFindClasses.mockResolvedValue([mockInstance]);

      const result = await searchClasses("salsa");

      expect(result).toHaveProperty("classes");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.classes)).toBe(true);
      expect(typeof result.count).toBe("number");
    });
  });
});
