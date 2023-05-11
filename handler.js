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
  const params = {
    stateMachineArn: `arn:aws:states:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:stateMachine:DutchAuctionStateMachine-${process.env.STAGE}`,
    name: auction.id, // unique name for the execution
    input: JSON.stringify(auction),
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
    startPrice,
    minPrice,
    decreaseAmount,
    roundDuration,
    startTimestamp,
  } = JSON.parse(event.body);
  const id = v4();
  const auction = {
    id,
    startPrice,
    minPrice,
    decreaseAmount,
    roundDuration,
    startTimestamp,
    currentPrice: startPrice,
    status: "PENDING",
  };

  console.log("Received event body:", JSON.parse(event.body));

  try {
    await db.saveAuction(auction);

    // Schedule the startAuction Lambda using EventBridge
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: "dutch-auction.start",
          DetailType: "AuctionScheduled",
          Detail: JSON.stringify({ id }),
          EventBusName: "default",
          Time: new Date(startTimestamp * 1000), // Convert Unix timestamp to JavaScript Date
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

    await db.updateAuctionState(id, auction);

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

const checkIfAuctionBought = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Auction checked" }),
  };
};

const publishEventToNostr = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Event published to Nostr" }),
  };
};

async function updateAuctionState(event) {
  console.log("event:", JSON.stringify(event, null, 2));
  const { id, minPrice, decreaseAmount } = event;
  const auction = await db.getAuction(id);

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }

  let newPrice = new Decimal(auction.currentPrice).minus(decreaseAmount);
  if (newPrice.lessThan(minPrice)) {
    newPrice = new Decimal(minPrice);
  }

  const currentPrice = newPrice.toNumber();
  auction.currentPrice = currentPrice;
  await db.updateAuctionPrice(id, auction);

  const auctionFinished = newPrice.equals(minPrice);
  return {
    ...auction,
    currentPrice,
    auctionFinished,
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

module.exports = {
  createAuction,
  getAuctionStatus,
  getAuctions,
  startAuction,
  finishAuction,
  updateAuctionState,
  checkIfAuctionBought,
  publishEventToNostr,
};
