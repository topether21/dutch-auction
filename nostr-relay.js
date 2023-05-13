const { SimplePool } = require("nostr-tools");
const nostr = require("nostr-tools");

const NOSTR_RELAY_URL = "wss://nostr.openordex.org";
const RELAYS = [NOSTR_RELAY_URL];

function cleanEvent(event) {
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  };
}

let poolInstance = null;
let privKeyInstance = null;

function publish(pool, privKey, signedEvent, onSuccess, onError) {
  const event = cleanEvent(signedEvent);

  const pubs = pool.publish(RELAYS, event);
  const pubList = !Array.isArray(pubs) ? [pubs] : pubs;

  let notified = false;
  let totalPubsFailed = 0;

  // loop over all pubs and wait for all to be done
  pubList.forEach((pub) => {
    pub.on("ok", () => {
      // Callback success only once
      if (onSuccess && !notified) {
        notified = true;
        onSuccess();
      }
    });
    pub.on("failed", (reason) => {
      // eslint-disable-next-line no-console
      console.error(`failed to publish ${reason}`);
      // Callback error only if all pubs failed
      totalPubsFailed += 1;
      if (totalPubsFailed === pubs.length - 1) {
        if (onError) onError(reason);
      }
    });
  });
}

async function sign(privKey, event) {
  const eventBase = { ...event, created_at: Math.floor(Date.now() / 1000) };
  const newEvent = {
    ...eventBase,
    id: nostr.getEventHash(eventBase),
  };
  return nostr.signEvent(newEvent, privKey);
}

function getPool(privKey) {
  if (!poolInstance) {
    if (!privKey) throw new Error("getPool: privKey is required");
    poolInstance = new SimplePool();
    privKeyInstance = privKey;
  }
  return {
    publish: (signedEvent, onSuccess, onError) =>
      publish(poolInstance, privKeyInstance, signedEvent, onSuccess, onError),
    sign: (event) => sign(privKeyInstance, event),
  };
}

module.exports = {
  getPool,
};
