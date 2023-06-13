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
  scheduledISODate: string;
  metadata: AuctionMetadata[];
  inscriptionId: string;
  btcAddress: string;
  output: string;
  status: AuctionStatus;
  decreaseAmount: number;
  id: AuctionId;
  reservePrice: number;
  currentPrice: number;
  secondsBetweenEachDecrease: number;
  initialPrice: number;
}

export interface AuctionMetadata {
  scheduledTime: number;
  endTime: number;
  id: string;
  nostrEventId?: string;
  price: number;
  signedPsbt: string;
  index: number;
  isLastEvent: boolean;
}
