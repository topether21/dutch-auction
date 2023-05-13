const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const client = DynamoDBDocument.from(new DynamoDB());

const saveAuction = async (auction) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: auction,
  };

  try {
    await client.put(params);
  } catch (error) {
    console.error(`Error saving auction: ${error}`);
    throw error;
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
    console.error(`Error listing auctions: ${error}`);
    throw error;
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
    console.error(`Error getting auction: ${error}`);
    throw error;
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
    console.error(`Error finishing auction: ${error}`);
    throw error;
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
    console.error(`Error updating auction status: ${error}`);
    throw error;
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
    console.error(`Error updating auction price: ${error}`);
    throw error;
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
