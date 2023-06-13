import { createErrorResponse } from "@libs/api-gateway";

export const errorAuctionNotFound = () =>
  createErrorResponse({
    statusCode: 404,
    message: "Auctions not found.",
  });

export const errorInvalidInput = (message: string) =>
  createErrorResponse({
    statusCode: 404,
    message,
  });

export const errorAuctionIsSpent = () =>
  createErrorResponse({
    statusCode: 404,
    message: "Inscription is spent.",
  });

export const errorAuctionIsRunning = () =>
  createErrorResponse({
    statusCode: 404,
    message: "An auction is running for this inscription.",
  });

export const internalServerError = () =>
  createErrorResponse({
    statusCode: 500,
  });
