import { handlerPath } from "@libs/handler-resolver";

export const logError = {
  handler: `${handlerPath(__dirname)}/handler.logError`,
};
