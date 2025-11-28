import type { User } from "@prisma/client";
import { prisma } from "../../client";
import type { IUserRepository } from "../interfaces/user.repository.interface";

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }
}
