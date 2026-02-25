import mongoose from "mongoose";
/**
 * Runs a MongoDB transaction safely.
 *
 * @param {(session: mongoose.ClientSession) => Promise<any>} fn
 * @returns {Promise<any>}
 */
export const withTransaction = async (fn) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Execute business logic
    const result = await fn(session);

    // Commit only if everything succeeded
    await session.commitTransaction();

    return result;
  } catch (error) {
    // Abort only if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};
