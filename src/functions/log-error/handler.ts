import {
  getAuction,
  finishAuction as dbFinishAuction,
} from "@libs/graphql-client-db";

type EventType = {
  id: string;
};

export async function logError(event: EventType) {
  const { id = "" } = event;
  const auction = await getAuction(id);
  if (!auction) {
    throw new Error(`Auction with ID "${id}" not found.`);
  }
  await dbFinishAuction(id, "STOPPED");
  return { ...auction, status: "STOPPED" };
}
