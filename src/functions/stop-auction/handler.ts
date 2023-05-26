import { auctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuction, updateAuctionStatus } from "@libs/db";

export const stopAuctionById = async (event) => {
  const auctionId = event.pathParameters.id;
  try {
    const auction = await getAuction(auctionId);
    if (!auction) {
      return auctionNotFound();
    }
    await updateAuctionStatus(auctionId, "STOPPED");
    return createHttpResponse(200, { ...auction, status: "STOPPED" });
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
