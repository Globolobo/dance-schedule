import "dotenv/config";
import { prisma } from "../src/client";
import { seedUsers } from "./seed-users";
import { seedInstructors } from "./seed-instructors";
import {
  seedClassDefinitions,
  seedWeeklySchedules,
  seedClassInstances,
} from "./seed-classes";
import { isDevOrTest, cleanupSeedData } from "./seed-helpers";

async function main() {
  console.log("Starting database seed...");

  if (isDevOrTest()) {
    await cleanupSeedData();
  }

  await seedUsers();
  const instructorMap = await seedInstructors();
  const classDefMap = await seedClassDefinitions(instructorMap);
  await seedWeeklySchedules(classDefMap);
  await seedClassInstances(classDefMap, 4);

  console.log("Database seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
