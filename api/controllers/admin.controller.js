import {
  createPrivilegedUser,
  updatePrivilegedUser
} from '../services/admin.service.js';

export const createUserBySuperAdmin = async (req, res, next) => {
  try {
    const result = await createPrivilegedUser({
      actor: req.user,
      body: req.body,
      req
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateUserBySuperAdmin = async (req, res, next) => {
  try {
    const result = await updatePrivilegedUser({
      actor: req.user,
      targetUserId: req.params.id,
      body: req.body,
      req
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
