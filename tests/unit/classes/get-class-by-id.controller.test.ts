import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DanceStyle, DanceLevel } from "@prisma/client";
import { ZodError } from "zod";
import { createAPIGatewayEvent } from "../../fixtures/api-gateway";
import { ClassInstanceNotFoundError } from "../../../src/classes/domain/errors";
import type { GetClassByIdResponse } from "../../../src/classes/dto/get-class-by-id.dto";

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
const mockGetClassById = jest.fn() as jest.MockedFunction<
  (id: string) => Promise<GetClassByIdResponse>
>;
jest.mock("../../../src/classes/application/service", () => {
  return {
    ApplicationService: jest.fn().mockImplementation(() => ({
      getClassById: mockGetClassById,
    })),
  };
});

// Mock validation utility
const mockFormatValidationErrors = jest.fn((error: ZodError) => {
  return error.issues
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
});
jest.mock("../../../src/utils/validation", () => ({
  formatValidationErrors: mockFormatValidationErrors,
}));

// Import controller after mocks are set up
import { getClassById } from "../../../src/classes/controllers/get-class-by-id.controller";

describe("getClassById controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should return 200 with class data when valid UUID is provided in path parameters", async () => {
      // Arrange
      const testId = crypto.randomUUID();
      const mockResponse: GetClassByIdResponse = {
        id: testId,
        type: DanceStyle.SALSA,
        level: DanceLevel.LEVEL_1,
        date: "15/01/2024",
        startTime: "14:30",
        maxSpots: 20,
        spotsRemaining: 15,
      };

      mockGetClassById.mockResolvedValue(mockResponse);

      const event = createAPIGatewayEvent({
        pathParameters: { id: testId },
      });

      // Act
      const response = await getClassById(event, {} as any, {} as any);

      // Assert
      expect(response).toBeDefined();
      expect(response!.statusCode).toBe(200);
      expect(response!.headers!["Content-Type"]).toBe("application/json");
      const parsedBody = JSON.parse(response!.body);
      expect(parsedBody).toEqual(mockResponse);
      expect(parsedBody.id).toBe(testId);
      expect(parsedBody.type).toBe(DanceStyle.SALSA);
      expect(parsedBody.level).toBe(DanceLevel.LEVEL_1);
      expect(parsedBody.date).toBe("15/01/2024");
      expect(parsedBody.startTime).toBe("14:30");
      expect(parsedBody.maxSpots).toBe(20);
      expect(parsedBody.spotsRemaining).toBe(15);
      expect(parsedBody.spotsRemaining).toBeGreaterThanOrEqual(0);
    });

    it("should call ApplicationService.getClassById with correct id from path parameters", async () => {
      // Arrange
      const testId = crypto.randomUUID();
      const mockResponse: GetClassByIdResponse = {
        id: testId,
        type: DanceStyle.BACHATA,
        date: "15/01/2024",
        startTime: "14:30",
        maxSpots: 20,
        spotsRemaining: 10,
      };

      mockGetClassById.mockResolvedValue(mockResponse);

      const event = createAPIGatewayEvent({
        pathParameters: { id: testId },
      });

      // Act
      await getClassById(event, {} as any, {} as any);

      // Assert
      expect(mockGetClassById).toHaveBeenCalledTimes(1);
      expect(mockGetClassById).toHaveBeenCalledWith(testId);
    });
  });

  describe("Input Validation", () => {
    it.each([
      { description: "pathParameters is null", pathParameters: null },
      { description: "pathParameters is undefined", pathParameters: undefined },
      { description: "id is missing from pathParameters", pathParameters: {} },
      {
        description: "id is not a valid UUID",
        pathParameters: { id: "not-a-uuid" },
      },
      { description: "id is empty string", pathParameters: { id: "" } },
      {
        description: "id has wrong UUID format (missing dashes)",
        pathParameters: { id: "12345678123456781234567812345678" },
      },
      {
        description: "id contains malicious input",
        pathParameters: { id: "<script>alert('xss')</script>" },
      },
    ])("should return 400 when $description", async ({ pathParameters }) => {
      // Arrange
      const event = createAPIGatewayEvent({
        pathParameters: pathParameters as any,
      });

      // Act
      const response = await getClassById(event, {} as any, {} as any);

      // Assert
      expect(response).toBeDefined();
      expect(response!.statusCode).toBe(400);
      expect(response!.body).toContain("Invalid path parameters");
    });
  });

  describe("Error Handling", () => {
    it("should handle NotFoundError and convert to 404 status code", async () => {
      // Arrange
      const testId = crypto.randomUUID();
      mockGetClassById.mockRejectedValue(
        new ClassInstanceNotFoundError(testId)
      );
      const event = createAPIGatewayEvent({ pathParameters: { id: testId } });

      // Act
      const response = await getClassById(event, {} as any, {} as any);

      // Assert
      expect(response).toBeDefined();
      expect(response!.statusCode).toBe(404);
      expect(response!.body).toContain("Class instance not found");
    });

    it.each([
      {
        errorFactory: () => new Error("Database connection timeout"),
        errorMessage: "Database connection timeout",
        description: "database timeout/connection loss",
      },
      {
        errorFactory: () => new Error("Unexpected error"),
        errorMessage: "Unexpected error",
        description: "unhandled Promise rejections",
      },
      {
        errorFactory: () => new TypeError("Unexpected type error"),
        errorMessage: "Unexpected type error",
        description: "repository throws unexpected error",
      },
    ])(
      "should handle $description gracefully",
      async ({ errorFactory, errorMessage }) => {
        // Arrange
        const testId = crypto.randomUUID();
        const error = errorFactory();
        mockGetClassById.mockRejectedValue(error);
        const event = createAPIGatewayEvent({ pathParameters: { id: testId } });

        // Act
        const response = await getClassById(event, {} as any, {} as any);

        // Assert
        // httpErrorHandler converts errors to 500 responses
        expect(response).toBeDefined();
        expect(response!.statusCode).toBe(500);
        // Error was handled by httpErrorHandler (body format may vary)
      }
    );
  });
});
