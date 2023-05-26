const { v4 } = require("uuid");
const {
  PutEventsCommand,
  EventBridgeClient,
} = require("@aws-sdk/client-eventbridge");

import { isSpent } from "@libs/inscriptions";
import { getAuctionsByInscriptionId, saveAuction } from "@libs/db";
import {
  ValidatedEventAPIGatewayProxyEvent,
  createHttpResponse,
  parseEventInput,
} from "@libs/api-gateway";

import schema from "./schema";
import {
  auctionIsRunning,
  auctionIsSpent,
  internalServerError,
} from "@functions/errors";

const eventBridge = new EventBridgeClient({});

export const createAuction: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
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
  } = event.body;
  const id = v4();
  const auction = {
    id,
    startTime,
    decreaseAmount,
    timeBetweenEachDecrease,
    startPrice,
    reservePrice,
    metadata: metadata.map((m) => ({ ...m, id: v4() })),
    currentPrice: startPrice,
    status: "PENDING",
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
