import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import { traceDatabaseOperation } from '../tracing.js';

export const findUserById = (userId, { session = null, select = null } = {}) =>
  traceDatabaseOperation('userFindById', async () => {
    let query = User.findById(userId);
    if (session) {
      query = query.session(session);
    }
    if (select) {
      query = query.select(select);
    }
    return query;
  });

export const findUserByIdLean = (
  userId,
  { session = null, select = null } = {}
) =>
  traceDatabaseOperation('userFindByIdLean', async () => {
    let query = User.findById(userId);
    if (session) {
      query = query.session(session);
    }
    if (select) {
      query = query.select(select);
    }
    return query.lean();
  });

export const findUserOne = (filter, { session = null, select = null } = {}) =>
  traceDatabaseOperation('userFindOne', async () => {
    let query = User.findOne(filter);
    if (session) {
      query = query.session(session);
    }
    if (select) {
      query = query.select(select);
    }
    return query;
  });

export const countUsers = (filter = {}) =>
  traceDatabaseOperation('userCountDocuments', async () =>
    User.countDocuments(filter)
  );

export const listUsers = (
  filter = {},
  { select = null, skip = 0, limit = 10, sort = { createdAt: -1 } } = {}
) =>
  traceDatabaseOperation('userListUsers', async () => {
    let query = User.find(filter);
    if (select) {
      query = query.select(select);
    }
    return query.sort(sort).skip(skip).limit(limit).lean();
  });

export const updateUserById = (
  userId,
  update,
  { session = null, select = null, lean = false, new: isNew = true } = {}
) =>
  traceDatabaseOperation('userUpdateById', async () => {
    let query = User.findByIdAndUpdate(userId, update, {
      new: isNew,
      session
    });
    if (select) {
      query = query.select(select);
    }
    return lean ? query.lean() : query;
  });

export const deleteUserById = (userId, { session = null } = {}) =>
  traceDatabaseOperation('userDeleteById', async () =>
    User.findByIdAndDelete(userId, { session })
  );

export const createUser = (payload, { session = null } = {}) =>
  traceDatabaseOperation('userCreate', async () => {
    const [createdUser] = await User.create([payload], { session });
    return createdUser;
  });

export const saveUser = (user, { session = null } = {}) =>
  traceDatabaseOperation('userSave', async () => user.save({ session }));

export const findRestaurantById = (restaurantId, { session = null } = {}) =>
  traceDatabaseOperation('userFindRestaurantById', async () => {
    let query = Restaurant.findById(restaurantId);
    if (session) {
      query = query.session(session);
    }
    return query;
  });

export default {
  findUserById,
  findUserByIdLean,
  findUserOne,
  countUsers,
  listUsers,
  updateUserById,
  deleteUserById,
  createUser,
  saveUser,
  findRestaurantById
};
