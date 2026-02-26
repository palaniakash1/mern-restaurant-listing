import mongoose from "mongoose";

const MAX_TRANSACTION_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableTransactionError = (error) => {
  if (!error) return false;

  const labels = Array.isArray(error.errorLabels) ? error.errorLabels : [];
  if (
    labels.includes("TransientTransactionError") ||
    labels.includes("UnknownTransactionCommitResult")
  ) {
    return true;
  }

  const message = String(error.message || "");
  return (
    message.includes("Unable to acquire IX lock") ||
    message.includes("WriteConflict") ||
    message.includes("NoSuchTransaction")
  );
};
/**
 * Runs a MongoDB transaction safely.
 *
 * @param {(session: mongoose.ClientSession) => Promise<any>} fn
 * @returns {Promise<any>}
 */
export const withTransaction = async (fn) => {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const shouldRetry =
        attempt < MAX_TRANSACTION_RETRIES &&
        isRetryableTransactionError(error);

      if (!shouldRetry) {
        throw error;
      }

      await sleep(25 * attempt);
    } finally {
      session.endSession();
    }
  }
};
