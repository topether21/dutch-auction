import { z } from "zod";

export const PublishEventSchema = z.object({
  psbt: z.string(),
  currentPrice: z.number(),
  output: z.string(),
  inscriptionId: z.string(),
});
