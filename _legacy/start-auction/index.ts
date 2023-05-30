import { handlerPath } from "@libs/handler-resolver";

export const startAuction = {
  handler: `${handlerPath(__dirname)}/handler.startAuction`,
  environment: {
    STATE_MACHINE_ARN: `arn:aws:states:us-east-1:#{AWS::AccountId}:stateMachine:DutchAuctionStateMachine-${process.env.STAGE}`,
  },
  events: [
    {
      eventBridge: {
        pattern: {
          source: ["dutch-auction.start"],
          "detail-type": ["AuctionScheduled"],
        },
      },
    },
  ],
};
