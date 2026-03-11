import userService from '../services/user.service.js';

export const test = (req, res) => {
  res.json({ message: 'API test message is displaying' });
};

export const updateUser = async (req, res, next) => {
  try {
    const result = await userService.updateUserProfile({
      actor: req.user,
      targetUserId: req.params.id,
      body: req.body,
      req
    });

    res.status(200).json({
      success: true,
      message: 'user updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUserAccount({
      actor: req.user,
      targetUserId: req.params.id,
      req
    });

    res.status(200).json({
      success: true,
      message:
        req.user.role === 'superAdmin'
          ? 'User deleted successfully'
          : 'Account deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const result = await userService.deactivateUserAccount({
      actor: req.user,
      targetUserId: req.params.id,
      req
    });

    res.status(200).json({
      success: true,
      message:
        req.user.role === 'superAdmin'
          ? 'User deactivated successfully'
          : 'Account deactivated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const restoreUser = async (req, res, next) => {
  try {
    await userService.restoreUserAccount({
      actor: req.user,
      targetUserId: req.params.id,
      req
    });

    res.json({ success: true, message: 'user restored now!' });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsersForAdmin({
      actor: req.user,
      query: req.query
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableAdmins = async (req, res, next) => {
  try {
    const result = await userService.listAvailableAdmins({
      actor: req.user,
      query: req.query
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const createStoreManager = async (req, res, next) => {
  try {
    const result = await userService.createStoreManagerUser({
      actor: req.user,
      body: req.body,
      req
    });

    res.status(201).json({
      success: true,
      message: 'storeManager created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const assignStoreManagerToRestaurant = async (req, res, next) => {
  try {
    await userService.assignStoreManagerRestaurant({
      actor: req.user,
      storeManagerId: req.params.id,
      restaurantId: req.body.restaurantId,
      req
    });

    res.json({
      success: true,
      message: 'StoreManager assigned to restaurant'
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreManagers = async (req, res, next) => {
  try {
    const result = await userService.listStoreManagers({
      actor: req.user,
      query: req.query
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const unassignStoreManager = async (req, res, next) => {
  try {
    await userService.unassignStoreManagerRestaurant({
      actor: req.user,
      storeManagerId: req.params.id,
      req
    });

    res.json({ success: true, message: 'StoreManager unassigned' });
  } catch (error) {
    next(error);
  }
};

export const changeStoreManagerOwner = async (req, res, next) => {
  try {
    await userService.transferStoreManagerOwner({
      actor: req.user,
      storeManagerId: req.params.id,
      newAdminId: req.body.newAdminId,
      req
    });

    res.json({ success: true, message: 'Transferred successfully' });
  } catch (error) {
    next(error);
  }
};
