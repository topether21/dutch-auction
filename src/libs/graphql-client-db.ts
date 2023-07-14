import { Auction, AuctionId, AuctionInput, AuctionMetadata } from "@types";
import {
  createClient,
  everything,
  DutchAuction,
  enumAuctionStatusEnum,
} from "./../generated";

type AuctionResult = Auction | null;
type AuctionStatus =
  (typeof enumAuctionStatusEnum)[keyof typeof enumAuctionStatusEnum];

const client = createClient({
  url: process.env.HASURA_ENDPOINT || "",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET || "",
  },
});

const parseAuction = (
  auction: Partial<DutchAuction> | null
): Auction | null => {
  if (!auction || !auction.auctionId) return null;
  const {
    initialPrice,
    auctionId,
    currentPrice,
    decreaseAmount,
    dutch_auction_auction_metadata: AuctionMetadata,
    id,
    inscriptionId,
    ownerOrdinalsAddress,
    reservePrice,
    scheduledISODate,
    secondsBetweenEachDecrease,
    startTime,
    status,
    txid,
    vout,
    utxoCreatedAt,
    utxoNum,
  } = auction;

  const metadata: AuctionMetadata[] =
    AuctionMetadata?.map((m) => ({
      auctionId: String(m.auctionId || ""),
      endTime: Number(m.endTime),
      id: m.id,
      index: m.index,
      nostrEventId: m.nostrEventId || "",
      signedPsbt: m.signedPsbt,
      scheduledTime: m.scheduledTime,
      price: m.price,
    })) || [];

  return {
    auctionId,
    currentPrice: currentPrice || 0,
    initialPrice: initialPrice || 0,
    decreaseAmount: decreaseAmount || 0,
    metadata,
    id,
    inscriptionId: inscriptionId || "",
    ownerOrdinalsAddress: ownerOrdinalsAddress || "",
    reservePrice: reservePrice || 0,
    scheduledISODate,
    secondsBetweenEachDecrease: secondsBetweenEachDecrease || 0,
    startTime,
    txid: txid || "",
    vout: vout || 0,
    status: status || enumAuctionStatusEnum.PENDING,
    utxoCreatedAt: utxoCreatedAt || 0,
    utxoNum: utxoNum || "",
  };
};

const auctionAttributes = {
  ...everything,
  dutch_auction_auction_metadata: {
    ...everything,
  },
};

const getAuctionsByNostrAddress = async (
  ownerOrdinalsAddress: string
): Promise<AuctionResult[]> => {
  try {
    const { dutchAuction } = await client.query({
      dutchAuction: {
        ...auctionAttributes,
        __args: {
          where: {
            ownerOrdinalsAddress: { _eq: ownerOrdinalsAddress },
          },
        },
      },
    });
    return dutchAuction.map((a) => parseAuction(a as Partial<DutchAuction>));
  } catch (error) {
    console.error("Failed to get auctions by nostr address", error);
    return [];
  }
};

const getAuctionsByInscriptionId = async (
  inscriptionId: string
): Promise<AuctionResult[]> => {
  try {
    const { dutchAuction } = await client.query({
      dutchAuction: {
        ...auctionAttributes,
        __args: {
          where: {
            inscriptionId: { _eq: inscriptionId },
          },
        },
      },
    });
    return dutchAuction.map((a) => parseAuction(a as Partial<DutchAuction>));
  } catch (error) {
    console.error("Failed to get auctions by inscription id", error);
    return [];
  }
};

const getAuctionsByCollection = async (
  collection: string
): Promise<AuctionResult[]> => {
  try {
    const { dutchAuction } = await client.query({
      dutchAuction: {
        ...auctionAttributes,
        __args: {
          where: {
            collection: { _eq: collection },
          },
        },
      },
    });
    return dutchAuction.map((a) => parseAuction(a as Partial<DutchAuction>));
  } catch (error) {
    console.error("Failed to get auctions by collection", error);
    return [];
  }
};

// TODO: rename to createAuction
const saveAuction = async (auction: AuctionInput): Promise<AuctionResult> => {
  try {
    const { insertDutchAuctionOne } = await client.mutation({
      insertDutchAuctionOne: {
        ...auctionAttributes,
        __args: {
          object: {
            inscriptionId: auction.inscriptionId,
            ownerOrdinalsAddress: auction.ownerOrdinalsAddress,
            txid: auction.txid,
            vout: auction.vout,
            status: auction.status,
            scheduledISODate: auction.scheduledISODate,
            reservePrice: auction.reservePrice,
            initialPrice: auction.initialPrice,
            decreaseAmount: auction.decreaseAmount,
            secondsBetweenEachDecrease: auction.secondsBetweenEachDecrease,
            startTime: auction.startTime,
            dutch_auction_auction_metadata: {
              data: auction.metadata,
            },
          },
        },
      },
    });
    return parseAuction(insertDutchAuctionOne as Partial<DutchAuction>);
  } catch (error) {
    console.error("Failed to insert auction", error);
    return null;
  }
};

const listAuctions = async (): Promise<AuctionResult[]> => {
  try {
    const { dutchAuction } = await client.query({
      dutchAuction: {
        ...auctionAttributes,
        __args: {
          limit: 300,
          orderBy: [
            {
              updatedAt: "ASC_NULLS_LAST",
            },
          ],
        },
      },
    });
    return dutchAuction.map((a) => parseAuction(a as Partial<DutchAuction>));
  } catch (error) {
    console.error("Failed to list auctions", error);
    return [];
  }
};

const getAuction = async (auctionId: string): Promise<AuctionResult> => {
  try {
    const { dutchAuction } = await client.query({
      dutchAuction: {
        ...auctionAttributes,
        __args: {
          where: {
            id: { _eq: auctionId },
          },
        },
      },
    });
    return parseAuction(dutchAuction[0] as Partial<DutchAuction>);
  } catch (error) {
    console.error("Failed to get auction", error);
    return null;
  }
};

const finishAuction = async (
  auctionId: AuctionId,
  status?: AuctionStatus
): Promise<AuctionResult> => {
  try {
    const { updateDutchAuction } = await client.mutation({
      updateDutchAuction: {
        returning: {
          ...auctionAttributes,
        },
        __args: {
          where: {
            id: { _eq: auctionId },
          },
          _set: {
            status: status || enumAuctionStatusEnum.FINISHED,
          },
        },
      },
    });
    return parseAuction(
      updateDutchAuction?.returning[0] as Partial<DutchAuction>
    );
  } catch (error) {
    console.error(`Failed to update auction with id: ${auctionId}`, error);
    return null;
  }
};

// TODO: remove this
const updateAuctionStatus = async (
  auctionId: AuctionId,
  status: AuctionStatus
): Promise<AuctionResult> => {
  return finishAuction(auctionId, status);
};

const updateAuctionMetadata = async (
  auctionId: AuctionId,
  metadata: AuctionMetadata[]
): Promise<AuctionResult> => {
  try {
    const { updateDutchAuction } = await client.mutation({
      updateDutchAuction: {
        returning: {
          ...auctionAttributes,
        },
        __args: {
          where: {
            id: { _eq: auctionId },
          },
          _set: {
            status: enumAuctionStatusEnum.RUNNING,
            dutch_auction_auction_metadata: {
              data: metadata,
            },
          },
        },
      },
    });
    return parseAuction(
      updateDutchAuction?.returning[0] as Partial<DutchAuction>
    );
  } catch (error) {
    console.error(`Failed to update auction with id: ${auctionId}`, error);
    return null;
  }
};

const updateAuctionPrice = async (
  auctionId: AuctionId,
  price: number
): Promise<AuctionResult> => {
  try {
    const { updateDutchAuction } = await client.mutation({
      updateDutchAuction: {
        returning: {
          ...auctionAttributes,
        },
        __args: {
          where: {
            id: { _eq: auctionId },
          },
          _set: {
            currentPrice: price,
          },
        },
      },
    });
    return parseAuction(
      updateDutchAuction?.returning[0] as Partial<DutchAuction>
    );
  } catch (error) {
    console.error(`Failed to update auction with id: ${auctionId}`, error);
    return null;
  }
};

const deleteAuctionsByInscriptionId = async (
  inscriptionId: string
): Promise<AuctionResult[]> => {
  try {
    const { deleteDutchAuction } = await client.mutation({
      deleteDutchAuction: {
        returning: {
          ...auctionAttributes,
        },
        __args: {
          where: {
            inscriptionId: { _eq: inscriptionId },
          },
        },
      },
    });
    return (
      deleteDutchAuction?.returning.map((a) =>
        parseAuction(a as Partial<DutchAuction>)
      ) || []
    );
  } catch (error) {
    console.error(
      `Failed to delete auctions with inscriptionId: ${inscriptionId}`,
      error
    );
    return [];
  }
};

const deleteAuctionById = async (
  auctionId: string
): Promise<AuctionResult[]> => {
  try {
    const { deleteDutchAuction } = await client.mutation({
      deleteDutchAuction: {
        returning: {
          ...auctionAttributes,
        },
        __args: {
          where: {
            id: { _eq: auctionId },
          },
        },
      },
    });
    return (
      deleteDutchAuction?.returning.map((a) =>
        parseAuction(a as Partial<DutchAuction>)
      ) || []
    );
  } catch (error) {
    console.error(`Failed to delete auctions with id: ${auctionId}`, error);
    return [];
  }
};

export {
  getAuctionsByNostrAddress,
  getAuctionsByInscriptionId,
  saveAuction,
  listAuctions,
  getAuction,
  finishAuction,
  updateAuctionStatus,
  updateAuctionMetadata,
  updateAuctionPrice,
  deleteAuctionsByInscriptionId,
  deleteAuctionById,
  getAuctionsByCollection,
};
