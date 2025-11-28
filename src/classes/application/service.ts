import type { DanceStyleFilter } from "../dto/shared";
import type { SearchResponse } from "../dto/search.dto";
import { DANCE_STYLE_MAP } from "../dto/search.dto";
import type { BookingWithRelations } from "../dto/booking.dto";
import type { IClassInstanceRepository } from "../repositories/interfaces/class-instance.repository.interface";
import type { IUserRepository } from "../repositories/interfaces/user.repository.interface";
import type { IBookingRepository } from "../repositories/interfaces/booking.repository.interface";
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

  async bookClass(params: BookClassParams): Promise<BookingWithRelations> {
    // Fetch class instance and user in parallel
    const [classInstance, user] = await Promise.all([
      this.classInstanceRepository.findById(params.classInstanceId),
      this.userRepository.findByEmail(params.email),
    ]);

    // Validate entities exist
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

    // Check for existing booking
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
