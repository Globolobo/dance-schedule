import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import { searchClasses } from "./classes.service";
import { SearchQueryParamsSchema } from "./classes.dto";
import { formatValidationErrors } from "../../utils/validation";

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

  const result = await searchClasses(validatedParams.type);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  };
};

export const search = middy(searchHandler).use(httpErrorHandler());
