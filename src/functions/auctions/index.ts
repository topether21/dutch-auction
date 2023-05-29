import { handlerPath } from "@libs/handler-resolver";

export const auctions = {
  handler: `${handlerPath(__dirname)}/handler.getAuctions`,
  events: [
    {
      http: {
        method: "get",
        path: "auctions",
        cors: true,
      },
    },
  ],
};
