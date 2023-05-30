import { handlerPath } from "@libs/handler-resolver";

export const deleteAuctionsByInscriptionId = {
  handler: `${handlerPath(__dirname)}/handler.deleteAuctionsByInscriptionId`,
  events: [
    {
      http: {
        method: "get",
        path: "/debug/delete/{inscriptionId}",
        cors: true,
        request: {
          parameters: {
            paths: {
              inscriptionId: true,
            },
          },
        },
      },
    },
  ],
};
