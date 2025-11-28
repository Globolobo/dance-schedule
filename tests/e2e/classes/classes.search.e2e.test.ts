import { describe, it, expect, beforeAll } from "@jest/globals";
import { getTestPrisma } from "../../setup";
import { search } from "../../../src/modules/classes/classes.controller";
import {
  createTestInstructor,
  createTestClassInstance,
} from "../../fixtures/classes";
import { createGETEvent } from "../../fixtures/api-gateway";
import { DanceStyle } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

describe("classes.search.e2e", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = getTestPrisma();
  });

  const getUniqueTestId = () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const makeSearchRequest = async (
    queryParams: Record<string, string> = {}
  ) => {
    const event = createGETEvent("/classes/search", queryParams);
    const response = await search(event, {} as any);
    return {
      statusCode: response.statusCode,
      body: JSON.parse(response.body),
      headers: response.headers,
    };
  };

  describe("GET /classes/search", () => {
    it("should return 200 for valid request with type=salsa", async () => {
      const testId = getUniqueTestId();
      const testSalsa = await createTestClassInstance(prisma, {
        title: `Salsa Class ${testId}`,
        style: DanceStyle.SALSA,
      });
      await createTestClassInstance(prisma, {
        title: `Bachata Class ${testId}`,
        style: DanceStyle.BACHATA,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "salsa" });

      expect(statusCode).toBe(200);
      expect(body.classes.length).toBeGreaterThanOrEqual(1);
      expect(
        body.classes.every((c) => c.definition.style === DanceStyle.SALSA)
      ).toBe(true);
      expect(body.count).toBe(body.classes.length);

      const foundTestInstance = body.classes.find((c) => c.id === testSalsa.id);
      expect(foundTestInstance).toBeDefined();
    });

    it("should return 200 for valid request with type=any", async () => {
      const testId = getUniqueTestId();
      const testSalsa = await createTestClassInstance(prisma, {
        title: `Salsa Class ${testId}`,
        style: DanceStyle.SALSA,
      });
      const testBachata = await createTestClassInstance(prisma, {
        title: `Bachata Class ${testId}`,
        style: DanceStyle.BACHATA,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "any" });

      expect(statusCode).toBe(200);
      expect(body.classes.length).toBeGreaterThanOrEqual(2);
      expect(body.count).toBe(body.classes.length);

      const testInstanceIds = [testSalsa.id, testBachata.id];
      const foundTestInstances = body.classes.filter((c) =>
        testInstanceIds.includes(c.id)
      );
      expect(foundTestInstances).toHaveLength(2);
    });

    it("should default to 'any' when type is missing", async () => {
      const testId = getUniqueTestId();
      const testSalsa = await createTestClassInstance(prisma, {
        title: `Salsa Class ${testId}`,
        style: DanceStyle.SALSA,
      });
      const testBachata = await createTestClassInstance(prisma, {
        title: `Bachata Class ${testId}`,
        style: DanceStyle.BACHATA,
      });

      const { statusCode, body } = await makeSearchRequest({});

      expect(statusCode).toBe(200);
      expect(body.classes.length).toBeGreaterThanOrEqual(2);

      const testInstanceIds = [testSalsa.id, testBachata.id];
      const foundTestInstances = body.classes.filter((c) =>
        testInstanceIds.includes(c.id)
      );
      expect(foundTestInstances).toHaveLength(2);
    });

    it("should return 400 for invalid type value", async () => {
      const event = createGETEvent("/classes/search", {
        type: "invalid-style",
      });

      const response = await search(event, {} as any);

      expect(response.statusCode).toBe(400);
      expect(response.headers!["Content-Type"]).toBe("text/plain");
      expect(response.body).toContain("Invalid query parameters");
      expect(response.body).toContain("Invalid option: expected one of");
    });

    it.each([
      { input: "SALSA", description: "uppercase" },
      { input: "salsa", description: "lowercase" },
      { input: "SaLsA", description: "mixed case" },
    ])(
      "should handle case-insensitive type values ($description)",
      async ({ input }) => {
        const testId = getUniqueTestId();
        const testSalsa = await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
        });

        const { statusCode, body } = await makeSearchRequest({ type: input });

        expect(statusCode).toBe(200);
        expect(body.classes.length).toBeGreaterThanOrEqual(1);
        expect(
          body.classes.every((c) => c.definition.style === DanceStyle.SALSA)
        ).toBe(true);

        const foundTestInstance = body.classes.find(
          (c) => c.id === testSalsa.id
        );
        expect(foundTestInstance).toBeDefined();
      }
    );

    it("should return response structure matching SearchResponse schema", async () => {
      const testId = getUniqueTestId();
      await createTestClassInstance(prisma, {
        title: `Salsa Class ${testId}`,
        style: DanceStyle.SALSA,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "salsa" });

      expect(statusCode).toBe(200);
      expect(body).toHaveProperty("classes");
      expect(body).toHaveProperty("count");
      expect(Array.isArray(body.classes)).toBe(true);
      expect(typeof body.count).toBe("number");
      expect(body.count).toBe(body.classes.length);
      expect(body.classes.length).toBeGreaterThan(0);
    });

    it("should include instructor data when present", async () => {
      const testId = getUniqueTestId();
      const instructor = await createTestInstructor(prisma, {
        email: `instructor-${testId}@test.com`,
        name: "Test Instructor",
      });

      const testInstance = await createTestClassInstance(prisma, {
        title: `Class with Instructor ${testId}`,
        style: DanceStyle.SALSA,
        instructorId: instructor.id,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "salsa" });

      expect(statusCode).toBe(200);
      const foundInstance = body.classes.find((c) => c.id === testInstance.id);
      expect(foundInstance).toBeDefined();
      expect(foundInstance!.definition.instructor).not.toBeNull();
      expect(foundInstance!.definition.instructor.id).toBe(instructor.id);
      expect(foundInstance!.definition.instructor.name).toBe("Test Instructor");
      expect(foundInstance!.definition.instructor.email).toBe(
        `instructor-${testId}@test.com`
      );
    });

    it("should include instructor data in results", async () => {
      const testId = getUniqueTestId();
      const testInstance = await createTestClassInstance(prisma, {
        title: `Class with Instructor ${testId}`,
        style: DanceStyle.SALSA,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "salsa" });

      expect(statusCode).toBe(200);
      const foundInstance = body.classes.find((c) => c.id === testInstance.id);
      expect(foundInstance).toBeDefined();
      expect(foundInstance!.definition.instructor).not.toBeNull();
    });

    it("should return multiple classes in correct order (newest first)", async () => {
      const testId = getUniqueTestId();
      const firstInstance = await createTestClassInstance(prisma, {
        title: `First Class ${testId}`,
        style: DanceStyle.SALSA,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondInstance = await createTestClassInstance(prisma, {
        title: `Second Class ${testId}`,
        style: DanceStyle.SALSA,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const thirdInstance = await createTestClassInstance(prisma, {
        title: `Third Class ${testId}`,
        style: DanceStyle.SALSA,
      });

      const { statusCode, body } = await makeSearchRequest({ type: "salsa" });

      expect(statusCode).toBe(200);
      const testInstanceIds = [
        firstInstance.id,
        secondInstance.id,
        thirdInstance.id,
      ];
      const foundInstances = body.classes.filter((c) =>
        testInstanceIds.includes(c.id)
      );

      expect(foundInstances).toHaveLength(3);
      const foundIds = foundInstances.map((c) => c.id);
      expect(foundIds[0]).toBe(thirdInstance.id);
      expect(foundIds[1]).toBe(secondInstance.id);
      expect(foundIds[2]).toBe(firstInstance.id);
    });

    it("should return results with seed data", async () => {
      const { statusCode, body, headers } = await makeSearchRequest({
        type: "salsa",
      });

      expect(statusCode).toBe(200);
      expect(headers!["Content-Type"]).toBe("application/json");
      expect(body.classes.length).toBeGreaterThan(0);
      expect(body.count).toBe(body.classes.length);
      expect(
        body.classes.every((c) => c.definition.style === DanceStyle.SALSA)
      ).toBe(true);
    });

    it.each([
      { filter: "bachata", style: DanceStyle.BACHATA, title: "Bachata Class" },
      {
        filter: "reggaeton",
        style: DanceStyle.REGGAETON,
        title: "Reggaeton Class",
      },
    ])(
      "should handle danceStyle filter correctly",
      async ({ filter, style, title }) => {
        const testId = getUniqueTestId();
        const testInstance = await createTestClassInstance(prisma, {
          title: `${title} ${testId}`,
          style,
        });
        await createTestClassInstance(prisma, {
          title: `Salsa Class ${testId}`,
          style: DanceStyle.SALSA,
        });

        const { statusCode, body } = await makeSearchRequest({ type: filter });

        expect(statusCode).toBe(200);
        expect(body.classes.length).toBeGreaterThanOrEqual(1);
        expect(body.classes.every((c) => c.definition.style === style)).toBe(
          true
        );

        const foundTestInstance = body.classes.find(
          (c) => c.id === testInstance.id
        );
        expect(foundTestInstance).toBeDefined();
      }
    );
  });
});
