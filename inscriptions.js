const axios = require("./axios");

const TESTNET = false;
const MEMPOOL_API_URL = TESTNET
  ? "https://mempool.space/testnet"
  : "https://mempool.deezy.io";

const config = { MEMPOOL_API_URL };

// https://mempool.deezy.io/api/tx/29a3e9a9d494e01c07e67e9cf9e33b96d4d4b404bab5293ea25b3ffd10d7d46d/outspend/0
// https://mempool.deezy.io/api/blocks/tip/height
// {
//   "spent": true,
//   "txid": "e14c4c6e881288b7a82d6e610a058ae48db7a1e23cfcbbd8b2af36fc61471a22",
//   "vin": 1,
//   "status": {
//     "confirmed": true,
//     "block_height": 789711,
//     "block_hash": "000000000000000000026ef7b109c77b0e88b7ed7dee0eb2ba9f894d5defc36e",
//     "block_time": 1684075309
//   },
//   "confirmations": 371
// }
// https://mempool.deezy.io/api/tx/4fc73642d443d86595a693c521aeb6316d8e018411109c6caf8aa60dd9ea97d0/outspend/0
// {
//   "spent": false
// }

const isSpent = async (output) => {
  const [txid, vout] = output.split(":");
  const { data } = await axios.get(
    `${config.MEMPOOL_API_URL}/api/tx/${txid}/outspend/${vout}`
  );
  if (data.spent) {
    const { data: last_lock_height } = await axios.get(
      `${config.MEMPOOL_API_URL}/api/blocks/tip/height`
    );
    const confirmations = last_lock_height - data.status.block_height;
    return {
      ...data,
      confirmations,
    };
  }
  return data;
};

module.exports = {
  isSpent,
};
