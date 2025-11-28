import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { search } from "../../../src/modules/classes/classes.controller";
import { DanceStyle, DanceLevel } from "@prisma/client";
import { createGETEvent } from "../../fixtures/api-gateway";

jest.mock("../../../src/modules/classes/classes.service", () => ({
  searchClasses: jest.fn(),
}));

import { searchClasses } from "../../../src/modules/classes/classes.service";

const mockSearchClasses = searchClasses as jest.MockedFunction<
  typeof searchClasses
>;

describe("classes.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchHandler", () => {
    it("should return 200 with JSON body for valid query params", async () => {
      const mockResult = {
        classes: [
          {
            id: "instance-1",
            definitionId: "class-1",
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T11:00:00Z"),
            bookedCount: 0,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            definition: {
              id: "class-1",
              title: "Salsa Class",
              description: "A salsa class",
              style: DanceStyle.SALSA,
              level: DanceLevel.LEVEL_1,
              maxSpots: 20,
              durationMin: 60,
              instructorId: "instructor-1",
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date("2024-01-01"),
              instructor: {
                id: "instructor-1",
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
      expect(parsedBody.classes[0].id).toBe("instance-1");
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
});
