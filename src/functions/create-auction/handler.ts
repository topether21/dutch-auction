import { v4 } from "uuid";
import {
  PutEventsCommand,
  EventBridgeClient,
} from "@aws-sdk/client-eventbridge";

import { isSpent } from "@libs/inscriptions";
import { getAuctionsByInscriptionId, saveAuction } from "@libs/db";
import { createHttpResponse, parseEventInput } from "@libs/api-gateway";

import { CreateAuction } from "./schema";
import {
  auctionIsRunning,
  auctionIsSpent,
  internalServerError,
} from "@functions/errors";
import { APIGatewayEvent } from "aws-lambda";
import { AuctionMetadata, AuctionStatus } from "@types";

const eventBridge = new EventBridgeClient({});

export const createAuction = async (event: APIGatewayEvent) => {
  parseEventInput(event);
  const {
    startTime,
    decreaseAmount,
    timeBetweenEachDecrease,
    startPrice,
    reservePrice,
    metadata,
    nostrAddress,
    inscriptionId,
    output,
  } = event.body as unknown as CreateAuction;
  const id = v4();
  const auction = {
    id,
    startTime,
    decreaseAmount,
    timeBetweenEachDecrease,
    startPrice,
    reservePrice,
    metadata: metadata.map(
      (m) => ({ ...(m as {}), id: v4() } as AuctionMetadata)
    ),
    currentPrice: startPrice,
    status: "PENDING" as AuctionStatus,
    nostrAddress,
    inscriptionId,
    output,
  };
  try {
    const inscriptionStatus = await isSpent(auction.output);
    if (inscriptionStatus.spent) {
      return auctionIsSpent();
    }
    const auctions = await getAuctionsByInscriptionId(inscriptionId);
    if (auctions.length > 0 && auctions.some((a) => a.status === "RUNNING")) {
      return auctionIsRunning();
    }
    const now = Math.floor(new Date().getTime() / 1000);
    const validStartTime = startTime < now ? now + 5 : startTime; // Always start the auction
    await saveAuction({ ...auction, startTime: validStartTime });
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: new Date(validStartTime),
        },
      ],
    });
    await eventBridge.send(command);
    return createHttpResponse(200, auction);
  } catch (error) {
    console.error("Error in createAuction:", error);
    return internalServerError();
  }
};
