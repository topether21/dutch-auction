const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBDocumentClient({ client: new DynamoDBClient() });

const saveAuction = async (auction) => {
  const Item = {
    id: auction.id,
    initialPrice: auction.initialPrice,
    startTime: auction.startTime,
    metadata: auction.metadata?.map((item) => ({
      price: item.price,
      scheduledTime: item.scheduledTime,
      signedPsbt: item.signedPsbt,
    })),
    status: auction.status,
    decreaseAmount: auction.decreaseAmount,
    reservePrice: auction.reservePrice,
    currentPrice: auction.currentPrice,
    decreaseInterval: auction.decreaseInterval,
  };

  // Remove undefined values
  Object.keys(Item).forEach(
    (key) => Item[key] === undefined && delete Item[key]
  );

  // Filter metadata array
  if (Item.metadata) {
    Item.metadata = Item.metadata.filter(
      (item) =>
        item.price !== undefined &&
        item.scheduledTime !== undefined &&
        item.signedPsbt !== undefined
    );
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item,
  };

  try {
    await client.put(params);
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to save auction: ${error.message}`);
  }
};

const listAuctions = async () => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
  };

  try {
    const { Items } = await client.scan(params);
    return Items;
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to list auctions: ${error.message}`);
  }
};

const getAuction = async (auctionId) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
  };

  try {
    const { Item } = await client.get(params);
    return Item;
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to get auction: ${error.message}`);
  }
};

const finishAuction = async (auctionId) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: { id: auctionId },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeValues: {
      ":status": "FINISHED",
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  try {
    await client.update(params);
    return { status: "FINISHED" };
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to finish auction: ${error.message}`);
  }
};

const updateAuctionStatus = async (auctionId, updatedState) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "SET currentPrice = :currentPrice, #status = :status",
    ExpressionAttributeValues: {
      ":currentPrice": updatedState.currentPrice,
      ":status": updatedState.status,
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  try {
    await client.update(params);
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to update auction status: ${error.message}`);
  }
};

const updateAuctionPrice = async (auctionId, updatedState) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "SET currentPrice = :currentPrice",
    ExpressionAttributeValues: {
      ":currentPrice": updatedState.currentPrice,
    },
  };

  try {
    await client.update(params);
  } catch (error) {
    console.error(error);
    throw new Error(`Unable to update auction price: ${error.message}`);
  }
};

module.exports = {
  saveAuction,
  getAuction,
  updateAuctionStatus,
  updateAuctionPrice,
  listAuctions,
  finishAuction,
};
