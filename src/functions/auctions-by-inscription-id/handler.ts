import { createHttpResponse } from "@libs/api-gateway";
import { createErrorResponse } from "@libs/api-gateway";
import { getAuctionsByInscriptionId } from "@libs/db";

export const auctionsByInscriptionId = async (event) => {
  const inscriptionId = event.pathParameters.inscriptionId;
  try {
    const auctions = await getAuctionsByInscriptionId(inscriptionId);
    if (!auctions) {
      return createErrorResponse({
        statusCode: 404,
        message: "Auctions not found",
      });
    }
    return createHttpResponse(200, JSON.stringify(auctions));
  } catch (error) {
    console.error(error);
    return createErrorResponse({
      statusCode: 500,
    });
  }
};
