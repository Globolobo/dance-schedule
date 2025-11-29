import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { BookingStatus } from "@prisma/client";
import { PrismaBookingRepository } from "../../../src/classes/repositories/prisma-booking.repository";
import { createMockBooking, createMockBookingWithRelations } from "../../mocks";

jest.mock("../../../src/client", () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    classInstance: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "../../../src/client";

describe("PrismaBookingRepository", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  let repository: PrismaBookingRepository;

  beforeEach(() => {
    repository = new PrismaBookingRepository();
    jest.clearAllMocks();
  });

  describe("findByUserAndClass", () => {
    it("should return booking when found", async () => {
      const userId = crypto.randomUUID();
      const classInstanceId = crypto.randomUUID();
      const mockBooking = createMockBooking({ userId, classInstanceId });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await repository.findByUserAndClass(
        userId,
        classInstanceId
      );

      expect(result).toEqual(mockBooking);
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: {
          userId_classInstanceId: {
            userId,
            classInstanceId,
          },
        },
      });
    });

    it("should return null when not found", async () => {
      const userId = crypto.randomUUID();
      const classInstanceId = crypto.randomUUID();
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserAndClass(
        userId,
        classInstanceId
      );

      expect(result).toBeNull();
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: {
          userId_classInstanceId: {
            userId,
            classInstanceId,
          },
        },
      });
    });
  });

  describe("createWithTransaction", () => {
    const userId = crypto.randomUUID();
    const classInstanceId = crypto.randomUUID();
    const idempotencyKey = `idempotency-key-${crypto.randomUUID()}`;
    const createParams = {
      userId,
      classInstanceId,
      idempotencyKey,
      email: "test@example.com",
    };

    it("should create new booking and increment bookedCount when no existing booking", async () => {
      const mockBooking = createMockBookingWithRelations();
      const mockCreatedBooking = createMockBookingWithRelations({
        classInstance: {
          ...mockBooking.classInstance,
          bookedCount: 1,
        },
      });

      const mockTransaction: any = {
        booking: {
          // @ts-ignore - Mock function for testing
          findFirst: jest.fn().mockResolvedValue(null),
          // @ts-ignore - Mock function for testing
          create: jest.fn().mockResolvedValue(mockBooking),
          // @ts-ignore - Mock function for testing
          findUnique: jest.fn().mockResolvedValue(mockCreatedBooking),
        },
        classInstance: {
          // @ts-ignore - Mock function for testing
          update: jest.fn().mockResolvedValue({}),
        },
      };

      // @ts-ignore - Mock implementation for testing
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        // @ts-ignore - Mock callback type
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }
      );

      const result = await repository.createWithTransaction(createParams);

      expect(result).toEqual(mockCreatedBooking);
      expect(mockTransaction.booking.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { idempotencyKey: createParams.idempotencyKey },
            {
              user: {
                email: createParams.email,
              },
              classInstanceId: createParams.classInstanceId,
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
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
          },
        },
      });
      expect(mockTransaction.booking.create).toHaveBeenCalledWith({
        data: {
          userId: createParams.userId,
          classInstanceId: createParams.classInstanceId,
          idempotencyKey: createParams.idempotencyKey,
          status: BookingStatus.CONFIRMED,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
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
          },
        },
      });
      expect(mockTransaction.classInstance.update).toHaveBeenCalledWith({
        where: { id: createParams.classInstanceId },
        data: {
          bookedCount: {
            increment: 1,
          },
        },
      });
      expect(mockTransaction.booking.findUnique).toHaveBeenCalledWith({
        where: { id: mockBooking.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
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
          },
        },
      });
    });

    it("should return existing booking when idempotency key matches", async () => {
      const existingBooking = createMockBookingWithRelations({
        idempotencyKey: createParams.idempotencyKey,
      });

      const mockTransaction: any = {
        booking: {
          // @ts-ignore - Mock function for testing
          findFirst: jest.fn().mockResolvedValue(existingBooking),
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        classInstance: {
          update: jest.fn(),
        },
      };

      // @ts-ignore - Mock implementation for testing
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        // @ts-ignore - Mock callback type
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }
      );

      const result = await repository.createWithTransaction(createParams);

      expect(result).toEqual(existingBooking);
      expect(mockTransaction.booking.findFirst).toHaveBeenCalled();
      expect(mockTransaction.booking.create).not.toHaveBeenCalled();
      expect(mockTransaction.classInstance.update).not.toHaveBeenCalled();
    });

    it("should return existing booking when user already booked the class", async () => {
      const existingBooking = createMockBookingWithRelations({
        userId: createParams.userId,
        classInstanceId: createParams.classInstanceId,
      });

      const mockTransaction: any = {
        booking: {
          // @ts-ignore - Mock function for testing
          findFirst: jest.fn().mockResolvedValue(existingBooking),
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        classInstance: {
          update: jest.fn(),
        },
      };

      // @ts-ignore - Mock implementation for testing
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        // @ts-ignore - Mock callback type
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }
      );

      const result = await repository.createWithTransaction(createParams);

      expect(result).toEqual(existingBooking);
      expect(mockTransaction.booking.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { idempotencyKey: createParams.idempotencyKey },
            {
              user: {
                email: createParams.email,
              },
              classInstanceId: createParams.classInstanceId,
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
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
          },
        },
      });
      expect(mockTransaction.booking.create).not.toHaveBeenCalled();
      expect(mockTransaction.classInstance.update).not.toHaveBeenCalled();
    });

    it("should use custom status when provided", async () => {
      const mockBooking = createMockBookingWithRelations({
        status: BookingStatus.CANCELLED,
      });
      const mockCreatedBooking = createMockBookingWithRelations({
        status: BookingStatus.CANCELLED,
      });

      const mockTransaction: any = {
        booking: {
          // @ts-ignore - Mock function for testing
          findFirst: jest.fn().mockResolvedValue(null),
          // @ts-ignore - Mock function for testing
          create: jest.fn().mockResolvedValue(mockBooking),
          // @ts-ignore - Mock function for testing
          findUnique: jest.fn().mockResolvedValue(mockCreatedBooking),
        },
        classInstance: {
          // @ts-ignore - Mock function for testing
          update: jest.fn().mockResolvedValue({}),
        },
      };

      // @ts-ignore - Mock implementation for testing
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        // @ts-ignore - Mock callback type
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }
      );

      await repository.createWithTransaction({
        ...createParams,
        status: BookingStatus.CANCELLED,
      });

      expect(mockTransaction.booking.create).toHaveBeenCalledWith({
        data: {
          userId: createParams.userId,
          classInstanceId: createParams.classInstanceId,
          idempotencyKey: createParams.idempotencyKey,
          status: BookingStatus.CANCELLED,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
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
          },
        },
      });
    });

    it("should default to CONFIRMED status when not provided", async () => {
      const mockBooking = createMockBookingWithRelations();
      const mockCreatedBooking = createMockBookingWithRelations();

      const mockTransaction: any = {
        booking: {
          // @ts-ignore - Mock function for testing
          findFirst: jest.fn().mockResolvedValue(null),
          // @ts-ignore - Mock function for testing
          create: jest.fn().mockResolvedValue(mockBooking),
          // @ts-ignore - Mock function for testing
          findUnique: jest.fn().mockResolvedValue(mockCreatedBooking),
        },
        classInstance: {
          // @ts-ignore - Mock function for testing
          update: jest.fn().mockResolvedValue({}),
        },
      };

      // @ts-ignore - Mock implementation for testing
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        // @ts-ignore - Mock callback type
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }
      );

      await repository.createWithTransaction(createParams);

      expect(mockTransaction.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookingStatus.CONFIRMED,
          }),
        })
      );
    });
  });
});
