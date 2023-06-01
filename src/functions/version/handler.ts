import { internalServerError } from "@functions/errors";
import { createHttpResponse } from "@libs/api-gateway";

export const getVersion = async () => {
  try {
    return createHttpResponse(200, { v1: "0.0.1" });
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};
