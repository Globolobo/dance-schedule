import type { Booking, BookingStatus } from "@prisma/client";
import type { BookingWithRelations } from "../dto/booking.dto";

export interface CreateBookingParams {
  userId: string;
  classInstanceId: string;
  idempotencyKey: string;
  email: string;
  status?: BookingStatus;
}

export interface IBookingRepository {
  findByUserAndClass(
    userId: string,
    classInstanceId: string
  ): Promise<Booking | null>;
  findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<BookingWithRelations | null>;
  createWithTransaction(
    params: CreateBookingParams
  ): Promise<BookingWithRelations>;
}
