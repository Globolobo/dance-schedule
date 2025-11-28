import { DanceStyle, UserRole } from "@prisma/client";
import { prisma } from "../src/client";
import { instructorMappings } from "./seed-data";

export async function seedInstructors(): Promise<Map<DanceStyle, string>> {
  await prisma.user.createMany({
    data: instructorMappings.map((instructor) => ({
      email: instructor.email,
      name: instructor.name,
      role: UserRole.INSTRUCTOR,
    })),
    skipDuplicates: true,
  });

  const instructorRecords = await prisma.user.findMany({
    where: { email: { in: instructorMappings.map((i) => i.email) } },
  });

  instructorRecords.forEach((instructor) => {
    console.log(`Instructor ready: ${instructor.email}`);
  });

  const instructorResults = instructorMappings.map((mapping) => {
    const record = instructorRecords.find((r) => r.email === mapping.email);
    return { style: mapping.style, id: record!.id };
  });

  return new Map(instructorResults.map(({ style, id }) => [style, id]));
}
