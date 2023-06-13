import { Auction } from "@types";

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const stepFunctions = new SFNClient({});

export async function startStateMachine(auction: Auction) {
  const params = {
    stateMachineArn: `arn:aws:states:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:stateMachine:DutchAuctionStateMachine-${process.env.STAGE}`,
    name: auction.id,
    input: JSON.stringify({
      id: auction.id,
      startTime: auction.startTime,
      scheduledISODate: auction.scheduledISODate,
      decreaseAmount: auction.decreaseAmount,
      secondsBetweenEachDecrease: auction.secondsBetweenEachDecrease,
      initialPrice: auction.initialPrice,
      reservePrice: auction.reservePrice,
      currentPrice: auction.initialPrice,
      metadata: auction.metadata,
    }),
  };
  const command = new StartExecutionCommand(params);
  try {
    const { executionArn } = await stepFunctions.send(command);
    return executionArn;
  } catch (error) {
    console.error(`Failed to start status machine: ${error}`);
    throw error;
  }
}
