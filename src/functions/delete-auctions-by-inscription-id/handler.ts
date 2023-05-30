import { internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { deleteAuctionsByInscriptionId as deleteAuctions } from "@libs/db";
import { APIGatewayEvent } from "aws-lambda";

export const deleteAuctionsByInscriptionId = async (event: APIGatewayEvent) => {
  const inscriptionId = event.pathParameters?.inscriptionId;
  if (!inscriptionId) return internalServerError();
  try {
    const ids = await deleteAuctions(inscriptionId);
    return createHttpResponse(200, { status: "OK", ids });
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
