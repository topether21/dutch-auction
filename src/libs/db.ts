import { Auction } from "@types";

const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const client = DynamoDBDocument.from(new DynamoDB(), {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

function removeUndefinedValues(obj) {
  for (let k in obj) {
    if (obj[k] === undefined) {
      delete obj[k];
    } else if (typeof obj[k] === "object" && obj[k] !== null) {
      removeUndefinedValues(obj[k]);
    }
  }
}

const getAuctionsByNostrAddress = async (nostrAddress) => {
  console.log(`nostrAddress: ${nostrAddress}, type: ${typeof nostrAddress}`);
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "nostrAddress-index",
    KeyConditionExpression: "#na = :na",
    ExpressionAttributeNames: {
      "#na": "nostrAddress",
    },
    ExpressionAttributeValues: {
      ":na": nostrAddress,
    },
  };

  try {
    const { Items } = await client.query(params);
    return Items;
  } catch (error) {
    console.error(`Error getting auctions by nostrAddress: ${error}`);
    throw error;
  }
};

const getAuctionsByInscriptionId = async (
  inscriptionId: string
): Promise<Auction[]> => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "inscriptionId-index",
    KeyConditionExpression: "#na = :na",
    ExpressionAttributeNames: {
      "#na": "inscriptionId",
    },
    ExpressionAttributeValues: {
      ":na": inscriptionId,
    },
  };
  try {
    const { Items } = await client.query(params);
    return Items;
  } catch (error) {
    console.error(`Error getting auctions by nostrAddress: ${error}`);
    throw error;
  }
};

const saveAuction = async (auction) => {
  removeUndefinedValues(auction);
  if (typeof auction.nostrAddress !== "string") {
    throw new Error("nostrAddress must be a string");
  }
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

const updateAuctionStatus = async (auctionId, status) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeValues: {
      ":status": status,
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

const updateAuctionMetadata = async (auctionId, metadata) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "SET metadata = :metadata",
    ExpressionAttributeValues: {
      ":metadata": metadata,
    },
  };

  try {
    await client.update(params);
  } catch (error) {
    console.error(`Error updating auction status: ${error}`);
    throw error;
  }
};

const updateAuctionPrice = async (auctionId, price) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: auctionId,
    },
    UpdateExpression: "SET currentPrice = :currentPrice",
    ExpressionAttributeValues: {
      ":currentPrice": price,
    },
  };

  try {
    await client.update(params);
  } catch (error) {
    console.error(`Error updating auction price: ${error}`);
    throw error;
  }
};

export {
  saveAuction,
  getAuction,
  updateAuctionStatus,
  updateAuctionMetadata,
  updateAuctionPrice,
  getAuctionsByNostrAddress,
  getAuctionsByInscriptionId,
  listAuctions,
  finishAuction,
};
