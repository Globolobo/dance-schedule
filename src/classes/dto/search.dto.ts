import { z } from "zod";
import { DanceStyle } from "@prisma/client";
import { DanceStyleFilterSchema, type DanceStyleFilter } from "./shared";
import { ClassInstanceWithDefinitionSchema } from "./repository.dto";

export const SearchQueryParamsSchema = z.object({
  type: DanceStyleFilterSchema.default("any"),
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
