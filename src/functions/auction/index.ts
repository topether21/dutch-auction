import { handlerPath } from "@libs/handler-resolver";

export const auction = {
  handler: `${handlerPath(__dirname)}/handler.auction`,
  events: [
    {
      http: {
        method: "post",
        path: "/v1/auction",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "/v1/auction/{id}",
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
    {
      http: {
        method: "delete",
        path: "/v1/auction/{id}",
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
