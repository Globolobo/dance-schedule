import type { APIGatewayProxyEvent } from "aws-lambda";

export interface CreateAPIGatewayEventOptions {
  httpMethod?: string;
  path?: string;
  resource?: string;
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: Partial<APIGatewayProxyEvent["requestContext"]>;
  multiValueQueryStringParameters?: Record<string, string[]> | null;
  stageVariables?: Record<string, string> | null;
}

export function createAPIGatewayEvent(
  options: CreateAPIGatewayEventOptions = {}
): APIGatewayProxyEvent {
  const {
    httpMethod = "GET",
    path = "/",
    resource = "/",
    pathParameters = null,
    queryStringParameters = null,
    headers = {},
    body = null,
    isBase64Encoded = false,
    requestContext: customRequestContext = {},
    multiValueQueryStringParameters = null,
    stageVariables = null,
  } = options;

  const defaultRequestContext: APIGatewayProxyEvent["requestContext"] = {
    accountId: "123456789012",
    apiId: "test",
    protocol: "HTTP/1.1",
    httpMethod,
    path,
    stage: "test",
    requestId: `test-request-${Date.now()}`,
    requestTime: new Date().toISOString(),
    requestTimeEpoch: Date.now(),
    resourceId: "test-resource",
    resourcePath: resource,
    authorizer: {},
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: "test-agent",
      userArn: null,
    },
  };

  return {
    httpMethod,
    path,
    resource,
    pathParameters,
    queryStringParameters,
    headers,
    multiValueHeaders: {},
    body,
    isBase64Encoded,
    requestContext: {
      ...defaultRequestContext,
      ...customRequestContext,
      identity: {
        ...defaultRequestContext.identity,
        ...(customRequestContext.identity || {}),
      },
    },
    multiValueQueryStringParameters,
    stageVariables,
  };
}

export function createGETEvent(
  path: string,
  queryParams?: Record<string, string>
): APIGatewayProxyEvent {
  return createAPIGatewayEvent({
    httpMethod: "GET",
    path,
    resource: path,
    queryStringParameters: queryParams || null,
  });
}

export function createPOSTEvent(
  path: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): APIGatewayProxyEvent {
  return createAPIGatewayEvent({
    httpMethod: "POST",
    path,
    resource: path,
    headers: headers || {},
    body: JSON.stringify(body),
  });
}
