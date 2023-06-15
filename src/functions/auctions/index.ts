import { handlerPath } from "@libs/handler-resolver";

export const auctions = {
  timeout: 60,
  handler: `${handlerPath(__dirname)}/handler.getAuctions`,
  events: [
    {
      http: {
        method: "get",
        path: "/v1/auctions",
        cors: true,
      },
    },
  ],
};
