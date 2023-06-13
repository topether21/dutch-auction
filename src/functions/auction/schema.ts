import { z } from "zod";

const AuctionMetadataSchema = z.object({
  scheduledTime: z.number(),
  price: z.number(),
  signedPsbt: z.string(),
});

export const CreateAuctionSchema = z.object({
  startTime: z.number(),
  decreaseAmount: z.number(),
  timeBetweenEachDecrease: z.number(),
  initialPrice: z.number(),
  reservePrice: z.number(),
  metadata: z.array(AuctionMetadataSchema),
  btcAddress: z.string(),
  output: z.string(),
  inscriptionId: z.string(),
});
