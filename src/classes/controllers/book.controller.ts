import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import {
  BookClassRequestBodySchema,
  BookClassHeadersSchema,
} from "../dto/booking.dto";
import { formatValidationErrors } from "../../utils/validation";
import { ApplicationService } from "../application/service";
import { PrismaClassInstanceRepository } from "../repositories/implementations/prisma-class-instance.repository";
import { PrismaUserRepository } from "../repositories/implementations/prisma-user.repository";
import { PrismaBookingRepository } from "../repositories/implementations/prisma-booking.repository";
import { NotFoundError, ConflictError } from "../domain/errors";

// Initialize application service with dependencies
const applicationService = new ApplicationService(
  new PrismaClassInstanceRepository(),
  new PrismaUserRepository(),
  new PrismaBookingRepository()
);

const bookHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Validate headers
  const headersValidation = BookClassHeadersSchema.safeParse(event.headers);

  if (!headersValidation.success) {
    const errorMessage = formatValidationErrors(headersValidation.error);
    throw createError(400, `Invalid headers: ${errorMessage}`);
  }

  const { "idempotency-key": idempotencyKey } = headersValidation.data;

  // Validate and parse request body
  const bodyValidation = BookClassRequestBodySchema.safeParse(event.body || "");

  if (!bodyValidation.success) {
    const errorMessage = formatValidationErrors(bodyValidation.error);
    throw createError(400, `Invalid request body: ${errorMessage}`);
  }

  const { email, classInstanceId } = bodyValidation.data;

  try {
    const booking = await applicationService.bookClass({
      email,
      classInstanceId,
      idempotencyKey,
    });

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(booking),
    };
  } catch (error) {
    // Map domain errors to HTTP errors using instanceof checks
    if (error instanceof NotFoundError) {
      throw createError(error.statusCode, error.message);
    }

    if (error instanceof ConflictError) {
      throw createError(error.statusCode, error.message);
    }

    throw error;
  }
};

export const book = middy(bookHandler).use(httpErrorHandler());
