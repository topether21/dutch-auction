const { getEventHash } = require("nostr-tools");
const { getPool } = require("./nostr-relay");
const { promisify } = require("util");

const NOSTR_KIND_INSCRIPTION = 802;

function getEvent({
  inscriptionId,
  inscriptionUtxo,
  networkName = "mainnet",
  priceInSats,
  signedPsbt,
  type = "sell",
  pubKey,
}) {
  const event = {
    kind: NOSTR_KIND_INSCRIPTION,
    pubkey: pubKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["n", networkName], // Network name (e.g. "mainnet", "signet")
      ["t", type], // Type of order (e.g. "sell", "buy")
      ["i", inscriptionId], // Inscription ID
      ["u", inscriptionUtxo], // Inscription UTXO
      ["s", priceInSats.toString()], // Price in sats
      ["x", "deezy"], // Exchange name (e.g. "openordex")
    ],
    content: signedPsbt,
  };
  console.log("getEventHash:", JSON.stringify(event, null, 2));
  event.id = getEventHash(event);

  return event;
}

async function broadcastEvent(signedEvent, privKey) {
  // Convert the callback to a promise
  const publishAsync = promisify(getPool(privKey).publish);
  return publishAsync(signedEvent);
}

async function signEvent({ utxo, priceInSats, signedPsbt, pubKey, privKey }) {
  const { inscriptionId } = utxo;
  const inscriptionUtxo = `${utxo.txid}:${utxo.vout}`;

  const event = getEvent({
    inscriptionId,
    inscriptionUtxo,
    priceInSats,
    signedPsbt,
    pubKey,
  });
  const signedEvent = await getPool(privKey).sign(event);

  return signedEvent;
}

async function signAndBroadcastEvent({
  utxo,
  priceInSats,
  signedPsbt,
  pubKey,
  privKey,
}) {
  const signedEvent = await signEvent({
    utxo,
    priceInSats,
    signedPsbt,
    pubKey,
    privKey,
  });
  return broadcastEvent(signedEvent, privKey);
}

module.exports = {
  signAndBroadcastEvent,
};
