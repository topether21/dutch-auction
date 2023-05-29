import { handlerPath } from "@libs/handler-resolver";

export const getAuctionsByAddress = {
  handler: `${handlerPath(__dirname)}/handler.getAuctionsByAddress`,
  events: [
    {
      http: {
        method: "get",
        path: "/auctions/address/{address}",
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
