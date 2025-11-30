import { z } from "zod";
import { DanceStyleSchema, DanceLevelSchema } from "./shared";

export const GetClassByIdPathParamsSchema = z.object({
  id: z.uuid(),
});

export type GetClassByIdPathParams = z.infer<
  typeof GetClassByIdPathParamsSchema
>;

export const GetClassByIdResponseSchema = z.object({
  id: z.uuid(),
  type: DanceStyleSchema,
  level: DanceLevelSchema.optional(),
  date: z.string(),
  startTime: z.string(),
  maxSpots: z.number().int(),
  spotsRemaining: z.number().int(),
});

export type GetClassByIdResponse = z.infer<typeof GetClassByIdResponseSchema>;
