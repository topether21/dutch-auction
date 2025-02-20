import {
  getAuction,
  finishAuction as dbFinishAuction,
} from "@libs/graphql-client-db";

type EventType = {
  id: string;
};

export async function finishAuction(event: EventType) {
  const { id } = event;
  const auction = await getAuction(id);
  if (!auction) {
    throw new Error(`Auction with ID "${id}" not found.`);
  }
  if (
    auction.status !== "FINISHED" &&
    auction.status !== "SPENT" &&
    auction.status !== "STOPPED"
  ) {
    await dbFinishAuction(id);
  }
  console.log(`Auction ${id} status set to FINISHED`);
  return auction;
}
