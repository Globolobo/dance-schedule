import { UserRole } from "@prisma/client";
import { prisma } from "../src/client";
import { regularUsers } from "./seed-data";

export async function seedUsers(): Promise<Map<string, string>> {
  await prisma.user.createMany({
    data: regularUsers.map((user) => ({
      email: user.email,
      name: user.name,
      role: UserRole.STUDENT,
    })),
    skipDuplicates: true,
  });

  const userRecords = await prisma.user.findMany({
    where: { email: { in: regularUsers.map((u) => u.email) } },
  });

  userRecords.forEach((user) => {
    console.log(`User ready: ${user.email}`);
  });

  return new Map(userRecords.map(({ email, id }) => [email, id]));
}
