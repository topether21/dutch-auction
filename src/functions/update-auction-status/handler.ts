import {
  getAuction,
  updateAuctionStatus as updateAuction,
  updateAuctionMetadata,
  updateAuctionPrice,
} from "@libs/db";
import { isSpent } from "@libs/inscriptions";
import { signAndBroadcastEvent } from "@libs/nostr";
import { Auction, AuctionStatus } from "@types";

export async function updateAuctionStatus(event: Auction) {
  const { id, metadata: stateMachineMetadata } = event;
  const auction = await getAuction(id);
  const auctionMetadata = auction.metadata;
  const stateMachineAuction = { ...auction, metadata: stateMachineMetadata };
  if (!auction) {
    throw new Error(`Auction with ID "${id}" not found.`);
  }
  const inscriptionStatus = await isSpent(auction.output);
  if (inscriptionStatus.spent) {
    const status: AuctionStatus = "SPENT";
    await updateAuction(id, status);
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  if (auction.status === "STOPPED") {
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  if (stateMachineMetadata.length === 0) {
    const status: AuctionStatus = "FINISHED";
    await updateAuction(id, status);
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  const scheduledEvent = stateMachineAuction.metadata.shift();
  if (!scheduledEvent) return new Error("No scheduled event found.");
  const currentPrice = scheduledEvent.price;
  try {
    const input = {
      pubkey: process.env.NOSTR_PUBLIC_KEY || "",
      privkey: process.env.NOSTR_PRIVATE_KEY || "",
      output: auction.output,
      inscriptionId: auction.inscriptionId,
      priceInSats: currentPrice,
      signedPsbt: scheduledEvent.signedPsbt,
    };
    const broadcastedEvent = await signAndBroadcastEvent(input);
    const currentMetadataIndex = auctionMetadata.findIndex(
      (m) => m.id === scheduledEvent.id
    );
    auctionMetadata[currentMetadataIndex] = {
      ...scheduledEvent,
      nostrEventId: broadcastedEvent.id,
    };
    await updateAuctionMetadata(id, auctionMetadata);
  } catch (error) {
    console.error("Error in signAndBroadcastEvent:", error);
  }
  await updateAuctionPrice(id, currentPrice);
  return {
    ...stateMachineAuction,
    currentPrice,
    auctionFinished: false,
  };
}
