import { ZodError } from "zod";

export function formatValidationErrors(error: ZodError): string {
  return error.issues
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
}
