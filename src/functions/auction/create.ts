import { v4 } from "uuid";
import {
  PutEventsCommand,
  EventBridgeClient,
} from "@aws-sdk/client-eventbridge";

import { isSpent } from "@libs/inscriptions";
import { getAuctionsByInscriptionId, saveAuction } from "@libs/db";
import { createHttpResponse, parseEventInput } from "@libs/api-gateway";

import { CreateAuction } from "./types";
import {
  errorAuctionIsRunning,
  errorAuctionIsSpent,
  internalServerError,
} from "@functions/errors";
import { APIGatewayEvent } from "aws-lambda";
import { AuctionMetadata, AuctionStatus } from "@types";

const eventBridge = new EventBridgeClient({});

export const createAuction = async (event: APIGatewayEvent) => {
  parseEventInput(event);
  const {
    startTime, // IMPORTANT: milliseconds
    decreaseAmount,
    timeBetweenEachDecrease,
    initialPrice,
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
    initialPrice,
    reservePrice,
    metadata: metadata.map(
      (m) => ({ ...(m as {}), id: v4() } as AuctionMetadata)
    ),
    currentPrice: initialPrice,
    status: "PENDING" as AuctionStatus,
    nostrAddress,
    inscriptionId,
    output,
  };
  try {
    const inscriptionStatus = await isSpent(auction.output);
    if (inscriptionStatus.spent) {
      return errorAuctionIsSpent();
    }
    const auctions = await getAuctionsByInscriptionId(inscriptionId);
    if (auctions.length > 0 && auctions.some((a) => a.status === "RUNNING")) {
      return errorAuctionIsRunning();
    }
    await saveAuction({ ...auction, startTime });
    const time = new Date(startTime);
    console.log("schedule", { startTime, time, date: time.getTime() });
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: time, // milliseconds
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
