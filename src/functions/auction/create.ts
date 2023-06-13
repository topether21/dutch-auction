import { v4 } from "uuid";

import { isSpent } from "@libs/inscriptions";
import { getAuctionsByInscriptionId, saveAuction } from "@libs/db";
import { createHttpResponse, parseEventInput } from "@libs/api-gateway";

import {
  errorAuctionIsRunning,
  errorAuctionIsSpent,
  errorInvalidInput,
  internalServerError,
} from "@functions/errors";
import { APIGatewayEvent } from "aws-lambda";
import { AuctionMetadata, AuctionStatus } from "@types";
import { startStateMachine } from "@functions/start-state-machine";
import { CreateAuctionSchema } from "./schema";

function toMilliseconds(timestamp: number) {
  // if timestamp is in seconds
  if (timestamp < 10000000000) {
    return timestamp * 1000;
  }
  // if timestamp is in milliseconds
  else {
    return timestamp;
  }
}

export const createAuction = async (event: APIGatewayEvent) => {
  parseEventInput(event);
  const parsedEventBody = CreateAuctionSchema.safeParse(event.body);
  if (!parsedEventBody.success) {
    console.error(parsedEventBody.error);
    return errorInvalidInput(parsedEventBody.error);
  }

  const {
    startTime: originalStartTime, // IMPORTANT: milliseconds or seconds
    decreaseAmount,
    timeBetweenEachDecrease,
    initialPrice,
    reservePrice,
    metadata,
    btcAddress,
    inscriptionId,
    output,
  } = parsedEventBody.data;

  const startTime = toMilliseconds(originalStartTime);
  const id = v4();
  const auction = {
    id,
    startTime,
    decreaseAmount,
    timeBetweenEachDecrease,
    initialPrice,
    reservePrice,
    metadata: metadata.map(
      (m) =>
        ({
          ...(m as {}),
          id: v4(),
          scheduledTime: toMilliseconds(m.scheduledTime),
        } as AuctionMetadata)
    ),
    currentPrice: initialPrice,
    status: "PENDING" as AuctionStatus,
    btcAddress,
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
    const now = new Date().getTime();
    const validStartTime =
      startTime && startTime > now ? startTime : now + 5000; // if the time is invalid use now plus 5 seconds
    const scheduledTime = new Date(validStartTime).toISOString();
    const finalAuction = {
      ...auction,
      startTime: validStartTime,
      scheduledTime,
    };
    await saveAuction(finalAuction);
    await startStateMachine(finalAuction);
    return createHttpResponse(200, auction);
  } catch (error) {
    console.error("Error in createAuction:", error);
    return internalServerError();
  }
};
