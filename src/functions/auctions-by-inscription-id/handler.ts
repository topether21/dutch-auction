import { auctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuctionsByInscriptionId } from "@libs/db";
import { APIGatewayEvent } from "aws-lambda";

export const auctionsByInscriptionId = async (event: APIGatewayEvent) => {
  const inscriptionId = event.pathParameters?.inscriptionId;
  if (!inscriptionId) return internalServerError();
  try {
    const auctions = await getAuctionsByInscriptionId(inscriptionId);
    if (!auctions) {
      return auctionNotFound();
    }
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
