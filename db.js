const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb"),
  { DynamoDB } = require("@aws-sdk/client-dynamodb");
const dynamoDb = DynamoDBDocument.from(new DynamoDB());

const saveAuction = async (auction) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: auction,
  };

  await dynamoDb.put(params);
};

async function listAuctions() {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
  };

  try {
    const result = await dynamoDb.scan(params);
    return result.Items;
  } catch (error) {
    console.error(error);
    throw new Error("Unable to list auctions");
  }
}

const getAuction = async (auctionId) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
  };

  try {
    const result = await dynamoDb.get(params);
    return result.Item;
  } catch (error) {
    console.error(error);
    throw new Error("Unable to get auction");
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
    await dynamoDb.update(params);
    return { status: "FINISHED" };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const updateAuctionState = async (auctionId, updatedState) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "set currentPrice = :currentPrice, #status = :status",
    ExpressionAttributeValues: {
      ":currentPrice": updatedState.currentPrice,
      ":status": updatedState.status,
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  await dynamoDb.update(params);
};

const updateAuctionPrice = async (auctionId, updatedState) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "set currentPrice = :currentPrice",
    ExpressionAttributeValues: {
      ":currentPrice": updatedState.currentPrice,
    },
  };

  await dynamoDb.update(params);
};

module.exports = {
  saveAuction,
  getAuction,
  updateAuctionState,
  updateAuctionPrice,
  listAuctions,
  finishAuction,
};
