import "dotenv/config";
import { execSync } from "child_process";

export default async function globalSetup() {
  const DATABASE_TEST_URL = process.env.DATABASE_TEST_URL;

  console.log("DATABASE_TEST_URL:", DATABASE_TEST_URL);

  if (!DATABASE_TEST_URL) {
    throw new Error("DATABASE_TEST_URL must be set in environment");
  }

  process.env.DATABASE_URL = DATABASE_TEST_URL;

  console.log("Running database migrations...");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: DATABASE_TEST_URL },
    stdio: "inherit",
  });

  console.log("Seeding database...");
  execSync("tsx prisma/seed.ts", {
    env: { ...process.env, DATABASE_URL: DATABASE_TEST_URL },
    stdio: "inherit",
  });

  console.log("Database setup complete!");
}
