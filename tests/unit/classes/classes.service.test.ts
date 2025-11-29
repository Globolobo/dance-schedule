import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  DanceStyle,
  DanceLevel,
  BookingStatus,
  UserRole,
} from "@prisma/client";
import { ApplicationService } from "../../../src/classes/application/service";
import type { ClassInstanceWithDefinition } from "../../../src/classes/dto/repository.dto";
import type { BookingWithRelations } from "../../../src/classes/dto/booking.dto";
import type { IClassInstanceRepository } from "../../../src/classes/interfaces/class-instance.repository.interface";
import type { IUserRepository } from "../../../src/classes/interfaces/user.repository.interface";
import type { IBookingRepository } from "../../../src/classes/interfaces/booking.repository.interface";
import {
  ClassInstanceNotFoundError,
  UserNotFoundError,
  ClassFullError,
  DuplicateBookingError,
} from "../../../src/classes/domain/errors";

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
    const instanceId = crypto.randomUUID();
    const definitionId = crypto.randomUUID();
    const instructorId = crypto.randomUUID();
    const mockInstance: ClassInstanceWithDefinition = {
      id: instanceId,
      definitionId,
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      bookedCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      definition: {
        id: definitionId,
        title: "Test Class",
        description: "Test description",
        style: DanceStyle.SALSA,
        level: DanceLevel.LEVEL_1,
        maxSpots: 20,
        durationMin: 60,
        instructorId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        instructor: {
          id: instructorId,
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
      const instanceId2 = crypto.randomUUID();
      const instanceId3 = crypto.randomUUID();
      const multipleInstances = [
        mockInstance,
        { ...mockInstance, id: instanceId2 },
        { ...mockInstance, id: instanceId3 },
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

  describe("bookClass", () => {
    const userId = crypto.randomUUID();
    const classInstanceId = crypto.randomUUID();
    const definitionId = crypto.randomUUID();
    const instructorId = crypto.randomUUID();
    const bookingId = crypto.randomUUID();
    const email = "test@example.com";
    const idempotencyKey = `idempotency-key-${crypto.randomUUID()}`;

    const mockUser = {
      id: userId,
      name: "Test User",
      email,
      role: UserRole.STUDENT,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const mockClassInstance: ClassInstanceWithDefinition = {
      id: classInstanceId,
      definitionId,
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      bookedCount: 5,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      definition: {
        id: definitionId,
        title: "Test Class",
        description: "Test description",
        style: DanceStyle.SALSA,
        level: DanceLevel.LEVEL_1,
        maxSpots: 20,
        durationMin: 60,
        instructorId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        instructor: {
          id: instructorId,
          name: "John Doe",
          email: "john@example.com",
        },
      },
    };

    const mockBooking: BookingWithRelations = {
      id: bookingId,
      userId,
      classInstanceId,
      status: BookingStatus.CONFIRMED,
      idempotencyKey,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      user: {
        id: userId,
        name: "Test User",
        email,
      },
      classInstance: mockClassInstance,
    };

    it("should create booking when all validations pass", async () => {
      mockClassInstanceRepository.findById.mockResolvedValue(mockClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBookingRepository.findByUserAndClass.mockResolvedValue(null);
      mockBookingRepository.createWithTransaction.mockResolvedValue(
        mockBooking
      );

      const result = await applicationService.bookClass({
        email,
        classInstanceId,
        idempotencyKey,
      });

      expect(result).toEqual(mockBooking);
      expect(mockClassInstanceRepository.findById).toHaveBeenCalledWith(
        classInstanceId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBookingRepository.findByUserAndClass).toHaveBeenCalledWith(
        userId,
        classInstanceId
      );
      expect(mockBookingRepository.createWithTransaction).toHaveBeenCalledWith({
        userId,
        classInstanceId,
        idempotencyKey,
        email,
      });
    });

    it("should fetch class instance and user in parallel", async () => {
      mockClassInstanceRepository.findById.mockResolvedValue(mockClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBookingRepository.findByUserAndClass.mockResolvedValue(null);
      mockBookingRepository.createWithTransaction.mockResolvedValue(
        mockBooking
      );

      await applicationService.bookClass({
        email,
        classInstanceId,
        idempotencyKey,
      });

      // Verify both calls were made (they should be in parallel)
      expect(mockClassInstanceRepository.findById).toHaveBeenCalled();
      expect(mockUserRepository.findByEmail).toHaveBeenCalled();
    });

    it("should throw ClassInstanceNotFoundError when class instance not found", async () => {
      mockClassInstanceRepository.findById.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        applicationService.bookClass({
          email,
          classInstanceId,
          idempotencyKey,
        })
      ).rejects.toThrow(ClassInstanceNotFoundError);

      expect(mockClassInstanceRepository.findById).toHaveBeenCalledWith(
        classInstanceId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBookingRepository.findByUserAndClass).not.toHaveBeenCalled();
      expect(
        mockBookingRepository.createWithTransaction
      ).not.toHaveBeenCalled();
    });

    it("should throw UserNotFoundError when user not found", async () => {
      mockClassInstanceRepository.findById.mockResolvedValue(mockClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        applicationService.bookClass({
          email,
          classInstanceId,
          idempotencyKey,
        })
      ).rejects.toThrow(UserNotFoundError);

      expect(mockClassInstanceRepository.findById).toHaveBeenCalledWith(
        classInstanceId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBookingRepository.findByUserAndClass).not.toHaveBeenCalled();
      expect(
        mockBookingRepository.createWithTransaction
      ).not.toHaveBeenCalled();
    });

    it("should throw ClassFullError when class is full", async () => {
      const fullClassInstance = {
        ...mockClassInstance,
        bookedCount: 20, // maxSpots is 20
      };

      mockClassInstanceRepository.findById.mockResolvedValue(fullClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        applicationService.bookClass({
          email,
          classInstanceId,
          idempotencyKey,
        })
      ).rejects.toThrow(ClassFullError);

      expect(mockClassInstanceRepository.findById).toHaveBeenCalledWith(
        classInstanceId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBookingRepository.findByUserAndClass).not.toHaveBeenCalled();
      expect(
        mockBookingRepository.createWithTransaction
      ).not.toHaveBeenCalled();
    });

    it("should throw ClassFullError when bookedCount equals maxSpots", async () => {
      const fullClassInstance = {
        ...mockClassInstance,
        bookedCount: 20, // equals maxSpots
      };

      mockClassInstanceRepository.findById.mockResolvedValue(fullClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        applicationService.bookClass({
          email,
          classInstanceId,
          idempotencyKey,
        })
      ).rejects.toThrow(ClassFullError);
    });

    it("should throw DuplicateBookingError when user already booked", async () => {
      const existingBookingId = crypto.randomUUID();
      const existingBooking = {
        id: existingBookingId,
        userId,
        classInstanceId,
        status: BookingStatus.CONFIRMED,
        idempotencyKey: `old-key-${crypto.randomUUID()}`,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockClassInstanceRepository.findById.mockResolvedValue(mockClassInstance);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBookingRepository.findByUserAndClass.mockResolvedValue(
        existingBooking as any
      );

      await expect(
        applicationService.bookClass({
          email,
          classInstanceId,
          idempotencyKey,
        })
      ).rejects.toThrow(DuplicateBookingError);

      expect(mockClassInstanceRepository.findById).toHaveBeenCalledWith(
        classInstanceId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBookingRepository.findByUserAndClass).toHaveBeenCalledWith(
        userId,
        classInstanceId
      );
      expect(
        mockBookingRepository.createWithTransaction
      ).not.toHaveBeenCalled();
    });
  });
});
