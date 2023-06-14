import { internalServerError } from "@functions/errors";
import { checkAuctionStatus } from "@functions/shared";
import { createHttpResponse } from "@libs/api-gateway";
import { listAuctions } from "@libs/db";

export const getAuctions = async () => {
  try {
    const auctions = await listAuctions();
    await checkAuctionStatus(auctions);
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
