import { internalServerError } from "@functions/errors";
import { createHttpResponse, validateWarm } from "@libs/api-gateway";
import { getAuctionsByNostrAddress } from "@libs/graphql-client-db";
import { APIGatewayEvent } from "aws-lambda";

export const getAuctionsByAddress = async (event: APIGatewayEvent) => {
  validateWarm(event);
  const address = event.pathParameters?.address;
  try {
    if (!address) throw new Error("No address provided");
    const auctions = await getAuctionsByNostrAddress(address);
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
