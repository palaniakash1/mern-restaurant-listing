import { createPrivilegedUser } from '../services/admin.service.js';

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
