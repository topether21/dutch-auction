const { getEventHash, relayInit, signEvent } = require("nostr-tools");
const { sign } = require("./sign-event");

const NOSTR_KIND_INSCRIPTION = 802;
const NOSTR_RELAY_URL = "wss://nostr.openordex.org";
const RELAYS = [NOSTR_RELAY_URL];

async function sign(event, privkey) {
  const eventBase = { ...event, created_at: Math.floor(Date.now() / 1000) };
  const newEvent = {
    ...eventBase,
    id: getEventHash(eventBase),
  };
  const sig = signEvent(newEvent, privkey);
  return { ...newEvent, sig };
}

function getSellEvent({
  inscriptionId,
  inscriptionUtxo,
  networkName = "mainnet",
  priceInSats,
  signedPsbt,
  type = "sell",
  pubkey,
}) {
  const event = {
    kind: NOSTR_KIND_INSCRIPTION,
    pubkey,
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
  event.id = getEventHash(event);
  return event;
}

async function signEvent({ utxo, priceInSats, signedPsbt, pubkey, privkey }) {
  const { inscriptionId } = utxo;
  const inscriptionUtxo = `${utxo.txid}:${utxo.vout}`;

  const event = getSellEvent({
    inscriptionId,
    inscriptionUtxo,
    priceInSats,
    signedPsbt,
    pubkey,
  });
  const signedEvent = await sign(event);
  return signedEvent;
}

async function signAndBroadcastEvent({
  utxo,
  priceInSats,
  signedPsbt,
  pubkey,
  privkey,
}) {
  const signedEvent = await signEvent({
    utxo,
    priceInSats,
    signedPsbt,
    pubkey,
    privkey,
  });
  console.log("signedEvent:", JSON.stringify(signedEvent, null, 2));
  return publishEvent(signedEvent);
}

const publishEvent = async (event) => {
  console.info(`Processing ${event.id}`);

  const promises = RELAYS.map(
    (url) =>
      new Promise((resolve, reject) => {
        const relay = relayInit(url);
        const timeout = 10000;

        function timeoutAndClose() {
          console.error(`Timeout error: event ${event.id} relay ${url}`);
          relay.close();
          reject();
        }
        let timeoutCheck = setTimeout(timeoutAndClose, timeout);

        relay.on("connect", () => {
          console.info(`Sending ${event.id} to ${url}`, event);
          const pub = relay.publish(event);
          pub.on("ok", () => {
            console.info(`Event ${event.id} published to ${url}`);
            relay.close();
            clearTimeout(timeoutCheck);
            resolve();
          });
          pub.on("failed", (reason) => {
            console.warn(`Failed to publish ${event.id} to ${url}: ${reason}`);
            relay.close();
            clearTimeout(timeoutCheck);
            resolve();
          });
        });

        relay.on("error", (msg) => {
          console.error(`Failed to connect to ${url}`, JSON.stringify(msg));
          clearTimeout(timeoutCheck);
          relay.close();
          resolve();
        });

        return relay.connect();
      })
  );

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  signAndBroadcastEvent,
  publishEvent,
};
