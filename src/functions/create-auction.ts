const { v4 } = require("uuid");
const {
  PutEventsCommand,
  EventBridgeClient,
} = require("@aws-sdk/client-eventbridge");

import {
  parseEventInput,
  createErrorResponse,
  createHttpResponse,
} from "@libs/utils";
import inscriptions from "@libs/inscriptions";
import db from "@libs/db";

const eventBridge = new EventBridgeClient({});

export async function createAuction(event) {
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
    const inscriptionStatus = await inscriptions.isSpent(auction.output);
    if (inscriptionStatus.spent) {
      return createErrorResponse({
        statusCode: 404,
        message: "Inscription is spent.",
      });
    }
    const auctions = await db.getAuctionsByInscriptionId(inscriptionId);
    if (auctions.length > 0 && auctions.some((a) => a.status === "RUNNING")) {
      return createErrorResponse({
        statusCode: 404,
        message: "Auction running for this inscription.",
      });
    }
    const now = Math.floor(new Date().getTime() / 1000);
    const validStartTime = startTime < now ? now + 5 : startTime; // Always start the auction
    await db.saveAuction({ ...auction, startTime: validStartTime });
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
    return createErrorResponse({
      statusCode: 500,
    });
  }
}
