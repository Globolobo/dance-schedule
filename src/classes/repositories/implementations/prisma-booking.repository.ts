import { BookingStatus } from "@prisma/client";
import { prisma } from "../../../client";
import type {
  IBookingRepository,
  CreateBookingParams,
} from "../interfaces/booking.repository.interface";
import type { BookingWithRelations } from "../../dto/booking.dto";
import { classInstanceIncludeDefinition } from "../../dto/repository.dto";

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

  async createWithTransaction(
    params: CreateBookingParams
  ): Promise<BookingWithRelations> {
    return await prisma.$transaction(async (tx) => {
      // Check if booking with this idempotency key OR email already exists
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

      // Create booking and increment count atomically
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

      // Increment bookedCount
      await tx.classInstance.update({
        where: { id: params.classInstanceId },
        data: {
          bookedCount: {
            increment: 1,
          },
        },
      });

      // Re-fetch the booking with updated classInstance
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
