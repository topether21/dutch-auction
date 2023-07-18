import { updateAuctionStatus } from "@libs/graphql-client-db";
import { isSpent } from "@libs/inscriptions";
import { Auction } from "@types";

export const checkAuctionStatus = async (auctions: Auction[]) => {
  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i];
    const inscriptionStatus = await isSpent({
      txid: auction.txid,
      vout: auction.vout,
    });
    // always update the auction status if it is spent
    if (inscriptionStatus.spent && auction.status !== "SPENT") {
      await updateAuctionStatus(auction.id, "SPENT");
      auctions[i] = { ...auction, status: "SPENT" };
    }
  }
};

export const getOutput = (txid: string, vout: number) => {
  return `$${txid}:${vout}`;
};
