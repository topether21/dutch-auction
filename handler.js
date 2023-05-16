const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const { v4 } = require("uuid");
const createError = require("http-errors");
const db = require("./db");
const nostr = require("./nostr");
const { headers } = require("./utils");
const inscriptions = require("./inscriptions");

const stepFunctions = new SFNClient({});
const eventBridge = new EventBridgeClient({});

async function startStateMachine(auction) {
  const params = {
    stateMachineArn: `arn:aws:states:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:stateMachine:DutchAuctionStateMachine-${process.env.STAGE}`,
    name: auction.id,
    input: JSON.stringify({
      id: auction.id,
      startTime: auction.startTime,
      decreaseAmount: auction.decreaseAmount,
      decreaseInterval: auction.decreaseInterval,
      initialPrice: auction.initialPrice,
      reservePrice: auction.reservePrice,
      currentPrice: auction.initialPrice,
      metadata: auction.metadata,
    }),
  };
  const command = new StartExecutionCommand(params);
  try {
    const { executionArn } = await stepFunctions.send(command);
    return executionArn;
  } catch (error) {
    console.error(`Failed to start status machine: ${error}`);
    throw error;
  }
}

const createAuction = async (event) => {
  const {
    startTime,
    decreaseAmount,
    decreaseInterval,
    initialPrice,
    reservePrice,
    metadata,
    nostrAddress,
    utxo,
  } = JSON.parse(event.body);
  const id = v4();
  const auction = {
    id,
    startTime,
    decreaseAmount,
    decreaseInterval,
    initialPrice,
    reservePrice,
    metadata,
    status: "PENDING",
    currentPrice: initialPrice,
    nostrAddress,
    utxo: {
      output: utxo.output,
      txid: utxo.txid,
    },
  };
  try {
    const status = await inscriptions.isSpent(auction.utxo?.output);
    if (status.spent) {
      auction.status = "SPENT";
      await db.saveAuction(auction);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(auction),
      };
    }
    await db.saveAuction(auction);
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: new Date(startTime * 1000),
        },
      ],
    });
    await eventBridge.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(auction),
      headers,
    };
  } catch (error) {
    console.error("Error in createAuction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
      headers,
    };
  }
};

const startAuction = async (event) => {
  const { id } = event.detail;
  try {
    const auction = await db.getAuction(id);
    if (auction.status !== "PENDING") {
      throw new createError.BadRequest(
        `Auction with ID "${id}" is not pending. Current status: ${auction.status}`
      );
    }

    const status = await inscriptions.isSpent(auction.utxo?.output);
    if (status.spent) {
      auction.status = "SPENT";
      await db.updateAuctionStatus(id, auction);
      return {
        statusCode: 200,
        body: JSON.stringify(auction),
      };
    }

    auction.status = "RUNNING";
    const executionArn = await startStateMachine(auction);
    auction.executionArn = executionArn;
    await db.updateAuctionStatus(id, auction);
    return {
      statusCode: 200,
      body: JSON.stringify(auction),
    };
  } catch (error) {
    console.error("Error in startAuction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const getAuctionsByAddress = async (event) => {
  const address = event.pathParameters.address;
  try {
    const auction = await db.getAuctionsByNostrAddress(address);
    if (!auction) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auctions not found" }),
        headers,
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(auction),
      headers,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
      headers,
    };
  }
};

const getAuctionStatusById = async (event) => {
  const auctionId = event.pathParameters.auctionId;
  try {
    const auction = await db.getAuction(auctionId);
    if (!auction) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auction not found" }),
        headers,
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(auction),
      headers,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
      headers,
    };
  }
};

const getAuctions = async () => {
  try {
    const auctions = await db.listAuctions();
    return {
      statusCode: 200,
      body: JSON.stringify(auctions),
      headers,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
      headers,
    };
  }
};

async function updateAuctionStatus(event) {
  const { id, metadata } = event;
  const auction = await db.getAuction(id);
  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }
  const status = await inscriptions.isSpent(auction.utxo.output);
  if (status.spent) {
    auction.status = "SPENT";
    await db.updateAuctionStatus(id, auction);
    return {
      ...auction,
      auctionFinished: true,
    };
  }
  if (metadata.length === 0) {
    auction.status = "FINISHED";
    await db.updateAuctionStatus(id, auction);
    return {
      ...auction,
      auctionFinished: true,
    };
  }
  const currentEvent = metadata.shift();
  auction.currentPrice = currentEvent.price;
  auction.metadata = metadata;
  try {
    const input = {
      pubkey: process.env.NOSTR_PUBLIC_KEY,
      privkey: process.env.NOSTR_PRIVATE_KEY,
      utxo: currentEvent.utxo,
      priceInSats: currentEvent.price,
      signedPsbt: currentEvent.signedPsbt,
    };
    await nostr.signAndBroadcastEvent(input);
  } catch (error) {
    console.error("Error in signAndBroadcastEvent:", error);
  } finally {
    console.log("signAndBroadcastEvent complete");
  }
  await db.updateAuctionStatus(id, auction);
  return {
    ...auction,
    auctionFinished: false,
  };
}

async function finishAuction(event) {
  const { id } = event;
  const auction = await db.getAuction(id);
  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }
  if (auction.status !== "FINISHED" && auction.status !== "SPENT") {
    auction.status = "FINISHED";
    await db.finishAuction(id);
  }
  console.log(`Auction ${id} status set to FINISHED`);
  return auction;
}

const publishEvent = async (event) => {
  const nostrEvent = JSON.parse(event.body);
  try {
    await nostr.publishEvent(nostrEvent);
    return {
      statusCode: 200,
      body: JSON.stringify(nostrEvent),
    };
  } catch (error) {
    console.error("Error in createAuction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const isSpent = async (event) => {
  const output = event.pathParameters.output;
  try {
    const result = await inscriptions.isSpent(output);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ output, ...result }),
    };
  } catch (error) {
    console.error("Error in createAuction:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

module.exports = {
  isSpent,
  createAuction,
  getAuctionStatusById,
  getAuctionsByAddress,
  getAuctions,
  startAuction,
  finishAuction,
  updateAuctionStatus,
  publishEvent,
};
