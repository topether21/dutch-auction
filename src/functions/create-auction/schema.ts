export default {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    startTime: {
      type: "integer",
    },
    decreaseAmount: {
      type: "integer",
    },
    timeBetweenEachDecrease: {
      type: "integer",
    },
    startPrice: {
      type: "integer",
    },
    reservePrice: {
      type: "integer",
    },
    inscriptionId: {
      type: "string",
    },
    output: {
      type: "string",
    },
    nostrAddress: {
      type: "string",
    },
    metadata: {
      type: "array",
      items: [
        {
          type: "object",
          properties: {
            scheduledTime: {
              type: "integer",
            },
            price: {
              type: "integer",
            },
            signedPsbt: {
              type: "string",
            },
          },
          required: ["scheduledTime", "price", "signedPsbt"],
        },
        {
          type: "object",
          properties: {
            scheduledTime: {
              type: "integer",
            },
            price: {
              type: "integer",
            },
            signedPsbt: {
              type: "string",
            },
          },
          required: ["scheduledTime", "price", "signedPsbt"],
        },
      ],
    },
  },
  required: [
    "startTime",
    "decreaseAmount",
    "timeBetweenEachDecrease",
    "startPrice",
    "reservePrice",
    "inscriptionId",
    "output",
    "nostrAddress",
    "metadata",
  ],
} as const;
