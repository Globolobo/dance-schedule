import { z } from "zod";
import { InstructorInfoSchema, BookingStatusSchema } from "./shared";
import { ClassInstanceWithDefinitionSchema } from "./repository.dto";

export const BookClassRequestSchema = z.object({
  email: z.email(),
  classInstanceId: z.uuid(),
});

export type BookClassRequest = z.infer<typeof BookClassRequestSchema>;

export const BookClassHeadersSchema = z.object({
  "idempotency-key": z.string().min(1, "idempotency-key header is required"),
});

export type BookClassHeaders = z.infer<typeof BookClassHeadersSchema>;

export const BookClassRequestBodySchema = z
  .string()
  .min(1, "Request body is required")
  .transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid JSON in request body",
      });
      return z.NEVER;
    }
  })
  .pipe(BookClassRequestSchema);

export const BookingWithRelationsSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  classInstanceId: z.uuid(),
  status: BookingStatusSchema,
  idempotencyKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: InstructorInfoSchema,
  classInstance: ClassInstanceWithDefinitionSchema,
});

export type BookingWithRelations = z.infer<typeof BookingWithRelationsSchema>;
