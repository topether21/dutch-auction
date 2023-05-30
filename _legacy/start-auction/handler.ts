import { internalServerError } from "@functions/errors";
import { startStateMachine } from "@functions/start-state-machine";
import { createHttpResponse, createErrorResponse } from "@libs/api-gateway";
import { getAuction, updateAuctionStatus } from "@libs/db";
import { isSpent } from "@libs/inscriptions";

type EventType = {
  detail: {
    id: string;
  };
};

export const startAuction = async ({ detail: { id } }: EventType) => {
  try {
    const auction = await getAuction(id);
    if (auction.status !== "PENDING") {
      return createErrorResponse({
        message: `Auction with ID "${id}" is not pending. Current status: ${auction.status}`,
      });
    }

    const inscriptionStatus = await isSpent(auction.output);
    if (inscriptionStatus.spent) {
      const status = "SPENT";
      await updateAuctionStatus(id, status);
      return createHttpResponse(200, { ...auction, status });
    }
    await startStateMachine({ ...auction });
    return createHttpResponse(200, { ...auction });
  } catch (error) {
    console.error("Error in startAuction:", error);
    return internalServerError();
  }
};
