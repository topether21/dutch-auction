import { handlerPath } from "@libs/handler-resolver";

export const stopAuction = {
  handler: `${handlerPath(__dirname)}/handler.stopAuctionById`,
  events: [
    {
      http: {
        method: "get",
        path: "/stop-auction/{id}",
        cors: true,
        request: {
          parameters: {
            paths: {
              id: true,
            },
          },
        },
      },
    },
  ],
};
