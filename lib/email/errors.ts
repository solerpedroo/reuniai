import "server-only";

export class EmailDeliveryError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(message: string, status: number, responseBody = "") {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

/** @deprecated Use EmailDeliveryError */
export { EmailDeliveryError as ResendDeliveryError };
