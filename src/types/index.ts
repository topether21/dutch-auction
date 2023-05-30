export type AuctionId = string;
export type AuctionStatus =
  | "SPENT"
  | "RUNNING"
  | "PENDING"
  | "FINISHED"
  | "CLOSED"
  | "STOPPED";

export interface Auction {
  startTime: number;
  scheduledTime: string;
  metadata: AuctionMetadata[];
  inscriptionId: string;
  nostrAddress: string;
  output: string;
  status: AuctionStatus;
  decreaseAmount: number;
  id: AuctionId;
  reservePrice: number;
  currentPrice: number;
  timeBetweenEachDecrease: number;
  initialPrice: number;
}

export interface AuctionMetadata {
  scheduledTime: number;
  id: string;
  nostrEventId?: string;
  price: number;
  signedPsbt: string;
}
