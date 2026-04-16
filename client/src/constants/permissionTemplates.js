export const PRIVILEGED_ROLE_TEMPLATES = {
  admin: {
    auth: ['signout', 'session', 'changePassword'],
    audit: ['read'],
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
    review: ['readById', 'moderate']
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
  }
};

export const PERMISSION_GROUPS = [
  {
    id: 'auth',
    title: 'Authentication & Sessions',
    permissions: [
      {
        key: 'auth.signout',
        label: 'Sign Out Sessions',
        description: 'Allow secure sign-out and token lifecycle actions.'
      },
      {
        key: 'auth.session',
        label: 'View Session',
        description: 'Allow access to the current signed-in session.'
      },
      {
        key: 'auth.changePassword',
        label: 'Change Password',
        description: 'Allow the user to update their own password.'
      }
    ]
  },
  {
    id: 'user',
    title: 'User Management',
    permissions: [
      {
        key: 'user.listStoreManagers',
        label: 'View Store Managers',
        description: 'List store-manager accounts they are allowed to manage.'
      },
      {
        key: 'user.createStoreManager',
        label: 'Create Store Managers',
        description: 'Create store-manager users from the dashboard.'
      },
      {
        key: 'user.assignStoreManager',
        label: 'Assign Store Access',
        description: 'Assign store managers to restaurants.'
      },
      {
        key: 'user.unassignStoreManager',
        label: 'Remove Store Access',
        description: 'Unassign store managers from restaurants.'
      },
      {
        key: 'user.reassignAdmin',
        label: 'Reassign Restaurants',
        description: 'Reassign restaurants to admins.'
      },
      {
        key: 'user.updateSelf',
        label: 'Edit Own Profile',
        description: 'Update their own user profile details.'
      },
      {
        key: 'user.deleteSelf',
        label: 'Delete Own Account',
        description: 'Delete their own account when permitted.'
      },
      {
        key: 'user.deactivateSelf',
        label: 'Deactivate Own Account',
        description: 'Deactivate their own account instead of deleting it.'
      }
    ]
  },
  {
    id: 'restaurant',
    title: 'Restaurant Operations',
    permissions: [
      {
        key: 'restaurant.create',
        label: 'Create Restaurants',
        description: 'Create new restaurant records.'
      },
      {
        key: 'restaurant.readMine',
        label: 'View Assigned Restaurant',
        description: 'Open the restaurant they are scoped to.'
      },
      {
        key: 'restaurant.readAllMine',
        label: 'View Owned Restaurants',
        description: 'Browse all restaurants in their ownership scope.'
      },
      {
        key: 'restaurant.readMineSummary',
        label: 'View Restaurant Summary',
        description: 'Access restaurant summary and dashboard details.'
      },
      {
        key: 'restaurant.readById',
        label: 'Read Restaurant By ID',
        description: 'Open specific restaurant records by ID.'
      },
      {
        key: 'restaurant.updateById',
        label: 'Edit Restaurants',
        description: 'Update assigned restaurant details.'
      },
      {
        key: 'restaurant.deleteById',
        label: 'Delete Restaurants',
        description: 'Delete assigned restaurant records.'
      }
    ]
  },
  {
    id: 'category',
    title: 'Categories',
    permissions: [
      {
        key: 'category.readMine',
        label: 'View Categories',
        description: 'Browse category records in scope.'
      },
      {
        key: 'category.create',
        label: 'Create Categories',
        description: 'Add new menu categories.'
      },
      {
        key: 'category.update',
        label: 'Edit Categories',
        description: 'Update category names and metadata.'
      },
      {
        key: 'category.delete',
        label: 'Delete Categories',
        description: 'Soft-delete category records.'
      },
      {
        key: 'category.updateStatus',
        label: 'Change Category Status',
        description: 'Toggle category publish and block states.'
      },
      {
        key: 'category.reorder',
        label: 'Reorder Categories',
        description: 'Change category sort order.'
      },
      {
        key: 'category.bulkStatus',
        label: 'Bulk Status Updates',
        description: 'Update multiple category statuses at once.'
      },
      {
        key: 'category.bulkReorder',
        label: 'Bulk Reorder',
        description: 'Reorder multiple categories in one action.'
      },
      {
        key: 'category.checkSlug',
        label: 'Validate Slugs',
        description: 'Check category slug availability.'
      },
      {
        key: 'category.readAudit',
        label: 'View Category Audit',
        description: 'Inspect category audit history.'
      },
      {
        key: 'category.readById',
        label: 'Read Category Detail',
        description: 'Open a single category detail view.'
      }
    ]
  },
  {
    id: 'menu',
    title: 'Menu & Inventory',
    permissions: [
      {
        key: 'menu.create',
        label: 'Create Menus',
        description: 'Create new menu records.'
      },
      {
        key: 'menu.addItem',
        label: 'Add Menu Items',
        description: 'Create new items under a menu.'
      },
      {
        key: 'menu.updateItem',
        label: 'Edit Menu Items',
        description: 'Edit names, descriptions, prices, and images.'
      },
      {
        key: 'menu.deleteItem',
        label: 'Delete Menu Items',
        description: 'Remove menu items from active use.'
      },
      {
        key: 'menu.toggleAvailability',
        label: 'Toggle Availability',
        description: 'Mark items available or out of stock.'
      },
      {
        key: 'menu.updateStatus',
        label: 'Change Menu Status',
        description: 'Update menu publication state.'
      },
      {
        key: 'menu.reorder',
        label: 'Reorder Menu',
        description: 'Change item ordering within menus.'
      },
      {
        key: 'menu.restore',
        label: 'Restore Deleted Items',
        description: 'Restore soft-deleted menu data.'
      },
      {
        key: 'menu.readDeleted',
        label: 'View Deleted Menu Data',
        description: 'See deleted menu records and items.'
      },
      {
        key: 'menu.readAudit',
        label: 'View Menu Audit',
        description: 'Inspect menu audit history.'
      },
      {
        key: 'menu.readById',
        label: 'Read Menu Detail',
        description: 'Open a single menu detail record.'
      },
      {
        key: 'menu.delete',
        label: 'Delete Menus',
        description: 'Delete entire menu records.'
      }
    ]
  },
  {
    id: 'review',
    title: 'Reviews',
    permissions: [
      {
        key: 'review.readById',
        label: 'View Reviews',
        description: 'Read review details in their permitted scope.'
      },
      {
        key: 'review.moderate',
        label: 'Moderate Reviews',
        description: 'Approve, hide, or manage review visibility.'
      }
    ]
  },
  {
    id: 'audit',
    title: 'Audit & Compliance',
    permissions: [
      {
        key: 'audit.read',
        label: 'View Audit Logs',
        description: 'Access audit log entries for investigations and reviews.'
      }
    ]
  }
];

export const buildPermissionStateForRole = (role) => {
  const template = PRIVILEGED_ROLE_TEMPLATES[role] || {};
  const enabled = new Set(
    Object.entries(template).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}.${action}`)
    )
  );

  return PERMISSION_GROUPS.reduce((state, group) => {
    for (const permission of group.permissions) {
      state[permission.key] = enabled.has(permission.key);
    }
    return state;
  }, {});
};

export const buildPermissionStateFromPayload = (permissions, fallbackRole) => {
  if (!permissions || Object.keys(permissions).length === 0) {
    return buildPermissionStateForRole(fallbackRole);
  }

  const enabled = new Set(
    Object.entries(permissions).flatMap(([resource, actions]) =>
      (actions || []).map((action) => `${resource}.${action}`)
    )
  );

  return PERMISSION_GROUPS.reduce((state, group) => {
    for (const permission of group.permissions) {
      state[permission.key] = enabled.has(permission.key);
    }
    return state;
  }, {});
};

export const buildPermissionPayload = (permissionState) => {
  const payload = {};

  for (const [key, enabled] of Object.entries(permissionState || {})) {
    if (!enabled) continue;

    const [resource, action] = key.split('.');
    if (!resource || !action) continue;

    if (!payload[resource]) {
      payload[resource] = [];
    }

    payload[resource].push(action);
  }

  return Object.fromEntries(
    Object.entries(payload).map(([resource, actions]) => [
      resource,
      [...new Set(actions)].sort()
    ])
  );
};

export const countEnabledPermissions = (permissionState) =>
  Object.values(permissionState || {}).filter(Boolean).length;
