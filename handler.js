const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const Decimal = require("decimal.js");

const { v4 } = require("uuid");
const createError = require("http-errors");
const db = require("./db");

const stepFunctions = new SFNClient({});
const eventBridge = new EventBridgeClient({});

async function startStateMachine(auction) {
  console.log("Input StateMachine:", JSON.stringify(auction, null, 2));
  // Construct the auction's state machine parameters
  const params = {
    stateMachineArn: `arn:aws:states:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:stateMachine:DutchAuctionStateMachine-${process.env.STAGE}`,
    name: auction.id, // unique name for the execution
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

  console.log("startStateMachine:", JSON.stringify(params, null, 2));

  const command = new StartExecutionCommand(params);

  try {
    const { executionArn } = await stepFunctions.send(command);
    console.log(`Started execution for status machine. ARN: ${executionArn}`);
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
  };

  console.log("Received event body:", JSON.parse(event.body));

  try {
    await db.saveAuction(auction);

    // metadata the startAuction Lambda using EventBridge
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: new Date(startTime * 1000), // Convert Unix timestamp to JavaScript Date
        },
      ],
    });

    console.log(
      "Sending event to EventBridge:",
      JSON.stringify(command, null, 2)
    );

    const response = await eventBridge.send(command);

    console.log("EventBridge response:", JSON.stringify(response, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(auction),
    };
  } catch (error) {
    console.error("Error in createAuction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const startAuction = async (event) => {
  console.log(
    "Received event in startAuction:",
    JSON.stringify(event, null, 2)
  );

  const { id } = event.detail;

  try {
    const auction = await db.getAuction(id);

    console.log("Retrieved auction:", JSON.stringify(auction, null, 2));

    if (auction.status !== "PENDING") {
      throw new createError.BadRequest(
        `Auction with ID "${id}" is not pending. Current status: ${auction.status}`
      );
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

const getAuctionStatus = async (event) => {
  const auctionId = event.pathParameters.auctionId;

  try {
    const auction = await db.getAuction(auctionId);

    if (!auction) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auction not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(auction),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const getAuctions = async () => {
  try {
    const auctions = await db.listAuctions();

    return {
      statusCode: 200,
      body: JSON.stringify(auctions),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

async function updateAuctionStatus(event) {
  console.log("event:", JSON.stringify(event, null, 2));

  const { id, metadata } = event;

  const auction = await db.getAuction(id);

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }

  // Check if there are no more scheduled prices
  if (metadata.length === 0) {
    auction.status = "FINISHED";
    await db.updateAuctionStatus(id, auction);
    return {
      ...auction,
      auctionFinished: true,
    };
  }

  // Get the next scheduled price and update the auction
  const nextScheduledPrice = metadata.shift();

  auction.currentPrice = nextScheduledPrice.price;
  auction.metadata = metadata;

  await db.updateAuctionStatus(id, auction);

  return {
    ...auction,
    auctionFinished: false,
  };
}

async function finishAuction(event) {
  console.log("event:", JSON.stringify(event, null, 2));
  const { id } = event;
  const auction = await db.getAuction(id);

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }

  if (auction.status !== "FINISHED") {
    auction.status = "FINISHED";
    await db.finishAuction(id);
  }

  console.log(`Auction ${id} status set to FINISHED`);

  return auction;
}

async function isAuctionBought(event) {
  return false;
}

async function publishEventToNostr(event) {}

module.exports = {
  createAuction,
  getAuctionStatus,
  getAuctions,
  startAuction,
  finishAuction,
  updateAuctionStatus,
};
