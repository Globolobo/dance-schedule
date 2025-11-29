import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DanceStyle } from "@prisma/client";
import { PrismaClassInstanceRepository } from "../../../src/classes/repositories/prisma-class-instance.repository";
import type { ClassInstanceWithDefinition } from "../../../src/classes/dto/repository.dto";
import { createMockInstance } from "../../mocks";

jest.mock("../../../src/client", () => ({
  prisma: {
    classInstance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "../../../src/client";

describe("PrismaClassInstanceRepository", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  let repository: PrismaClassInstanceRepository;

  beforeEach(() => {
    repository = new PrismaClassInstanceRepository();
    jest.clearAllMocks();
  });

  describe("findMany", () => {
    it("should return class instances with definition and instructor relation", async () => {
      const mockInstances = [createMockInstance()];

      mockPrisma.classInstance.findMany.mockResolvedValue(mockInstances as any);

      const result = await repository.findMany({});

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
      const result = await repository.findMany(where);

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

      await repository.findMany({});

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

      const result = await repository.findMany({});

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

      const result = await repository.findMany({});

      expect(result).toEqual(mockInstances);
      expect(result[0].definition.instructor).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return class instance when found", async () => {
      const instanceId = crypto.randomUUID();
      const mockInstance = createMockInstance({ instanceId });
      mockPrisma.classInstance.findUnique.mockResolvedValue(
        mockInstance as any
      );

      const result = await repository.findById(instanceId);

      expect(result).toEqual(mockInstance);
      expect(mockPrisma.classInstance.findUnique).toHaveBeenCalledWith({
        where: { id: instanceId },
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
      });
    });

    it("should return null when not found", async () => {
      mockPrisma.classInstance.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent");

      expect(result).toBeNull();
    });
  });
});
