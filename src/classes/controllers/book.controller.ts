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
import { PrismaClassInstanceRepository } from "../repositories/prisma-class-instance.repository";
import { PrismaUserRepository } from "../repositories/prisma-user.repository";
import { PrismaBookingRepository } from "../repositories/prisma-booking.repository";
import { NotFoundError, ConflictError } from "../domain/errors";

const applicationService = new ApplicationService(
  new PrismaClassInstanceRepository(),
  new PrismaUserRepository(),
  new PrismaBookingRepository()
);

const bookHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headersValidation = BookClassHeadersSchema.safeParse(event.headers);

  if (!headersValidation.success) {
    const errorMessage = formatValidationErrors(headersValidation.error);
    throw createError(400, `Invalid headers: ${errorMessage}`);
  }

  const { "idempotency-key": idempotencyKey } = headersValidation.data;

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
