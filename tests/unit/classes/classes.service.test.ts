import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DanceStyle, DanceLevel } from "@prisma/client";
import { ApplicationService } from "../../../src/classes/application/service";
import type { ClassInstanceWithDefinition } from "../../../src/classes/dto/repository.dto";
import type { IClassInstanceRepository } from "../../../src/classes/interfaces/class-instance.repository.interface";
import type { IUserRepository } from "../../../src/classes/interfaces/user.repository.interface";
import type { IBookingRepository } from "../../../src/classes/interfaces/booking.repository.interface";

describe("ApplicationService", () => {
  let applicationService: ApplicationService;
  let mockClassInstanceRepository: jest.Mocked<IClassInstanceRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockBookingRepository: jest.Mocked<IBookingRepository>;

  beforeEach(() => {
    mockClassInstanceRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
    };
    mockUserRepository = {
      findByEmail: jest.fn(),
    };
    mockBookingRepository = {
      findByUserAndClass: jest.fn(),
      createWithTransaction: jest.fn(),
    };

    applicationService = new ApplicationService(
      mockClassInstanceRepository,
      mockUserRepository,
      mockBookingRepository
    );

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
        mockClassInstanceRepository.findMany.mockResolvedValue([testInstance]);

        const result = await applicationService.searchClasses(filter as any);

        expect(mockClassInstanceRepository.findMany).toHaveBeenCalledWith(
          expectedWhere
        );
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
      mockClassInstanceRepository.findMany.mockResolvedValue(multipleInstances);

      const result = await applicationService.searchClasses("any");

      expect(result.count).toBe(3);
      expect(result.classes).toHaveLength(3);
    });

    it("should format response structure correctly", async () => {
      mockClassInstanceRepository.findMany.mockResolvedValue([mockInstance]);

      const result = await applicationService.searchClasses("salsa");

      expect(result).toHaveProperty("classes");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.classes)).toBe(true);
      expect(typeof result.count).toBe("number");
    });
  });
});
