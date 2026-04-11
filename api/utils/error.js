export const errorHandler = (statusCode, message, extra = null) => {
  const error = new Error();
  error.statusCode = statusCode;
  error.message = message;
  if (extra) {
    error.extra = extra;
  }
  return error;
};
