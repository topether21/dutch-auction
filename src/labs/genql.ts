// @ts-nocheck
import { AuctionStatus } from "@types";
import {
  finishAuction,
  getAuctionsByInscriptionId,
  getAuctionsByNostrAddress,
  insertAuction,
  listAuctions,
} from "../libs/graphql-client-db";
import { print } from "../libs/utils";

const getData = async () => {
  const address =
    "bc1pvvwgz26pc4drenffnytnd6xfdvy0eehdztuz8338q5a54h9s7pyssssh9a";
  let result = await getAuctionsByNostrAddress(address);

  console.log("[result][getAuctionsByNostrAddress]", result?.id);
  result = await getAuctionsByInscriptionId(result?.inscriptionId || "");
  console.log("[result][getAuctionsByInscriptionId]", result?.id);
};

const create = async () => {
  const auctionInput = {
    initialPrice: 20000,
    inscriptionId:
      "25e927ffd8fb4195ce04df5b72636487b29b5868563960bce6ac5f7539a5e48bi0",
    secondsBetweenEachDecrease: 600,
    status: "SPENT" as AuctionStatus,
    decreaseAmount: 5000,
    ownerOrdinalsAddress:
      "bc1pvvwgz26pc4drenffnytnd6xfdvy0eehdztuz8338q5a54h9s7pyssssh9a",
    currentPrice: 15000,
    startTime: 1688681400000,
    scheduledISODate: "2023-07-06T22:10:00.000Z",
    output:
      "5ae9c4a08903a91271ea1d436e157efc890ec4d4c5377cc9c36b81f8a2635e7b:0",
    vout: 0,
    reservePrice: 5000,
    metadata: [
      {
        index: 0,
        signedPsbt: "DEMO",
        price: 5000,
        scheduledTime: 1000000,
        endTime: 120000,
      },
    ],
  };
  const result = await insertAuction(auctionInput);
  print(result);
};

const list = async () => {
  const result = await listAuctions();
  print(result);
};

const finish = async () => {
  const result = await finishAuction("9b8bc152-9743-49f6-8a26-1e2dbcb6e176");
  print(result);
};

(async () => {
  // await getData();
  // await create();
  // await list();
  // await finish();
})();
