/** Error carrying an HTTP status, mapped to a JSON response by `handleError`. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
