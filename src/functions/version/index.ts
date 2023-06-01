import { handlerPath } from "@libs/handler-resolver";

export const version = {
  handler: `${handlerPath(__dirname)}/handler.getVersion`,
  events: [
    {
      http: {
        method: "get",
        path: "/v1/version",
        cors: true,
      },
    },
  ],
};
