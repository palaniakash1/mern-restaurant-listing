export const PERMISSIONS = {
  superAdmin: {
    auth: ["login", "refresh", "logout"],

    user: [
      "create",
      "read",
      "update",
      "delete",
      "hardDelete",
      "assignRole",
      "listAll",
    ],

    restaurant: [
      "create",
      "read",
      "update",
      "delete",
      "restore",
      "hardDelete",
      "reassignAdmin",
      "changeStatus",
      "listAll",
    ],

    category: [
      "create",
      "read",
      "update",
      "delete",
      "restore",
      "hardDelete",
      "bulkUpdate",
      "listAll",
    ],

    menu: [
      "create",
      "read",
      "update",
      "delete",
      "restore",
      "hardDelete",
      "changeStatus",
      "reorder",
    ],

    admin: ["readDashboard", "managePlatform"],

    audit: ["read", "export"],
  },

  admin: {
    auth: ["login", "refresh", "logout"],

    category: ["create", "update", "delete", "read"],
  },

  storeManager: {
    category: ["read"],
  },
};
