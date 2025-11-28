import { z } from "zod";
import { DanceStyle, DanceLevel, BookingStatus } from "@prisma/client";

const danceStyleValues = Object.values(DanceStyle).map((v) =>
  v.toLowerCase()
) as string[];

export const DanceStyleFilterSchema = z.enum([
  ...danceStyleValues,
  "any",
] as unknown as [string, ...string[]]);

export type DanceStyleFilter = z.infer<typeof DanceStyleFilterSchema>;

export const InstructorInfoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});

export const DanceStyleSchema = z.enum(Object.values(DanceStyle) as [DanceStyle, ...DanceStyle[]]);
export const DanceLevelSchema = z.enum(Object.values(DanceLevel) as [DanceLevel, ...DanceLevel[]]);
export const BookingStatusSchema = z.enum([
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED,
]);
