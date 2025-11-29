import { format } from "date-fns";
import type { DanceStyleFilter } from "../dto/shared";
import type { SearchResponse } from "../dto/search.dto";
import { DANCE_STYLE_MAP } from "../dto/search.dto";
import type { BookingWithRelations } from "../dto/booking.dto";
import type { GetClassByIdResponse } from "../dto/get-class-by-id.dto";
import type { IClassInstanceRepository } from "../interfaces/class-instance.repository.interface";
import type { IUserRepository } from "../interfaces/user.repository.interface";
import type { IBookingRepository } from "../interfaces/booking.repository.interface";
import {
  ClassInstanceNotFoundError,
  UserNotFoundError,
  DuplicateBookingError,
  ClassFullError,
} from "../domain/errors";

export interface BookClassParams {
  email: string;
  classInstanceId: string;
  idempotencyKey: string;
}

export class ApplicationService {
  constructor(
    private readonly classInstanceRepository: IClassInstanceRepository,
    private readonly userRepository: IUserRepository,
    private readonly bookingRepository: IBookingRepository
  ) {}

  async searchClasses(typeFilter: DanceStyleFilter): Promise<SearchResponse> {
    const where =
      typeFilter !== "any"
        ? { definition: { style: DANCE_STYLE_MAP[typeFilter] } }
        : {};

    const classes = await this.classInstanceRepository.findMany(where);

    return {
      classes,
      count: classes.length,
    };
  }

  async getClassById(id: string): Promise<GetClassByIdResponse> {
    const classInstance = await this.classInstanceRepository.findById(id);

    if (!classInstance) {
      throw new ClassInstanceNotFoundError(id);
    }

    const {
      id: instanceId,
      startTime,
      bookedCount,
      definition,
    } = classInstance;
    const { style, level, maxSpots } = definition;

    const date = format(startTime, "dd/MM/yyyy");
    const time = format(startTime, "HH:mm");
    const spotsRemaining = Math.max(0, maxSpots - bookedCount);

    return {
      id: instanceId,
      type: style,
      level,
      date,
      startTime: time,
      maxSpots,
      spotsRemaining,
    };
  }

  async bookClass(params: BookClassParams): Promise<BookingWithRelations> {
    const [classInstance, user] = await Promise.all([
      this.classInstanceRepository.findById(params.classInstanceId),
      this.userRepository.findByEmail(params.email),
    ]);

    if (!classInstance) {
      throw new ClassInstanceNotFoundError(params.classInstanceId);
    }

    if (!user) {
      throw new UserNotFoundError(params.email);
    }

    // Validate class is not full
    if (classInstance.bookedCount >= classInstance.definition.maxSpots) {
      throw new ClassFullError(classInstance.id);
    }

    // Check for idempotency first - if same idempotency key is used, return existing booking
    const existingBookingByIdempotency =
      await this.bookingRepository.findByIdempotencyKey(params.idempotencyKey);

    if (existingBookingByIdempotency) {
      return existingBookingByIdempotency;
    }

    // Check for duplicate booking (different idempotency key but same user+class)
    const existingBooking = await this.bookingRepository.findByUserAndClass(
      user.id,
      classInstance.id
    );

    if (existingBooking) {
      throw new DuplicateBookingError(user.id, classInstance.id);
    }

    // Create booking atomically
    const booking = await this.bookingRepository.createWithTransaction({
      userId: user.id,
      classInstanceId: classInstance.id,
      idempotencyKey: params.idempotencyKey,
      email: params.email,
    });

    return booking;
  }
}
