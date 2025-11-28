import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import { SearchQueryParamsSchema } from "../dto/search.dto";
import { formatValidationErrors } from "../../utils/validation";
import { ApplicationService } from "../application/service";
import { PrismaClassInstanceRepository } from "../repositories/prisma-class-instance.repository";
import { PrismaUserRepository } from "../repositories/prisma-user.repository";
import { PrismaBookingRepository } from "../repositories/prisma-booking.repository";

const applicationService = new ApplicationService(
  new PrismaClassInstanceRepository(),
  new PrismaUserRepository(),
  new PrismaBookingRepository()
);

const searchHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const queryParams = event.queryStringParameters || {};

  const normalizedParams = {
    ...queryParams,
    type: queryParams.type?.toLowerCase(),
  };

  const validationResult = SearchQueryParamsSchema.safeParse(normalizedParams);

  if (!validationResult.success) {
    const errorMessage = formatValidationErrors(validationResult.error);
    throw createError(400, `Invalid query parameters: ${errorMessage}`);
  }

  const validatedParams = validationResult.data;

  const result = await applicationService.searchClasses(validatedParams.type);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  };
};

export const search = middy(searchHandler).use(httpErrorHandler());
