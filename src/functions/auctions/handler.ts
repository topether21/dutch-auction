import { auctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuctionsByNostrAddress } from "@libs/db";

export const getAuctionsByAddress = async (event) => {
  const address = event.pathParameters.address;
  try {
    const auction = await getAuctionsByNostrAddress(address);
    if (!auction) {
      return auctionNotFound();
    }
    return createHttpResponse(200, auction);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
