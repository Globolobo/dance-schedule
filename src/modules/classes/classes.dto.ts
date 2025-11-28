import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { DanceStyle, DanceLevel } from "@prisma/client";

const danceStyleValues = Object.values(DanceStyle).map((v) =>
  v.toLowerCase()
) as string[];

export const DanceStyleFilterSchema = z.enum([
  ...danceStyleValues,
  "any",
] as unknown as [string, ...string[]]);

export type DanceStyleFilter = z.infer<typeof DanceStyleFilterSchema>;

export const SearchQueryParamsSchema = z.object({
  type: DanceStyleFilterSchema.default("any"),
});

export const InstructorInfoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});

export const DanceStyleSchema = z.enum(DanceStyle);
export const DanceLevelSchema = z.enum(DanceLevel);

export const ClassWithInstructorSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  style: DanceStyleSchema,
  level: DanceLevelSchema,
  maxSpots: z.number().int(),
  durationMin: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  instructor: InstructorInfoSchema.nullable(),
});

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

export const SearchResponseSchema = z.object({
  classes: z.array(ClassInstanceWithDefinitionSchema),
  count: z.number(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const DANCE_STYLE_MAP: Record<
  Exclude<DanceStyleFilter, "any">,
  DanceStyle
> = {
  salsa: DanceStyle.SALSA,
  bachata: DanceStyle.BACHATA,
  reggaeton: DanceStyle.REGGAETON,
};

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
