import { describe, it, expect, beforeAll } from "@jest/globals";
import { getTestPrisma } from "../../setup";
import { book } from "../../../src/classes/controllers/book.controller";
import {
  createTestInstructor,
  createTestClassInstance,
  createTestUser,
} from "../../fixtures/classes";
import {
  createAPIGatewayEvent,
  createPOSTEvent,
} from "../../fixtures/api-gateway";
import { DanceStyle, BookingStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

describe("classes.book.e2e", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = getTestPrisma();
  });

  const getUniqueTestId = () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const makeBookingRequest = async (
    body: { email: string; classInstanceId: string },
    headers: { "idempotency-key": string } = {
      "idempotency-key": `key-${getUniqueTestId()}`,
    }
  ) => {
    const event = createPOSTEvent("/classes/book", body, headers);
    const response = await book(event, {} as any);
    return {
      statusCode: response.statusCode,
      body: JSON.parse(response.body),
      headers: response.headers,
    };
  };

  describe("POST /classes/book", () => {
    describe("Happy Path", () => {
      it("should return 201 and create booking for valid request", async () => {
        const testId = getUniqueTestId();
        const user = await createTestUser(prisma, {
          email: `user-${testId}@test.com`,
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 20,
        });

        const idempotencyKey = `key-${testId}`;
        const { statusCode, body, headers } = await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": idempotencyKey }
        );

        expect(statusCode).toBe(201);
        expect(headers!["Content-Type"]).toBe("application/json");
        expect(body.id).toBeDefined();
        expect(body.userId).toBe(user.id);
        expect(body.classInstanceId).toBe(classInstance.id);
        expect(body.status).toBe(BookingStatus.CONFIRMED);
        expect(body.idempotencyKey).toBe(idempotencyKey);
        expect(body).toHaveProperty("user");
        expect(body).toHaveProperty("classInstance");
        expect(body.user.id).toBe(user.id);
        expect(body.classInstance.id).toBe(classInstance.id);
        expect(body.classInstance.bookedCount).toBe(1);

        // Verify booking was persisted and bookedCount incremented
        const booking = await prisma.booking.findUnique({
          where: { id: body.id },
        });
        const updatedInstance = await prisma.classInstance.findUnique({
          where: { id: classInstance.id },
        });
        expect(booking?.userId).toBe(user.id);
        expect(updatedInstance?.bookedCount).toBe(1);
      });

      it("should return same booking when idempotency key is reused", async () => {
        const testId = getUniqueTestId();
        const user = await createTestUser(prisma, {
          email: `user-${testId}@test.com`,
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 20,
        });

        const idempotencyKey = `key-${testId}`;
        const firstResponse = await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": idempotencyKey }
        );

        const secondResponse = await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": idempotencyKey }
        );

        expect(firstResponse.statusCode).toBe(201);
        expect(secondResponse.statusCode).toBe(201);
        expect(firstResponse.body.id).toBe(secondResponse.body.id);

        // Verify bookedCount was only incremented once
        const updatedInstance = await prisma.classInstance.findUnique({
          where: { id: classInstance.id },
        });
        expect(updatedInstance?.bookedCount).toBe(1);
      });

      it("should allow multiple users to book the same class", async () => {
        const testId = getUniqueTestId();
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 20,
        });

        const users = await Promise.all([
          createTestUser(prisma, { email: `user1-${testId}@test.com` }),
          createTestUser(prisma, { email: `user2-${testId}@test.com` }),
          createTestUser(prisma, { email: `user3-${testId}@test.com` }),
        ]);

        const bookings = await Promise.all(
          users.map((user, i) =>
            makeBookingRequest(
              {
                email: user.email,
                classInstanceId: classInstance.id,
              },
              { "idempotency-key": `key${i}-${testId}` }
            )
          )
        );

        bookings.forEach((booking) => {
          expect(booking.statusCode).toBe(201);
          expect(booking.body.classInstanceId).toBe(classInstance.id);
        });
        expect(bookings[0].body.userId).not.toBe(bookings[1].body.userId);
        expect(bookings[1].body.userId).not.toBe(bookings[2].body.userId);

        // Verify bookedCount was incremented correctly
        const updatedInstance = await prisma.classInstance.findUnique({
          where: { id: classInstance.id },
        });
        expect(updatedInstance?.bookedCount).toBe(3);
      });
    });

    describe("Validation Errors (400)", () => {
      it.each([
        {
          description: "missing idempotency-key header",
          headers: {},
          expectedError: "idempotency-key",
        },
        {
          description: "empty idempotency-key header",
          headers: { "idempotency-key": "" },
          expectedError: "idempotency-key",
        },
      ])(
        "should return 400 for invalid headers ($description)",
        async ({ headers, expectedError }) => {
          const event = createPOSTEvent(
            "/classes/book",
            {
              email: "test@example.com",
              classInstanceId: crypto.randomUUID(),
            },
            headers as Record<string, string>
          );

          const response = await book(event, {} as any);

          expect(response.statusCode).toBe(400);
          expect(response.headers!["Content-Type"]).toBe("text/plain");
          expect(response.body).toContain("Invalid headers");
          expect(response.body).toContain(expectedError);
        }
      );

      it.each([
        {
          description: "missing body",
          body: null,
          expectedError: "Request body is required",
        },
        {
          description: "empty body",
          body: "",
          expectedError: "Request body is required",
        },
        {
          description: "invalid JSON",
          body: "{ invalid json }",
          expectedError: "Invalid JSON",
        },
        {
          description: "non-JSON string",
          body: "not json",
          expectedError: "Invalid JSON",
        },
      ])(
        "should return 400 for invalid request body ($description)",
        async ({ body, expectedError }) => {
          const event = createAPIGatewayEvent({
            httpMethod: "POST",
            path: "/classes/book",
            headers: { "idempotency-key": "test-key" },
            body,
          });

          const response = await book(event, {} as any);

          expect(response.statusCode).toBe(400);
          expect(response.headers!["Content-Type"]).toBe("text/plain");
          expect(response.body).toContain("Invalid request body");
          expect(response.body).toContain(expectedError);
        }
      );

      it.each([
        {
          description: "missing email",
          body: { classInstanceId: crypto.randomUUID() },
          expectedError: "email",
        },
        {
          description: "invalid email format",
          body: {
            email: "not-an-email",
            classInstanceId: crypto.randomUUID(),
          },
          expectedError: "email",
        },
        {
          description: "missing classInstanceId",
          body: { email: "test@example.com" },
          expectedError: "classInstanceId",
        },
        {
          description: "invalid classInstanceId (not UUID)",
          body: {
            email: "test@example.com",
            classInstanceId: "not-a-uuid",
          },
          expectedError: "classInstanceId",
        },
        {
          description: "empty email",
          body: {
            email: "",
            classInstanceId: crypto.randomUUID(),
          },
          expectedError: "email",
        },
      ])(
        "should return 400 for invalid body fields ($description)",
        async ({ body, expectedError }) => {
          const event = createPOSTEvent("/classes/book", body, {
            "idempotency-key": "test-key",
          });

          const response = await book(event, {} as any);

          expect(response.statusCode).toBe(400);
          expect(response.headers!["Content-Type"]).toBe("text/plain");
          expect(response.body).toContain("Invalid request body");
          expect(response.body).toContain(expectedError);
        }
      );
    });

    describe("Not Found Errors (404)", () => {
      it.each([
        {
          description: "class instance does not exist",
          body: async () => ({
            email: (await createTestUser(prisma)).email,
            classInstanceId: crypto.randomUUID(),
          }),
          expectedError: "Class instance not found",
        },
        {
          description: "user does not exist",
          body: async () => {
            const classInstance = await createTestClassInstance(prisma, {
              title: `Salsa Class ${getUniqueTestId()}`,
              style: DanceStyle.SALSA,
            });
            return {
              email: `nonexistent-${getUniqueTestId()}@test.com`,
              classInstanceId: classInstance.id,
            };
          },
          expectedError: "User not found",
        },
      ])(
        "should return 404 when $description",
        async ({ body, expectedError }) => {
          const testId = getUniqueTestId();
          const requestBody = await body();

          const event = createPOSTEvent("/classes/book", requestBody, {
            "idempotency-key": `key-${testId}`,
          });

          const response = await book(event, {} as any);

          expect(response.statusCode).toBe(404);
          expect(response.headers!["Content-Type"]).toBe("text/plain");
          expect(response.body).toContain(expectedError);
        }
      );
    });

    describe("Conflict Errors (409)", () => {
      it.each([
        {
          description: "class is already full",
          setup: async () => {
            const user = await createTestUser(prisma);
            const classInstance = await createTestClassInstance(prisma, {
              title: `Salsa Class ${getUniqueTestId()}`,
              style: DanceStyle.SALSA,
              maxSpots: 2,
              bookedCount: 2,
            });
            return { user, classInstance };
          },
        },
        {
          description: "class becomes full after first booking",
          setup: async () => {
            const testId = getUniqueTestId();
            const user1 = await createTestUser(prisma, {
              email: `user1-${testId}@test.com`,
            });
            const user2 = await createTestUser(prisma, {
              email: `user2-${testId}@test.com`,
            });
            const classInstance = await createTestClassInstance(prisma, {
              title: `Salsa Class ${testId}`,
              style: DanceStyle.SALSA,
              maxSpots: 1,
              bookedCount: 0,
            });
            await makeBookingRequest(
              {
                email: user1.email,
                classInstanceId: classInstance.id,
              },
              { "idempotency-key": `key1-${testId}` }
            );
            return { user: user2, classInstance };
          },
        },
      ])("should return 409 when $description", async ({ setup }) => {
        const { user, classInstance } = await setup();
        const testId = getUniqueTestId();

        const event = createPOSTEvent(
          "/classes/book",
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": `key-${testId}` }
        );

        const response = await book(event, {} as any);

        expect(response.statusCode).toBe(409);
        expect(response.headers!["Content-Type"]).toBe("text/plain");
        expect(response.body).toContain("Class is full");
      });

      it("should return 409 when user already booked the class", async () => {
        const testId = getUniqueTestId();
        const user = await createTestUser(prisma, {
          email: `user-${testId}@test.com`,
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 20,
        });

        await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": `key1-${testId}` }
        );

        const event = createPOSTEvent(
          "/classes/book",
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": `key2-${testId}` }
        );

        const response = await book(event, {} as any);

        expect(response.statusCode).toBe(409);
        expect(response.headers!["Content-Type"]).toBe("text/plain");
        expect(response.body).toContain("User already booked this class");
      });
    });

    describe("Edge Cases", () => {
      it("should handle booking class with exactly maxSpots capacity", async () => {
        const testId = getUniqueTestId();
        const user = await createTestUser(prisma, {
          email: `user-${testId}@test.com`,
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          maxSpots: 1,
          bookedCount: 0,
        });

        const { statusCode, body } = await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": `key-${testId}` }
        );

        expect(statusCode).toBe(201);
        expect(body.classInstance.bookedCount).toBe(1);
        expect(body.classInstance.definition.maxSpots).toBe(1);
      });

      it("should handle booking class with instructor", async () => {
        const testId = getUniqueTestId();
        const instructor = await createTestInstructor(prisma, {
          email: `instructor-${testId}@test.com`,
        });
        const user = await createTestUser(prisma, {
          email: `user-${testId}@test.com`,
        });
        const classInstance = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
          instructorId: instructor.id,
          maxSpots: 20,
        });

        const { statusCode, body } = await makeBookingRequest(
          {
            email: user.email,
            classInstanceId: classInstance.id,
          },
          { "idempotency-key": `key-${testId}` }
        );

        expect(statusCode).toBe(201);
        expect(body.classInstance.definition.instructor?.id).toBe(
          instructor.id
        );
      });
    });
  });
});
