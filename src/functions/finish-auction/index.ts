import { handlerPath } from "@libs/handler-resolver";

export const finishAuction = {
  handler: `${handlerPath(__dirname)}/handler.finishAuction`,
};
