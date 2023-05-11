const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const { v4 } = require("uuid");
const createError = require("http-errors");
const db = require("./db");

const stepFunctions = new SFNClient({});
const eventBridge = new EventBridgeClient({});

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
          Time: new Date(startTimestamp),
        },
      ],
    });
    await eventBridge.send(command);

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

async function startAuction(event) {
  const { id } = JSON.parse(event.detail);

  const auction = await db.getAuction(id);
  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }

  if (auction.status !== "PENDING") {
    throw new createError.BadRequest(
      `Auction with ID "${id}" is not in a "PENDING" state.`
    );
  }

  await db.updateAuctionState(id, {
    ...auction,
    status: "IN_PROGRESS",
  });

  const params = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify({
      id,
      startPrice: auction.startPrice,
      minPrice: auction.minPrice,
      decreaseAmount: auction.decreaseAmount,
      roundDuration: auction.roundDuration,
    }),
  };

  const command = new StartExecutionCommand(params);
  await stepFunctions.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify(auction),
  };
}

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
  const { id, minPrice, decreaseAmount } = JSON.parse(event.input);
  const auction = await db.getAuction(id);

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found.`);
  }

  let currentPrice = auction.currentPrice - decreaseAmount;
  if (currentPrice < minPrice) {
    currentPrice = minPrice;
  }

  auction.currentPrice = currentPrice;
  await db.updateAuctionPrice(id, auction);

  const auctionFinished = currentPrice === minPrice;
  return {
    ...auction,
    currentPrice,
    auctionFinished,
  };
}

module.exports = {
  createAuction,
  getAuctionStatus,
  getAuctions,
  startAuction,
  updateAuctionState,
  checkIfAuctionBought,
  publishEventToNostr,
};
