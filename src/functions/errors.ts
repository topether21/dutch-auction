import { createErrorResponse } from "@libs/api-gateway";
import { ZodError } from "zod";
import { generateErrorMessage, ErrorMessageOptions } from "zod-error";

const options: ErrorMessageOptions = {
  delimiter: {
    error: " 🔥 ",
  },
  transform: ({ errorMessage, index }) =>
    `Error #${index + 1}: ${errorMessage}`,
};

export const errorAuctionNotFound = () =>
  createErrorResponse({
    statusCode: 404,
    message: "Auctions not found.",
  });

export const errorInvalidInput = (error: ZodError) =>
  createErrorResponse({
    statusCode: 404,
    message: generateErrorMessage(error.issues, options),
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
