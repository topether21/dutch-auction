export interface CreateAuction {
  startTime: number;
  decreaseAmount: number;
  secondsBetweenEachDecrease: number;
  initialPrice: number;
  reservePrice: number;
  metadata: Metadata[];
  ownerOrdinalsAddress: string;
  output: string;
  inscriptionId: string;
  collection?: string;
  utxoNum: string;
  utxoCreatedAt: number;
}

interface Metadata {
  scheduledTime: number;
  price: number;
  signedPsbt: string;
}
