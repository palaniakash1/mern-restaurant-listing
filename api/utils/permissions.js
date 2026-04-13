export const PERMISSIONS = {
  superAdmin: {
    auth: ['signout', 'session', 'changePassword', 'manageUserSessions'],
    admin: ['createPrivilegedUser'],
    audit: ['read'],
    dashboard: ['read'],
    user: [
      'test',
      'listAll',
      'listAdmins',
      'listStoreManagers',
      'createStoreManager',
      'updateAny',
      'deleteAny',
      'deactivateAny',
      'restoreAny',
      'assignStoreManager',
      'changeStoreManagerOwner',
      'unassignStoreManager'
    ],
    restaurant: [
      'create',
      'readMine',
      'readAllMine',
      'readMineSummary',
      'listAll',
      'readById',
      'updateById',
      'deleteById',
      'updateStatus',
      'restore',
      'reassignAdmin',
      'updateMine'
    ],
    category: [
      'readMine',
      'readAll',
      'readDeleted',
      'export',
      'bulkStatus',
      'bulkReorder',
      'reorder',
      'checkSlug',
      'create',
      'updateStatus',
      'restore',
      'hardDelete',
      'readAudit',
      'readById',
      'update',
      'delete'
    ],
    menu: [
      'create',
      'readAll',
      'readDeleted',
      'addItem',
      'updateItem',
      'deleteItem',
      'toggleAvailability',
      'updateStatus',
      'reorder',
      'restore',
      'readAudit',
      'hardDelete',
      'readById',
      'delete'
    ],
    review: ['readMine', 'readById', 'create', 'update', 'delete', 'moderate']
  },
  admin: {
    auth: ['signout', 'session', 'changePassword'],
    audit: ['read'],
    dashboard: ['read'],
    user: [
      'listStoreManagers',
      'createStoreManager',
      'updateSelf',
      'deleteSelf',
      'deactivateSelf',
      'assignStoreManager',
      'unassignStoreManager'
    ],
    restaurant: [
      'create',
      'readMine',
      'readAllMine',
      'readMineSummary',
      'readById',
      'updateById',
      'deleteById'
    ],
    category: [
      'readMine',
      'bulkStatus',
      'bulkReorder',
      'reorder',
      'checkSlug',
      'create',
      'updateStatus',
      'readAudit',
      'readById',
      'update',
      'delete'
    ],
    menu: [
      'create',
      'readDeleted',
      'addItem',
      'updateItem',
      'deleteItem',
      'toggleAvailability',
      'updateStatus',
      'reorder',
      'restore',
      'readAudit',
      'readById',
      'delete'
    ],
    review: ['readById', 'create', 'update', 'delete', 'moderate']
  },
  storeManager: {
    auth: ['signout', 'session', 'changePassword'],
    menu: [
      'readDeleted',
      'addItem',
      'updateItem',
      'deleteItem',
      'toggleAvailability',
      'updateStatus',
      'reorder',
      'restore',
      'readAudit',
      'readById',
      'delete'
    ],
    review: ['readById']
  },
  user: {
    auth: ['signout', 'session', 'changePassword'],
    user: ['updateSelf', 'deleteSelf', 'deactivateSelf'],
    review: ['readMine', 'readById', 'create', 'update', 'delete']
  }
};

const isPermissionTree = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const clonePermissionsForRole = (role) => {
  const defaults = PERMISSIONS[role] || {};
  return Object.fromEntries(
    Object.entries(defaults).map(([resource, actions]) => [
      resource,
      [...actions]
    ])
  );
};

export const hasCustomPermissionOverrides = (permissions) =>
  isPermissionTree(permissions) && Object.keys(permissions).length > 0;

export const normalizePermissionOverrides = (
  role,
  requestedPermissions = {}
) => {
  const defaults = PERMISSIONS[role] || {};

  if (!hasCustomPermissionOverrides(requestedPermissions)) {
    return null;
  }

  const normalized = {};

  for (const [resource, actions] of Object.entries(requestedPermissions)) {
    const allowedActions = defaults[resource];
    if (!Array.isArray(allowedActions)) {
      continue;
    }

    const uniqueValidActions = [...new Set(actions || [])].filter((action) =>
      allowedActions.includes(action)
    );

    if (uniqueValidActions.length) {
      normalized[resource] = uniqueValidActions.sort();
    }
  }

  return hasCustomPermissionOverrides(normalized) ? normalized : null;
};

export const resolvePermissionsForUser = (user = {}) => {
  if (user.role === 'superAdmin') {
    return clonePermissionsForRole('superAdmin');
  }

  if (hasCustomPermissionOverrides(user.customPermissions)) {
    return (
      normalizePermissionOverrides(user.role, user.customPermissions) || {}
    );
  }

  return clonePermissionsForRole(user.role);
};

export const hasPermission = (user, resource, action) => {
  const resolvedPermissions = resolvePermissionsForUser(user);
  return Boolean(resolvedPermissions[resource]?.includes(action));
};
