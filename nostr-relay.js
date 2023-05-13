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

class NostrRelay {
  constructor(privKey) {
    this.pool = new SimplePool();
    this.subs = [];
    this.relays = [...RELAYS];
    this.events = [];
    this.privKey = privKey;
  }

  publish(signedEvent, onSuccess, onError) {
    const event = cleanEvent(signedEvent);

    const pubs = this.pool.publish(this.relays, event);
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

  async sign(event) {
    const eventBase = { ...event, created_at: Math.floor(Date.now() / 1000) };
    const newEvent = {
      ...eventBase,
      id: nostr.getEventHash(eventBase),
    };
    return nostr.signEvent(newEvent, this.privKey);
  }
}

let nostrPoolInstance = null;

function getNostrPool(privKey) {
  if (!nostrPoolInstance) {
    if (!privKey) throw new Error("NostrRelay: privKey is required");
    nostrPoolInstance = new NostrRelay(privKey);
  }
  return nostrPoolInstance;
}

module.exports = {
  getNostrPool,
};
