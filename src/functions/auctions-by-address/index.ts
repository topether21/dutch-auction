import { handlerPath } from "@libs/handler-resolver";

export const getAuctionsByAddress = {
  timeout: 60,
  handler: `${handlerPath(__dirname)}/handler.getAuctionsByAddress`,
  events: [
    {
      http: {
        method: "get",
        path: "/v1/auctions/address/{address}",
        cors: true,
        request: {
          parameters: {
            paths: {
              address: true,
            },
          },
        },
      },
    },
  ],
};
