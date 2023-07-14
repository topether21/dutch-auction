import { internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";
import { listAuctions } from "@libs/graphql-client-db";

export const getAuctions = async () => {
  try {
    const auctions = await listAuctions();
    return createHttpResponse(200, auctions);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
