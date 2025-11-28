import { DanceStyle } from "@prisma/client";
import { addDays, addHours } from "date-fns";
import { prisma } from "../src/client";
import { classDefinitions, weeklySchedule } from "./seed-data";
import { getWeekStart, getDayInWeek, createDateTime } from "./seed-helpers";

export async function seedClassDefinitions(
  instructorMap: Map<DanceStyle, string>
): Promise<Map<string, string>> {
  // Prepare data with instructor IDs
  const classDefData = classDefinitions.map((classDef) => {
    const instructorId = instructorMap.get(classDef.style);
    if (!instructorId) {
      throw new Error(`No instructor found for dance style: ${classDef.style}`);
    }
    return {
      title: classDef.title,
      style: classDef.style,
      level: classDef.level,
      instructorId: instructorId,
    };
  });

  // Create all class definitions (skip duplicates)
  await prisma.classDefinition.createMany({
    data: classDefData,
    skipDuplicates: true,
  });

  // Fetch all class definitions to get IDs
  const classDefRecords = await prisma.classDefinition.findMany({
    where: {
      OR: classDefinitions.map((classDef) => ({
        title: classDef.title,
        style: classDef.style,
        level: classDef.level,
      })),
    },
  });

  classDefRecords.forEach((record) => {
    console.log(`Class definition ready: ${record.title}`);
  });

  return new Map(classDefRecords.map(({ title, id }) => [title, id]));
}

export async function seedWeeklySchedules(
  classDefMap: Map<string, string>
): Promise<void> {
  const scheduleEntries = weeklySchedule.flatMap((daySchedule) =>
    daySchedule.slots
      .map((slot) => ({
        daySchedule,
        slot,
        classId: classDefMap.get(slot.className),
      }))
      .filter(
        (entry): entry is typeof entry & { classId: string } =>
          entry.classId !== undefined
      )
  );

  await prisma.weeklySchedule.createMany({
    data: scheduleEntries.map(({ daySchedule, slot, classId }) => ({
      definitionId: classId,
      dayOfWeek: daySchedule.day,
      startTime: slot.time,
      durationMinutes: 60,
    })),
    skipDuplicates: true,
  });

  scheduleEntries.forEach(({ daySchedule, slot }) => {
    console.log(
      `WeeklySchedule ready: ${daySchedule.day} ${slot.time} - ${slot.className}`
    );
  });
}

export async function seedClassInstances(
  classDefMap: Map<string, string>,
  weekCount: number
): Promise<void> {
  const today = new Date();
  const weekStart = getWeekStart(today);

  const weekOffsets = Array.from({ length: weekCount }, (_, i) => i);
  const classInstanceEntries = weekOffsets.flatMap((weekOffset) => {
    const currentWeekStart = addDays(weekStart, weekOffset * 7);

    return weeklySchedule.flatMap((daySchedule) => {
      const classDate = getDayInWeek(currentWeekStart, daySchedule.day);

      return daySchedule.slots
        .map((slot) => ({
          slot,
          classId: classDefMap.get(slot.className),
          classDate,
        }))
        .filter(
          (entry): entry is typeof entry & { classId: string } =>
            entry.classId !== undefined
        );
    });
  });

  await prisma.classInstance.createMany({
    data: classInstanceEntries.map(({ slot, classId, classDate }) => {
      const startTime = createDateTime(classDate, slot.time);
      const endTime = addHours(startTime, 1);
      return {
        definitionId: classId,
        startTime: startTime,
        endTime: endTime,
      };
    }),
    skipDuplicates: true,
  });

  classInstanceEntries.forEach(({ slot, classDate }) => {
    const startTime = createDateTime(classDate, slot.time);
    console.log(
      `ClassInstance ready: ${slot.className} on ${startTime.toISOString()}`
    );
  });
}
