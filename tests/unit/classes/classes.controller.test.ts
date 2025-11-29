import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DanceStyle, DanceLevel } from "@prisma/client";
import {
  createGETEvent,
  createAPIGatewayEvent,
} from "../../fixtures/api-gateway";
import {
  ClassInstanceNotFoundError,
  UserNotFoundError,
  ClassFullError,
  DuplicateBookingError,
} from "../../../src/classes/domain/errors";

import { mockSearchClasses, mockBookClass } from "../../mocks";

// Mock the client to prevent database connections
jest.mock("../../../src/client", () => ({
  prisma: {
    classInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock the application service before importing the controller
jest.mock("../../../src/classes/application/service", () => {
  return {
    ApplicationService: jest.fn().mockImplementation(() => ({
      searchClasses: mockSearchClasses,
      bookClass: mockBookClass,
    })),
  };
});

// Import controller after mocks are set up
import { search } from "../../../src/classes/controllers/search.controller";
import { book } from "../../../src/classes/controllers/book.controller";

describe("controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchHandler", () => {
    it("should return 200 with JSON body for valid query params", async () => {
      const instanceId = crypto.randomUUID();
      const definitionId = crypto.randomUUID();
      const instructorId = crypto.randomUUID();
      const mockResult = {
        classes: [
          {
            id: instanceId,
            definitionId,
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T11:00:00Z"),
            bookedCount: 0,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            definition: {
              id: definitionId,
              title: "Salsa Class",
              description: "A salsa class",
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
        ],
        count: 1,
      };

      mockSearchClasses.mockResolvedValue(mockResult);

      const event = createGETEvent("/classes/search", { type: "salsa" });
      const response = await search(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(response.headers!["Content-Type"]).toBe("application/json");
      const parsedBody = JSON.parse(response.body);
      expect(parsedBody.classes).toHaveLength(1);
      expect(parsedBody.classes[0].id).toBe(instanceId);
      expect(parsedBody.classes[0].definition.title).toBe("Salsa Class");
      expect(parsedBody.count).toBe(1);
      expect(mockSearchClasses).toHaveBeenCalledWith("salsa");
    });

    it("should return 400 with formatted error for invalid query params", async () => {
      const event = createGETEvent("/classes/search", {
        type: "invalid-style",
      });

      const response = await search(event, {} as any);

      expect(response.statusCode).toBe(400);
      expect(response.headers!["Content-Type"]).toBe("text/plain");
      expect(response.body).toContain("Invalid query parameters");
      expect(response.body).toContain("Invalid option: expected one of");

      expect(mockSearchClasses).not.toHaveBeenCalled();
    });

    it("should normalize type to lowercase", async () => {
      const mockResult = { classes: [], count: 0 };
      mockSearchClasses.mockResolvedValue(mockResult);

      const event = createGETEvent("/classes/search", { type: "SALSA" });
      const response = await search(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(mockSearchClasses).toHaveBeenCalledWith("salsa");
    });

    it("should default type to 'any' when missing", async () => {
      const mockResult = { classes: [], count: 0 };
      mockSearchClasses.mockResolvedValue(mockResult);

      const event = createGETEvent("/classes/search", {});
      const response = await search(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(response.headers!["Content-Type"]).toBe("application/json");
      expect(mockSearchClasses).toHaveBeenCalledWith("any");
    });
  });

  describe("bookHandler", () => {
    it("should return 201 with booking for valid request", async () => {
      // Use crypto.randomUUID() which is available in Node.js 22+
      const bookingId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const classInstanceId = crypto.randomUUID();
      const definitionId = crypto.randomUUID();
      const instructorId = crypto.randomUUID();

      const mockBooking = {
        id: bookingId,
        userId,
        classInstanceId,
        status: "CONFIRMED" as const,
        idempotencyKey: "key-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
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
          bookedCount: 1,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          definition: {
            id: definitionId,
            title: "Salsa Class",
            description: "A salsa class",
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
      };

      mockBookClass.mockResolvedValue(mockBooking);

      const event = createAPIGatewayEvent({
        httpMethod: "POST",
        path: "/classes/book",
        headers: { "idempotency-key": "key-1" },
        body: JSON.stringify({
          email: "test@example.com",
          classInstanceId,
        }),
      });

      const response = await book(event, {} as any);

      expect(response.statusCode).toBe(201);
      expect(response.headers!["Content-Type"]).toBe("application/json");
      const parsedBody = JSON.parse(response.body);
      expect(parsedBody.id).toBe(bookingId);
      expect(mockBookClass).toHaveBeenCalledWith({
        email: "test@example.com",
        classInstanceId,
        idempotencyKey: "key-1",
      });
    });

    it("should map ClassInstanceNotFoundError to 404", async () => {
      const classInstanceId = crypto.randomUUID();
      mockBookClass.mockRejectedValue(
        new ClassInstanceNotFoundError(classInstanceId)
      );

      const event = createAPIGatewayEvent({
        httpMethod: "POST",
        path: "/classes/book",
        headers: { "idempotency-key": "key-1" },
        body: JSON.stringify({
          email: "test@example.com",
          classInstanceId,
        }),
      });

      const response = await book(event, {} as any);

      expect(response.statusCode).toBe(404);
      expect(response.body).toContain("Class instance not found:");
    });

    it("should map UserNotFoundError to 404", async () => {
      const classInstanceId = crypto.randomUUID();
      mockBookClass.mockRejectedValue(
        new UserNotFoundError("test@example.com")
      );

      const event = createAPIGatewayEvent({
        httpMethod: "POST",
        path: "/classes/book",
        headers: { "idempotency-key": "key-1" },
        body: JSON.stringify({
          email: "test@example.com",
          classInstanceId,
        }),
      });

      const response = await book(event, {} as any);

      expect(response.statusCode).toBe(404);
      expect(response.body).toContain("User not found:");
    });

    it("should map ClassFullError to 409", async () => {
      const classInstanceId = crypto.randomUUID();
      mockBookClass.mockRejectedValue(new ClassFullError(classInstanceId));

      const event = createAPIGatewayEvent({
        httpMethod: "POST",
        path: "/classes/book",
        headers: { "idempotency-key": "key-1" },
        body: JSON.stringify({
          email: "test@example.com",
          classInstanceId,
        }),
      });

      const response = await book(event, {} as any);

      expect(response.statusCode).toBe(409);
      expect(response.body).toContain("Class is full:");
    });

    it("should map DuplicateBookingError to 409", async () => {
      const userId = crypto.randomUUID();
      const classInstanceId = crypto.randomUUID();
      mockBookClass.mockRejectedValue(
        new DuplicateBookingError(userId, classInstanceId)
      );

      const event = createAPIGatewayEvent({
        httpMethod: "POST",
        path: "/classes/book",
        headers: { "idempotency-key": "key-1" },
        body: JSON.stringify({
          email: "test@example.com",
          classInstanceId,
        }),
      });

      const response = await book(event, {} as any);

      expect(response.statusCode).toBe(409);
      expect(response.body).toContain("User already booked this class:");
    });
  });
});
