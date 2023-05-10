const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const saveAuction = async (auction) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: auction,
  };

  await dynamoDb.put(params).promise();
};

async function listAuctions() {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
  };

  try {
    const result = await dynamoDb.scan(params).promise();
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
    const result = await dynamoDb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error(error);
    throw new Error("Unable to get auction");
  }
};

const updateAuctionState = async (auctionId, updatedState) => {
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

  await dynamoDb.update(params).promise();
};

module.exports = {
  saveAuction,
  getAuction,
  updateAuctionState,
  listAuctions,
};
