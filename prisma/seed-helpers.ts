import { DayOfWeek } from "@prisma/client";
import { addDays, startOfWeek, setHours, setMinutes } from "date-fns";
import { prisma } from "../src/client";

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
}

export function getDayInWeek(weekStart: Date, dayOfWeek: DayOfWeek): Date {
  const dayMap: Record<DayOfWeek, number> = {
    [DayOfWeek.MONDAY]: 0,
    [DayOfWeek.TUESDAY]: 1,
    [DayOfWeek.WEDNESDAY]: 2,
    [DayOfWeek.THURSDAY]: 3,
    [DayOfWeek.FRIDAY]: 4,
    [DayOfWeek.SATURDAY]: 5,
    [DayOfWeek.SUNDAY]: 6,
  };

  return addDays(weekStart, dayMap[dayOfWeek]);
}

export function createDateTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

export function isDevOrTest(): boolean {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  return (
    nodeEnv === "development" ||
    nodeEnv === "dev" ||
    nodeEnv === "test" ||
    !nodeEnv // Default to dev if not set
  );
}

export async function cleanupSeedData() {
  console.log("Cleaning up existing seed data...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "Booking",
      "ClassInstance",
      "WeeklySchedule",
      "ClassDefinition",
      "User"
    RESTART IDENTITY CASCADE;
  `);

  console.log("All tables truncated successfully");
}
