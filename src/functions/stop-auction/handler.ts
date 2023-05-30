import { errorAuctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuction, updateAuctionStatus } from "@libs/db";
import { APIGatewayEvent } from "aws-lambda";

export const stopAuctionById = async (event: APIGatewayEvent) => {
  try {
    const auctionId = event.pathParameters?.id || "";
    if (!auctionId) new Error("Auction ID is required");
    const auction = await getAuction(auctionId);
    if (!auction) {
      return errorAuctionNotFound();
    }
    await updateAuctionStatus(auctionId, "STOPPED");
    return createHttpResponse(200, { ...auction, status: "STOPPED" });
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
