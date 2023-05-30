export interface CreateAuction {
  startTime: number;
  decreaseAmount: number;
  timeBetweenEachDecrease: number;
  initialPrice: number;
  reservePrice: number;
  metadata: Metadata[];
  nostrAddress: string;
  output: string;
  inscriptionId: string;
}

interface Metadata {
  scheduledTime: number;
  price: number;
  signedPsbt: string;
}
