import { createErrorResponse } from "@libs/api-gateway";

export const auctionNotFound = () =>
  createErrorResponse({
    statusCode: 404,
    message: "Auctions not found.",
  });

export const auctionIsSpent = () =>
  createErrorResponse({
    statusCode: 404,
    message: "Inscription is spent.",
  });

export const auctionIsRunning = () =>
  createErrorResponse({
    statusCode: 404,
    message: "An auction is running for this inscription.",
  });

export const internalServerError = () =>
  createErrorResponse({
    statusCode: 500,
  });
