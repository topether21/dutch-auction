import { internalServerError } from "@functions/errors";
import { createHttpResponse, validateWarm } from "@libs/api-gateway";
import { getAuctionsByCollection } from "@libs/graphql-client-db";
import { APIGatewayEvent } from "aws-lambda";

export const auctionsByCollection = async (event: APIGatewayEvent) => {
  validateWarm(event);
  const collection = event.pathParameters?.collection;
  if (!collection) return internalServerError();
  try {
    const auctions = await getAuctionsByCollection(collection);
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
