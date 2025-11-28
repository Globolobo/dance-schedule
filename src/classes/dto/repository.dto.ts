import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { DanceStyleSchema, DanceLevelSchema, InstructorInfoSchema } from "./shared";

export const ClassDefinitionWithInstructorSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  style: DanceStyleSchema,
  level: DanceLevelSchema,
  maxSpots: z.number().int(),
  durationMin: z.number().int(),
  instructorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  instructor: InstructorInfoSchema.nullable(),
});

export const ClassInstanceWithDefinitionSchema = z.object({
  id: z.uuid(),
  definitionId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  bookedCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  definition: ClassDefinitionWithInstructorSchema,
});

export const classInstanceIncludeDefinition = {
  definition: {
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
} as const satisfies Prisma.ClassInstanceInclude;

export type ClassInstanceWithDefinition = Prisma.ClassInstanceGetPayload<{
  include: typeof classInstanceIncludeDefinition;
}>;

