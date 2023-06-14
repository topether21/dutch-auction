import { handlerPath } from "@libs/handler-resolver";

export const updateAuctionStatus = {
  timeout: 60,
  handler: `${handlerPath(__dirname)}/handler.updateAuctionStatus`,
};
