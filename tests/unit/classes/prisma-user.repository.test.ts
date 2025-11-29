import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { PrismaUserRepository } from "../../../src/classes/repositories/prisma-user.repository";
import { createMockUser } from "../../mocks";

jest.mock("../../../src/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "../../../src/client";

describe("PrismaUserRepository", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  let repository: PrismaUserRepository;

  beforeEach(() => {
    repository = new PrismaUserRepository();
    jest.clearAllMocks();
  });

  describe("findByEmail", () => {
    it("should return user when found", async () => {
      const mockUser = createMockUser({ email: "test@example.com" });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return null when not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "nonexistent@example.com" },
      });
    });

    it("should use correct email in query", async () => {
      const mockUser = createMockUser({ email: "specific@example.com" });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await repository.findByEmail("specific@example.com");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "specific@example.com" },
      });
    });
  });
});
