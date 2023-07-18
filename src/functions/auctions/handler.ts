import { internalServerError } from "@functions/errors";
import { createHttpResponse, validateWarm } from "@libs/api-gateway";
import { listAuctions } from "@libs/graphql-client-db";
import { APIGatewayEvent } from "aws-lambda";

export const getAuctions = async (event: APIGatewayEvent) => {
  validateWarm(event);
  try {
    const auctions = await listAuctions();
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
