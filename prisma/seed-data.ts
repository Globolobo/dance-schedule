import { DanceStyle, DanceLevel, DayOfWeek } from "@prisma/client";

// Regular users (students)
export const regularUsers = [
  { email: "alpha@example.com", name: "Alpha User" },
  { email: "beta@example.com", name: "Beta User" },
];

// Instructor mappings
export const instructorMappings = [
  {
    email: "gamma@example.com",
    name: "Salsa Instructor",
    style: DanceStyle.SALSA,
  },
  {
    email: "delta@example.com",
    name: "Bachata Instructor",
    style: DanceStyle.BACHATA,
  },
  {
    email: "epsilon@example.com",
    name: "Reggaeton Instructor",
    style: DanceStyle.REGGAETON,
  },
];

// Class definitions mapping
export const classDefinitions = [
  {
    title: "Bachata 1",
    style: DanceStyle.BACHATA,
    level: DanceLevel.LEVEL_1,
  },
  {
    title: "Bachata 2",
    style: DanceStyle.BACHATA,
    level: DanceLevel.LEVEL_2,
  },
  {
    title: "Salsa 1",
    style: DanceStyle.SALSA,
    level: DanceLevel.LEVEL_1,
  },
  {
    title: "Salsa 2",
    style: DanceStyle.SALSA,
    level: DanceLevel.LEVEL_2,
  },
  {
    title: "Salsa 3",
    style: DanceStyle.SALSA,
    level: DanceLevel.LEVEL_3,
  },
  {
    title: "Reggaeton",
    style: DanceStyle.REGGAETON,
    level: DanceLevel.OPEN,
  },
];

// Weekly schedule template
export const weeklySchedule = [
  {
    day: DayOfWeek.MONDAY,
    slots: [
      { time: "18:30", className: "Bachata 1" },
      { time: "19:30", className: "Bachata 2" },
      { time: "20:30", className: "Salsa 3" },
    ],
  },
  {
    day: DayOfWeek.TUESDAY,
    slots: [
      { time: "18:30", className: "Salsa 1" },
      { time: "19:30", className: "Salsa 2" },
      { time: "20:30", className: "Reggaeton" },
    ],
  },
  {
    day: DayOfWeek.WEDNESDAY,
    slots: [
      { time: "18:30", className: "Bachata 1" },
      { time: "19:30", className: "Bachata 2" },
      { time: "20:30", className: "Salsa 3" },
    ],
  },
  {
    day: DayOfWeek.THURSDAY,
    slots: [
      { time: "18:30", className: "Salsa 1" },
      { time: "19:30", className: "Salsa 2" },
      // 20:30 - no class
    ],
  },
  {
    day: DayOfWeek.FRIDAY,
    slots: [
      { time: "18:30", className: "Reggaeton" },
      { time: "19:30", className: "Salsa 3" },
      // 20:30 - no class
    ],
  },
];
