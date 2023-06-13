export interface CreateAuction {
  startTime: number;
  decreaseAmount: number;
  secondsBetweenEachDecrease: number;
  initialPrice: number;
  reservePrice: number;
  metadata: Metadata[];
  btcAddress: string;
  output: string;
  inscriptionId: string;
}

interface Metadata {
  scheduledTime: number;
  price: number;
  signedPsbt: string;
}
