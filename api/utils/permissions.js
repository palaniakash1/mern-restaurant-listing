export const PERMISSIONS = {
  superAdmin: {
    auth: [
      'signout',
      'session',
      'changePassword',
      'manageUserSessions'
    ],
    admin: ['createPrivilegedUser'],
    audit: ['read'],
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
  },
  user: {
    auth: ['signout', 'session', 'changePassword'],
    user: ['updateSelf', 'deleteSelf', 'deactivateSelf'],
    review: ['readMine', 'readById', 'create', 'update', 'delete']
  }
};
