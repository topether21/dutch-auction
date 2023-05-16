const inscriptions = require("./inscriptions");

const TESTNET = false;
const MEMPOOL_API_URL = TESTNET
  ? "https://mempool.space/testnet"
  : "https://mempool.deezy.io";

const config = { MEMPOOL_API_URL };

const utxo = {
  owner: "bc1p6hsehjafcdzzht5shm4qmm3w2aspwlh843w5r9s33ejhhwesy9qss2hxhp",
  inscriptionId:
    "c075cafdac7f6d4ac526ed4fa66c5daf9ebd3db2636b30b5498c4659bc6aab34i0",
  genesis_height: "783864",
  offset: "0",
  locktime: 0,
  created: 1680589974,
  num: "826706",
  fee: 26562,
  txid: "29a3e9a9d494e01c07e67e9cf9e33b96d4d4b404bab5293ea25b3ffd10d7d46d",
  weight: 889,
  collection: {},
  version: 2,
  vout: 0,
  output: "29a3e9a9d494e01c07e67e9cf9e33b96d4d4b404bab5293ea25b3ffd10d7d46d:0",
  content_type: "image/png",
  size: 355,
  sats: "10000",
  genesis_fee: "780",
  vin: [],
  id: "c075cafdac7f6d4ac526ed4fa66c5daf9ebd3db2636b30b5498c4659bc6aab34i0",
  value: 10000,
  content_length: "241",
  status: {
    block_time: 1683861097,
    block_hash:
      "00000000000000000003d9edac7ee564552d1703c4395eb1093798ae2cf32d04",
    block_height: 789329,
    confirmed: true,
  },
};

(async () => {
  const case0 = await inscriptions.isSpent(
    "29a3e9a9d494e01c07e67e9cf9e33b96d4d4b404bab5293ea25b3ffd10d7d46d:0"
  );
  console.log(JSON.stringify(case0, null, 2));
  const case1 = await inscriptions.isSpent(
    "4fc73642d443d86595a693c521aeb6316d8e018411109c6caf8aa60dd9ea97d0:0"
  );
  console.log(JSON.stringify(case1, null, 2));
})();
