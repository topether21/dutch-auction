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
      timeBetweenEachDecrease: auction.timeBetweenEachDecrease,
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
    timeBetweenEachDecrease,
    initialPrice,
    reservePrice,
    metadata,
    nostrAddress,
    inscriptionId,
    output,
  } = JSON.parse(event.body);
  const id = v4();
  const auction = {
    id,
    startTime,
    decreaseAmount,
    timeBetweenEachDecrease,
    initialPrice,
    reservePrice,
    metadata: metadata.map((m) => ({ ...m, id: v4() })),
    currentPrice: initialPrice,
    status: "PENDING",
    nostrAddress,
    inscriptionId,
    output,
  };
  try {
    const inscriptionStatus = await inscriptions.isSpent(auction.output);
    if (inscriptionStatus.spent) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Inscription is spent.",
        }),
        headers,
      };
    }
    const auctions = await db.getAuctionsByInscriptionId(inscriptionId);
    if (auctions.length > 0 && auctions.some((a) => a.status === "RUNNING")) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Auction running for this inscription.",
        }),
        headers,
      };
    }
    const now = Math.floor(new Date().getTime() / 1000);
    const validStartTime = startTime < now ? now + 5 : startTime; // Always start the auction
    await db.saveAuction({ ...auction, startTime: validStartTime });
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: new Date(validStartTime),
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

    const inscriptionStatus = await inscriptions.isSpent(auction.output);
    if (inscriptionStatus.spent) {
      const status = "SPENT";
      await db.updateAuctionStatus(id, status);
      return {
        statusCode: 200,
        body: JSON.stringify({ ...auction, status }),
      };
    }

    const executionArn = await startStateMachine({ ...auction });
    auction.executionArn = executionArn;
    const status = "RUNNING";
    await db.updateAuctionStatus(id, status);
    return {
      statusCode: 200,
      body: JSON.stringify({ ...auction, status }),
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

const getAuctionsByInscriptionId = async (event) => {
  const inscriptionId = event.pathParameters.inscriptionId;
  try {
    const auctions = await db.getAuctionsByInscriptionId(inscriptionId);
    if (!auctions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auctions not found" }),
        headers,
      };
    }
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

const stopAuctionById = async (event) => {
  const auctionId = event.pathParameters.id;
  try {
    const auction = await db.getAuction(auctionId);
    if (!auction) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auction not found" }),
        headers,
      };
    }
    await db.updateAuctionStatus(auctionId, "STOPPED");
    return {
      statusCode: 200,
      body: JSON.stringify({ ...auction, status: "STOPPED" }),
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
  const { id, metadata: stateMachineMetadata } = event;
  const auction = await db.getAuction(id);
  const auctionMetadata = auction.metadata;
  const stateMachineAuction = { ...auction, metadata: stateMachineMetadata };
  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }
  const inscriptionStatus = await inscriptions.isSpent(auction.output);
  if (inscriptionStatus.spent) {
    const status = "SPENT";
    await db.updateAuctionStatus(id, status);
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  if (auction.status === "STOPPED") {
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  if (stateMachineMetadata.length === 0) {
    const status = "FINISHED";
    await db.updateAuctionStatus(id, status);
    return {
      ...stateMachineAuction,
      auctionFinished: true,
    };
  }
  const scheduledEvent = stateMachineAuction.metadata.shift();
  const currentPrice = scheduledEvent.price;
  try {
    const input = {
      pubkey: process.env.NOSTR_PUBLIC_KEY,
      privkey: process.env.NOSTR_PRIVATE_KEY,
      output: auction.output,
      inscriptionId: auction.inscriptionId,
      priceInSats: currentPrice,
      signedPsbt: scheduledEvent.signedPsbt,
    };
    const broadcastedEvent = await nostr.signAndBroadcastEvent(input);
    const currentMetadataIndex = auctionMetadata.findIndex(
      (m) => m.id === scheduledEvent.id
    );
    auctionMetadata[currentMetadataIndex] = {
      ...scheduledEvent,
      nostrEventId: broadcastedEvent.id,
    };
    await db.updateAuctionMetadata(id, auctionMetadata);
  } catch (error) {
    console.error("Error in signAndBroadcastEvent:", error);
  }
  await db.updateAuctionPrice(id, currentPrice);
  return {
    ...stateMachineAuction,
    currentPrice,
    auctionFinished: false,
  };
}

async function finishAuction(event) {
  const { id } = event;
  const auction = await db.getAuction(id);
  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }
  if (
    auction.status !== "FINISHED" &&
    auction.status !== "SPENT" &&
    auction.status !== "STOPPED"
  ) {
    auction.status = "FINISHED";
    await db.finishAuction(id);
  }
  console.log(`Auction ${id} status set to FINISHED`);
  return auction;
}

const publishEvent = async (event) => {
  const nostrEvent = JSON.parse(event.body);
  try {
    const result = await nostr.publishEvent(nostrEvent);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
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
  stopAuctionById,
  getAuctionsByAddress,
  getAuctionsByInscriptionId,
  getAuctions,
  startAuction,
  finishAuction,
  updateAuctionStatus,
  publishEvent,
};
