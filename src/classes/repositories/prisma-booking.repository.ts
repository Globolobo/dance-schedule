import { BookingStatus } from "@prisma/client";
import { prisma } from "../../client";
import type {
  IBookingRepository,
  CreateBookingParams,
} from "../interfaces/booking.repository.interface";
import type { BookingWithRelations } from "../dto/booking.dto";
import { classInstanceIncludeDefinition } from "../dto/repository.dto";

export class PrismaBookingRepository implements IBookingRepository {
  async findByUserAndClass(userId: string, classInstanceId: string) {
    return await prisma.booking.findUnique({
      where: {
        userId_classInstanceId: {
          userId,
          classInstanceId,
        },
      },
    });
  }

  async findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<BookingWithRelations | null> {
    const booking = await prisma.booking.findFirst({
      where: {
        idempotencyKey,
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
          include: classInstanceIncludeDefinition,
        },
      },
    });

    return booking as BookingWithRelations | null;
  }

  async createWithTransaction(
    params: CreateBookingParams
  ): Promise<BookingWithRelations> {
    return await prisma.$transaction(async (tx) => {
      const existingBooking = await tx.booking.findFirst({
        where: {
          OR: [
            { idempotencyKey: params.idempotencyKey },
            {
              user: {
                email: params.email,
              },
              classInstanceId: params.classInstanceId,
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
            include: classInstanceIncludeDefinition,
          },
        },
      });

      if (existingBooking) {
        return existingBooking as BookingWithRelations;
      }

      const booking = await tx.booking.create({
        data: {
          userId: params.userId,
          classInstanceId: params.classInstanceId,
          idempotencyKey: params.idempotencyKey,
          status: params.status || BookingStatus.CONFIRMED,
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
            include: classInstanceIncludeDefinition,
          },
        },
      });

      await tx.classInstance.update({
        where: { id: params.classInstanceId },
        data: {
          bookedCount: {
            increment: 1,
          },
        },
      });

      const updatedBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classInstance: {
            include: classInstanceIncludeDefinition,
          },
        },
      });

      return updatedBooking as BookingWithRelations;
    });
  }
}
