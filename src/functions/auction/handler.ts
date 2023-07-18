import { errorAuctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse, validateWarm } from "@libs/api-gateway";
import { deleteAuctionById, getAuction } from "@libs/graphql-client-db";
import { APIGatewayEvent } from "aws-lambda";
import { createAuction } from "./create";
import { checkAuctionStatus } from "@functions/shared";

export const auction = async (event: APIGatewayEvent) => {
  validateWarm(event);
  const method = event.httpMethod;
  if (method === "POST") return createAuction(event);
  const auctionId = event.pathParameters?.id || "";
  if (!auctionId) return internalServerError();
  try {
    const auction = await getAuction(auctionId);
    if (!auction) {
      return errorAuctionNotFound();
    }
    await checkAuctionStatus([auction]);
    if (
      method === "DELETE" &&
      (auction.status === "PENDING" || auction.status === "RUNNING")
    ) {
      await deleteAuctionById(auctionId);
      return createHttpResponse(200, { status: "DELETED", id: auctionId });
    }
    return createHttpResponse(200, auction);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
