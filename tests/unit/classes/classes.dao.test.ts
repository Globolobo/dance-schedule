import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DanceStyle, DanceLevel } from "@prisma/client";
import { findClasses } from "../../../src/modules/classes/classes.dao";
import type { ClassInstanceWithDefinition } from "../../../src/modules/classes/classes.dto";

jest.mock("../../../src/client", () => ({
  prisma: {
    classInstance: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "../../../src/client";

interface CreateMockInstanceParams {
  instanceId?: string;
  definitionId?: string;
  startTime?: Date;
  endTime?: Date;
  bookedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  definition?: {
    id?: string;
    title?: string;
    description?: string | null;
    style?: DanceStyle;
    level?: DanceLevel;
    maxSpots?: number;
    durationMin?: number;
    instructorId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    instructor?: {
      id?: string;
      name?: string;
      email?: string;
    } | null;
  };
}

function createMockInstance(
  params: CreateMockInstanceParams = {}
): ClassInstanceWithDefinition {
  const {
    instanceId = "instance-1",
    definitionId = "class-1",
    startTime = new Date("2024-01-01T10:00:00Z"),
    endTime = new Date("2024-01-01T11:00:00Z"),
    bookedCount = 0,
    createdAt = new Date("2024-01-01"),
    updatedAt = new Date("2024-01-01"),
    definition: definitionParams = {},
  } = params;

  const {
    id: defId = definitionId,
    title = "Salsa Class",
    description = "A salsa class",
    style = DanceStyle.SALSA,
    level = DanceLevel.LEVEL_1,
    maxSpots = 20,
    durationMin = 60,
    instructorId = "instructor-1",
    createdAt: defCreatedAt = createdAt,
    updatedAt: defUpdatedAt = updatedAt,
    instructor: instructorParam = {
      id: instructorId,
      name: "John Doe",
      email: "john@example.com",
    },
  } = definitionParams;

  return {
    id: instanceId,
    definitionId: defId,
    startTime,
    endTime,
    bookedCount,
    createdAt,
    updatedAt,
    definition: {
      id: defId,
      title,
      description,
      style,
      level,
      maxSpots,
      durationMin,
      instructorId,
      createdAt: defCreatedAt,
      updatedAt: defUpdatedAt,
      instructor: instructorParam,
    },
  } as ClassInstanceWithDefinition;
}

function createMockInstances(
  count: number,
  params: CreateMockInstanceParams = {}
): ClassInstanceWithDefinition[] {
  return Array.from({ length: count }, (_, index) =>
    createMockInstance({
      ...params,
      instanceId: params.instanceId || `instance-${index + 1}`,
      definitionId: params.definitionId || `class-${index + 1}`,
    })
  );
}

describe("classes.dao", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findClasses", () => {
    it("should return class instances with definition and instructor relation", async () => {
      const mockInstances = [createMockInstance()];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const result = await findClasses({});

      expect(result).toEqual(mockInstances);
      expect(mockPrisma.classInstance.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          definition: {
            include: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });

    it("should apply where clause correctly", async () => {
      const mockInstances = [
        createMockInstance({
          definition: {
            description: null,
            instructor: null,
          },
        }),
      ];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const where = { definition: { style: DanceStyle.SALSA } };
      const result = await findClasses(where);

      expect(result).toEqual(mockInstances);
      expect(mockPrisma.classInstance.findMany).toHaveBeenCalledWith({
        where,
        include: {
          definition: {
            include: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });

    it("should order by createdAt desc", async () => {
      const mockInstances: ClassInstanceWithDefinition[] = [];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      await findClasses({});

      expect(mockPrisma.classInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: "desc",
          },
        })
      );
    });

    it("should handle empty results", async () => {
      const mockInstances: ClassInstanceWithDefinition[] = [];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const result = await findClasses({});

      expect(result).toEqual([]);
      expect(mockPrisma.classInstance.findMany).toHaveBeenCalled();
    });

    it("should handle null instructor", async () => {
      const mockInstances = [
        createMockInstance({
          definition: {
            description: null,
            instructor: null,
          },
        }),
      ];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const result = await findClasses({});

      expect(result).toEqual(mockInstances);
      expect(result[0].definition.instructor).toBeNull();
    });

    it("should handle null instructorId in definition", async () => {
      const mockInstances = [
        createMockInstance({
          definition: {
            description: null,
            instructor: null,
          },
        }),
      ];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const result = await findClasses({});

      expect(result).toEqual(mockInstances);
      expect(result[0].definition.instructor).toBeNull();
    });
  });
});
