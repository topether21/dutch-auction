import { auctionNotFound, internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { getAuctionsByInscriptionId } from "@libs/db";

export const auctionsByInscriptionId = async (event) => {
  const inscriptionId = event.pathParameters.inscriptionId;
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
