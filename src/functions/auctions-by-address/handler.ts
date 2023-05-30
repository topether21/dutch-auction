import { errorAuctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuctionsByNostrAddress } from "@libs/db";
import { APIGatewayEvent } from "aws-lambda";

export const getAuctionsByAddress = async (event: APIGatewayEvent) => {
  const address = event.pathParameters?.address;
  try {
    if (!address) throw new Error("No address provided");
    const auction = await getAuctionsByNostrAddress(address);
    if (!auction) {
      return errorAuctionNotFound();
    }
    return createHttpResponse(200, auction);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
