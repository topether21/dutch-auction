const AWS = require("aws-sdk");
const eventBridge = new AWS.EventBridge();
const { v4 } = require("uuid");

const {
  saveAuction,
  getAuction,
  updateAuctionState,
  listAuctions,
} = require("./db");

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
  };

  try {
    await saveAuction(auction);

    // Schedule the startAuction Lambda using EventBridge
    await eventBridge
      .putEvents({
        Entries: [
          {
            Source: "dutch-auction.custom",
            DetailType: "AuctionScheduled",
            Detail: JSON.stringify({ id }),
            EventBusName: "default",
            Time: new Date(startTimestamp),
          },
        ],
      })
      .promise();

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
    const auction = await getAuction(auctionId);

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
    const auctions = await listAuctions();

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

const startAuction = async (event) => {
  const { auctionId } = JSON.parse(event.body);

  const auction = await getAuction(auctionId);

  if (!auction) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Auction not found" }),
    };
  }

  const stateMachineParams = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify(auction),
  };

  await stepfunctions.startExecution(stateMachineParams).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Auction started" }),
  };
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

module.exports = {
  createAuction,
  getAuctionStatus,
  getAuctions,
  startAuction,
  updateAuctionState,
  checkIfAuctionBought,
  publishEventToNostr,
};
