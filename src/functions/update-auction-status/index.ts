import { handlerPath } from "@libs/handler-resolver";

export const updateAuctionStatus = {
  handler: `${handlerPath(__dirname)}/handler.updateAuctionStatus`,
};
