import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import { GetClassByIdPathParamsSchema } from "../dto/get-class-by-id.dto";
import { formatValidationErrors } from "../../utils/validation";
import { ApplicationService } from "../application/service";
import { PrismaClassInstanceRepository } from "../repositories/prisma-class-instance.repository";
import { PrismaUserRepository } from "../repositories/prisma-user.repository";
import { PrismaBookingRepository } from "../repositories/prisma-booking.repository";
import { NotFoundError } from "../domain/errors";

const applicationService = new ApplicationService(
  new PrismaClassInstanceRepository(),
  new PrismaUserRepository(),
  new PrismaBookingRepository()
);

const getClassByIdHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const pathParams = event.pathParameters || {};

  const validationResult = GetClassByIdPathParamsSchema.safeParse(pathParams);

  if (!validationResult.success) {
    const errorMessage = formatValidationErrors(validationResult.error);
    throw createError(400, `Invalid path parameters: ${errorMessage}`);
  }

  const { id } = validationResult.data;

  try {
    const result = await applicationService.getClassById(id);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError(error.statusCode, error.message);
    }

    throw error;
  }
};

export const getClassById = middy(getClassByIdHandler).use(httpErrorHandler());
