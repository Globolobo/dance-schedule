import { jest } from "@jest/globals";
import {
  DanceStyle,
  DanceLevel,
  BookingStatus,
  UserRole,
  type User,
  type Booking,
} from "@prisma/client";
import type { ClassInstanceWithDefinition } from "../../src/classes/dto/repository.dto";
import type { BookingWithRelations } from "../../src/classes/dto/booking.dto";
import type { DanceStyleFilter } from "../../src/classes/dto/shared";
import type { SearchResponse } from "../../src/classes/dto/search.dto";
import type { BookClassParams } from "../../src/classes/application/service";

// ============================================================================
// Prisma Client Mocks
// ============================================================================

export const createMockPrismaClient = () => ({
  classInstance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
});

// Factory function for jest.mock - creates a new instance each time
export const getMockPrismaClient = () => createMockPrismaClient();

// ============================================================================
// Application Service Mocks
// ============================================================================

export const mockSearchClasses = jest.fn() as jest.MockedFunction<
  (typeFilter: DanceStyleFilter) => Promise<SearchResponse>
>;

export const mockBookClass = jest.fn() as jest.MockedFunction<
  (params: BookClassParams) => Promise<BookingWithRelations>
>;

// ============================================================================
// Mock Data Creation Functions
// ============================================================================

export interface CreateMockUserParams {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createMockUser(params: Partial<User> = {}): User {
  return {
    id: params.id || crypto.randomUUID(),
    name: params.name || "Test User",
    email: params.email || "test@example.com",
    role: params.role || UserRole.STUDENT,
    createdAt: params.createdAt || new Date("2024-01-01"),
    updatedAt: params.updatedAt || new Date("2024-01-01"),
  } as User;
}

export interface CreateMockInstanceParams {
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

export function createMockInstance(
  params: CreateMockInstanceParams = {}
): ClassInstanceWithDefinition {
  const defaultDefinitionId = crypto.randomUUID();
  const defaultInstructorId = crypto.randomUUID();
  const {
    instanceId = crypto.randomUUID(),
    definitionId = defaultDefinitionId,
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
    instructorId = defaultInstructorId,
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

export interface CreateMockBookingParams {
  id?: string;
  userId?: string;
  classInstanceId?: string;
  status?: BookingStatus;
  idempotencyKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createMockBooking(params: Partial<Booking> = {}): Booking {
  return {
    id: params.id || crypto.randomUUID(),
    userId: params.userId || crypto.randomUUID(),
    classInstanceId: params.classInstanceId || crypto.randomUUID(),
    status: params.status || BookingStatus.CONFIRMED,
    idempotencyKey:
      params.idempotencyKey || `idempotency-key-${crypto.randomUUID()}`,
    createdAt: params.createdAt || new Date("2024-01-01"),
    updatedAt: params.updatedAt || new Date("2024-01-01"),
  };
}

export function createMockBookingWithRelations(
  params: Partial<BookingWithRelations> = {}
): BookingWithRelations {
  const bookingId = params.id || crypto.randomUUID();
  const userId = params.userId || crypto.randomUUID();
  const classInstanceId = params.classInstanceId || crypto.randomUUID();
  const definitionId = crypto.randomUUID();
  const instructorId = crypto.randomUUID();

  return {
    id: bookingId,
    userId,
    classInstanceId,
    status: params.status || BookingStatus.CONFIRMED,
    idempotencyKey:
      params.idempotencyKey || `idempotency-key-${crypto.randomUUID()}`,
    createdAt: params.createdAt || new Date("2024-01-01"),
    updatedAt: params.updatedAt || new Date("2024-01-01"),
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
    },
    classInstance: {
      id: classInstanceId,
      definitionId,
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      bookedCount: params.classInstance?.bookedCount || 1,
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
    },
    ...params,
  };
}
