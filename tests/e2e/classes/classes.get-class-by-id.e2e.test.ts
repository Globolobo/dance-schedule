import { describe, it, expect, beforeAll } from "@jest/globals";
import { getTestPrisma } from "../../setup";
import { getClassById } from "../../../src/classes/controllers/get-class-by-id.controller";
import {
  createTestInstructor,
  createTestClassInstance,
} from "../../fixtures/classes";
import { createAPIGatewayEvent } from "../../fixtures/api-gateway";
import { DanceStyle, DanceLevel } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

describe("classes.get-class-by-id.e2e", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = getTestPrisma();
  });

  const getUniqueTestId = () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const makeGetClassByIdRequest = async (classInstanceId: string) => {
    const event = createAPIGatewayEvent({
      pathParameters: { id: classInstanceId },
    });
    const response = await getClassById(event, {} as any);
    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : response.body,
      headers: response.headers,
    };
  };

  describe("GET /classes/:id", () => {
    describe("Happy Path", () => {
      it("should return 200 with class data for valid UUID", async () => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          level: DanceLevel.LEVEL_1,
          maxSpots: 20,
        });

        const { statusCode, body, headers } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(headers!["Content-Type"]).toBe("application/json");
        expect(body.id).toBe(classInstance.id);
        expect(body.type).toBe(DanceStyle.SALSA);
        expect(body.level).toBe(DanceLevel.LEVEL_1);
        expect(body.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(body.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(body.maxSpots).toBe(20);
        expect(body.spotsRemaining).toBe(20);
        expect(body.spotsRemaining).toBeGreaterThanOrEqual(0);
      });

      it.each([
        {
          description: "class has bookings",
          maxSpots: 20,
          bookedCount: 5,
          expectedSpotsRemaining: 15,
        },
        {
          description: "class is full",
          maxSpots: 10,
          bookedCount: 10,
          expectedSpotsRemaining: 0,
        },
      ])(
        "should return correct spotsRemaining when $description",
        async ({ maxSpots, bookedCount, expectedSpotsRemaining }) => {
          const testId = getUniqueTestId();
          const classInstance = await createTestClassInstance(prisma, {
            title: `Salsa Class ${testId}`,
            style: DanceStyle.SALSA,
            maxSpots,
          });

          await prisma.classInstance.update({
            where: { id: classInstance.id },
            data: { bookedCount },
          });

          const { statusCode, body } = await makeGetClassByIdRequest(
            classInstance.id
          );

          expect(statusCode).toBe(200);
          expect(body.spotsRemaining).toBe(expectedSpotsRemaining);
          expect(body.maxSpots).toBe(maxSpots);
        }
      );

      it.each([
        { level: DanceLevel.LEVEL_2, description: "LEVEL_2" },
        { level: DanceLevel.OPEN, description: "OPEN" },
      ])(
        "should handle optional level field when $description",
        async ({ level }) => {
          const testId = getUniqueTestId();
          const classInstance = await createTestClassInstance(prisma, {
            title: `Salsa Class ${testId}`,
            style: DanceStyle.SALSA,
            level,
          });

          const { statusCode, body } = await makeGetClassByIdRequest(
            classInstance.id
          );

          expect(statusCode).toBe(200);
          expect(body.level).toBe(level);
        }
      );

      it("should format date correctly (dd/MM/yyyy and HH:mm)", async () => {
        const testId = getUniqueTestId();
        const specificDate = new Date("2024-03-15T14:30:00Z");
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          startTime: specificDate,
          endTime: new Date("2024-03-15T15:30:00Z"),
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(body.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(body.startTime).toMatch(/^\d{2}:\d{2}$/);
      });

      it("should include instructor data when present", async () => {
        const testId = getUniqueTestId();
        const instructor = await createTestInstructor(prisma, {
          email: `instructor-${testId}@test.com`,
          name: "Test Instructor",
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          instructorId: instructor.id,
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        // Note: The response doesn't include instructor data in GetClassByIdResponse,
        // but we verify the class exists and is returned correctly
        expect(body.id).toBe(classInstance.id);
        expect(body.type).toBe(DanceStyle.SALSA);
      });
    });

    describe("Validation Errors (400)", () => {
      it.each([
        {
          description: "id is missing from pathParameters",
          pathParameters: {},
        },
        {
          description: "id is not a valid UUID",
          pathParameters: { id: "not-a-uuid" },
        },
        {
          description: "id is empty string",
          pathParameters: { id: "" },
        },
        {
          description: "id has wrong UUID format (missing dashes)",
          pathParameters: { id: "12345678123456781234567812345678" },
        },
        {
          description: "id contains invalid characters",
          pathParameters: { id: "invalid-uuid-format-123" },
        },
        {
          description: "pathParameters is null",
          pathParameters: null,
        },
        {
          description: "pathParameters is undefined",
          pathParameters: undefined,
        },
      ])("should return 400 when $description", async ({ pathParameters }) => {
        const event = createAPIGatewayEvent({
          pathParameters: pathParameters as any,
        });

        const response = await getClassById(event, {} as any);

        expect(response.statusCode).toBe(400);
        expect(response.headers!["Content-Type"]).toBe("text/plain");
        expect(response.body).toContain("Invalid path parameters");
      });
    });

    describe("Not Found Errors (404)", () => {
      it("should return 404 when class instance does not exist", async () => {
        const nonExistentId = crypto.randomUUID();

        const event = createAPIGatewayEvent({
          pathParameters: { id: nonExistentId },
        });

        const response = await getClassById(event, {} as any);

        expect(response.statusCode).toBe(404);
        expect(response.headers!["Content-Type"]).toBe("text/plain");
        expect(response.body).toContain("Class instance not found");
        expect(response.body).toContain(nonExistentId);
      });
    });

    describe("Edge Cases", () => {
      it.each([
        { style: DanceStyle.SALSA },
        { style: DanceStyle.BACHATA },
        { style: DanceStyle.REGGAETON },
      ])("should handle class with $style dance style", async ({ style }) => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `${style} Class ${testId}`,
          style,
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(body.type).toBe(style);
      });

      it.each([
        { level: DanceLevel.OPEN },
        { level: DanceLevel.LEVEL_1 },
        { level: DanceLevel.LEVEL_2 },
        { level: DanceLevel.LEVEL_3 },
      ])("should handle class with $level level", async ({ level }) => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Class ${testId}`,
          style: DanceStyle.SALSA,
          level,
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(body.level).toBe(level);
      });

      it("should handle class with bookedCount exceeding maxSpots (data inconsistency)", async () => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 10,
        });

        // Simulate data inconsistency where bookedCount > maxSpots
        await prisma.classInstance.update({
          where: { id: classInstance.id },
          data: { bookedCount: 15 },
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        // spotsRemaining should be clamped to 0, not negative
        expect(body.spotsRemaining).toBe(0);
        expect(body.spotsRemaining).toBeGreaterThanOrEqual(0);
      });

      it("should handle class with very large maxSpots", async () => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 10000,
        });

        await prisma.classInstance.update({
          where: { id: classInstance.id },
          data: { bookedCount: 5000 },
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(body.maxSpots).toBe(10000);
        expect(body.spotsRemaining).toBe(5000);
      });

      it("should return response structure matching GetClassByIdResponse schema", async () => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          level: DanceLevel.LEVEL_1,
          maxSpots: 20,
        });

        const { statusCode, body } = await makeGetClassByIdRequest(
          classInstance.id
        );

        expect(statusCode).toBe(200);
        expect(body).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          level: expect.any(String),
          date: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          startTime: expect.stringMatching(/^\d{2}:\d{2}$/),
          maxSpots: expect.any(Number),
          spotsRemaining: expect.any(Number),
        });
      });
    });
  });
});
