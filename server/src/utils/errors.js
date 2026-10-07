/** An error whose message is safe to show to the end user. */
class AppError extends Error {
  constructor(status, message, { code, cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppError };
