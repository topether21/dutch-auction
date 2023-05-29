import "websocket-polyfill";
import { getEventHash, relayInit, signEvent, Event } from "nostr-tools";

const NOSTR_KIND_INSCRIPTION = 802;
const NOSTR_RELAY_URL = "wss://nostr.openordex.org";
const RELAYS = [NOSTR_RELAY_URL];

interface SellEventParams {
  inscriptionId: string;
  output: string;
  networkName?: string;
  priceInSats: number;
  signedPsbt: string;
  type?: string;
  pubkey: string;
}

interface SignedEvent extends Event {
  id: string;
  sig: string;
}

// Function to sign Nostr events
async function sign(
  event: Omit<Event, "sig">,
  privkey: string
): Promise<SignedEvent> {
  const eventBase = { ...event, created_at: Math.floor(Date.now() / 1000) };
  const newEvent = { ...eventBase, id: getEventHash(eventBase) };
  const sig = signEvent(newEvent, privkey);

  return { ...newEvent, sig };
}

// Function to construct the sell event
function getSellEvent({
  inscriptionId,
  output,
  networkName = "mainnet",
  priceInSats,
  signedPsbt,
  type = "sell",
  pubkey,
}: SellEventParams) {
  const event = {
    kind: NOSTR_KIND_INSCRIPTION,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["n", networkName], // Network name (e.g. "mainnet", "signet")
      ["t", type], // Type of order (e.g. "sell", "buy")
      ["i", inscriptionId], // Inscription ID
      ["u", output], // Inscription UTXO
      ["s", priceInSats.toString()], // Price in sats
      ["x", "deezy"], // Exchange name (e.g. "openordex")
    ],
    content: signedPsbt,
  };
  return {
    ...event,
    id: getEventHash(event),
  };
}

// Function to sign Nostr event
async function signNostrEvent({
  inscriptionId,
  output,
  priceInSats,
  signedPsbt,
  pubkey,
  privkey,
}: SellEventParams & { privkey: string }): Promise<SignedEvent> {
  const event = getSellEvent({
    inscriptionId,
    output,
    priceInSats,
    signedPsbt,
    pubkey,
  });
  const signedEvent = await sign(event, privkey);

  return signedEvent;
}

// Function to sign and broadcast Nostr event
async function signAndBroadcastEvent({
  inscriptionId,
  output,
  priceInSats,
  signedPsbt,
  pubkey,
  privkey,
}: SellEventParams & { privkey: string }): Promise<SignedEvent> {
  const signedEvent = await signNostrEvent({
    inscriptionId,
    output,
    priceInSats,
    signedPsbt,
    pubkey,
    privkey,
  });

  console.log("signedEvent:", JSON.stringify(signedEvent, null, 2));
  await publishEvent(signedEvent);
  return signedEvent;
}

// Function to publish the event to the Nostr network
const publishEvent = async (event: Event) => {
  console.info(`Processing ${event.id}`);

  const promises = RELAYS.map(
    (url) =>
      new Promise((resolve, reject) => {
        try {
          const relay = relayInit(url);
          const timeout = 10000;

          const timeoutAndClose = () => {
            console.error(`Timeout error: event ${event.id} relay ${url}`);
            relay.close();
            reject(new Error(`Timeout error: event ${event.id} relay ${url}`));
          };

          let timeoutCheck = setTimeout(timeoutAndClose, timeout);

          relay.on("connect", () => {
            console.info(`Sending ${event.id} to ${url}`, event);

            const pub = relay.publish(event);

            pub.on("ok", () => {
              console.info(`Event ${event.id} published to ${url}`);
              relay.close();
              clearTimeout(timeoutCheck);
              resolve({ id: event.id });
            });

            pub.on("failed", (reason: Error) => {
              console.warn(
                `Failed to publish ${event.id} to ${url}: ${reason}`
              );
              relay.close();
              clearTimeout(timeoutCheck);
              reject(`Failed to publish ${event.id} to ${url}: ${reason}`);
            });
          });

          relay.on("error", () => {
            console.error(`Failed to connect to ${url}`);
            clearTimeout(timeoutCheck);
            relay.close();
            reject(`Failed to connect to ${url}`);
          });

          return relay.connect();
        } catch (error) {
          console.error("Failed to publish", error);
          reject(error);
        }
      })
  );

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error(error);
  }
};

export { signAndBroadcastEvent, publishEvent };
