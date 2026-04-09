import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import Menu from '../models/menu.model.js';
import Category from '../models/category.model.js';
import AuditLog from '../models/auditLog.model.js';
import Review from '../models/review.model.js';
import { traceDatabaseOperation } from '../tracing.js';

const getScopedRestaurantIds = (currentUser) => {
  if (!currentUser || currentUser.role === 'superAdmin') return null;
  const restaurantIds = currentUser.restaurantIds?.length
    ? currentUser.restaurantIds
    : currentUser.restaurantId
      ? [currentUser.restaurantId]
      : [];
  return restaurantIds;
};

const getDashboardScope = async (currentUser) => {
  if (!currentUser || currentUser.role === 'superAdmin') {
    return {
      isSuperAdmin: true,
      restaurantIds: [],
      storeManagerIds: [],
      menuIds: [],
      categoryIds: [],
      reviewIds: [],
      scopedUserIds: []
    };
  }

  if (currentUser.role !== 'admin') {
    return {
      isSuperAdmin: false,
      restaurantIds: [],
      storeManagerIds: [],
      menuIds: [],
      categoryIds: [],
      reviewIds: [],
      scopedUserIds: [currentUser.id]
    };
  }

  const restaurantIds = getScopedRestaurantIds(currentUser);

  if (!restaurantIds.length) {
    return {
      isSuperAdmin: false,
      restaurantIds: [],
      storeManagerIds: [],
      menuIds: [],
      categoryIds: [],
      reviewIds: [],
      scopedUserIds: [currentUser.id]
    };
  }

  const [storeManagerIds, menuIds, categoryIds, reviewIds] = await Promise.all([
    User.find({
      role: 'storeManager',
      $or: [
        { restaurantId: { $in: restaurantIds } },
        { createdByAdminId: currentUser.id }
      ]
    }).distinct('_id'),
    Menu.find({ restaurantId: { $in: restaurantIds } }).distinct('_id'),
    Category.find({ restaurantId: { $in: restaurantIds } }).distinct('_id'),
    Review.find({ restaurantId: { $in: restaurantIds } }).distinct('_id')
  ]);

  return {
    isSuperAdmin: false,
    restaurantIds,
    storeManagerIds,
    menuIds,
    categoryIds,
    reviewIds,
    scopedUserIds: [currentUser.id, ...storeManagerIds]
  };
};

const buildAuditScopeFilter = (scope, currentUser, extraMatch = {}) => {
  if (!currentUser || scope.isSuperAdmin) {
    return { ...extraMatch };
  }

  if (!scope.restaurantIds.length) {
    return {
      ...extraMatch,
      actorId: currentUser.id
    };
  }

  return {
    ...extraMatch,
    $or: [
      { actorId: { $in: scope.scopedUserIds } },
      {
        entityType: 'restaurant',
        entityId: { $in: scope.restaurantIds }
      },
      {
        entityType: 'user',
        entityId: { $in: scope.storeManagerIds }
      },
      {
        entityType: 'menu',
        entityId: { $in: scope.menuIds }
      },
      {
        entityType: 'category',
        entityId: { $in: scope.categoryIds }
      },
      {
        entityType: 'review',
        entityId: { $in: scope.reviewIds }
      }
    ]
  };
};

export const getOverviewStats = async (currentUser = null) => {
  return traceDatabaseOperation('dashboardGetOverviewStats', async () => {
    const scope = await getDashboardScope(currentUser);
    const restaurantMatch =
      currentUser?.role === 'admin'
        ? { deletedAt: null, _id: { $in: scope.restaurantIds }, adminId: currentUser.id }
        : { deletedAt: null };
    const categoryMatch =
      currentUser?.role === 'admin'
        ? { deletedAt: null, restaurantId: { $in: scope.restaurantIds } }
        : { deletedAt: null };
    const menuMatch =
      currentUser?.role === 'admin'
        ? { deletedAt: null, restaurantId: { $in: scope.restaurantIds } }
        : { deletedAt: null };
    const reviewMatch =
      currentUser?.role === 'admin'
        ? { restaurantId: { $in: scope.restaurantIds } }
        : {};
    const scopedUserMatch =
      currentUser?.role === 'admin'
        ? {
          $or: [
            { _id: currentUser.id },
            { createdByAdminId: currentUser.id },
            { restaurantId: { $in: scope.restaurantIds } }
          ]
        }
        : {};
    const auditMatch = buildAuditScopeFilter(scope, currentUser);

    const [
      userStats,
      restaurantStats,
      categoryStats,
      menuStats,
      auditStats,
      reviewStats
    ] = await Promise.all([
      User.aggregate([
        { $match: scopedUserMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            newThisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            newThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]),
      Restaurant.aggregate([
        { $match: restaurantMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            blocked: {
              $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
            },
            newThisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            newThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]),
      Category.aggregate([
        { $match: categoryMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            generic: { $sum: { $cond: ['$isGeneric', 1, 0] } },
            newThisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            newThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]),
      Menu.aggregate([
        { $match: menuMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            totalItems: { $sum: { $size: { $ifNull: ['$items', []] } } },
            newThisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            newThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]),
      AuditLog.aggregate([
        { $match: auditMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            thisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            thisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]),
      Review.aggregate([
        { $match: reviewMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            thisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            thisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ])
    ]);

    return {
      users: userStats[0] || {
        total: 0,
        active: 0,
        newThisWeek: 0,
        newThisMonth: 0
      },
      restaurants: restaurantStats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        blocked: 0,
        newThisWeek: 0,
        newThisMonth: 0
      },
      categories: categoryStats[0] || {
        total: 0,
        active: 0,
        generic: 0,
        newThisWeek: 0,
        newThisMonth: 0
      },
      menus: menuStats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        totalItems: 0,
        newThisWeek: 0,
        newThisMonth: 0
      },
      auditLogs: auditStats[0] || { total: 0, thisWeek: 0, thisMonth: 0 },
      reviews: reviewStats[0] || { total: 0, thisWeek: 0, thisMonth: 0 }
    };
  });
};

export const getUserAnalytics = async (days = 30, currentUser = null) => {
  return traceDatabaseOperation('dashboardGetUserAnalytics', async () => {
    const scope = await getDashboardScope(currentUser);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signups = await User.aggregate([
      {
        $match:
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: startDate },
              $or: [
                { _id: currentUser.id },
                { createdByAdminId: currentUser.id },
                { restaurantId: { $in: scope.restaurantIds } }
              ]
            }
            : { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', signups: '$count', _id: 0 } }
    ]);

    const logins = await AuditLog.aggregate([
      {
        $match: buildAuditScopeFilter(scope, currentUser, {
          action: 'LOGIN',
          createdAt: { $gte: startDate }
        })
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', logins: '$count', _id: 0 } }
    ]);

    const visitors = await AuditLog.aggregate([
      {
        $match: buildAuditScopeFilter(scope, currentUser, {
          action: { $in: ['LOGIN', 'REFRESH'] },
          createdAt: { $gte: startDate }
        })
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', visitors: '$count', _id: 0 } }
    ]);

    const allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      allDates.push(date.toISOString().split('T')[0]);
    }

    const signupMap = new Map(signups.map((s) => [s.date, s.signups]));
    const loginMap = new Map(logins.map((l) => [l.date, l.logins]));
    const visitorMap = new Map(visitors.map((v) => [v.date, v.visitors]));

    return allDates.map((date) => ({
      date,
      signups: signupMap.get(date) || 0,
      logins: loginMap.get(date) || 0,
      visitors: visitorMap.get(date) || 0
    }));
  });
};

export const getContentAnalytics = async (days = 30, currentUser = null) => {
  return traceDatabaseOperation('dashboardGetContentAnalytics', async () => {
    const scope = await getDashboardScope(currentUser);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const restaurantCreations = await Restaurant.aggregate([
      {
        $match:
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: startDate },
              _id: { $in: scope.restaurantIds },
              adminId: currentUser.id
            }
            : { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', restaurants: '$count', _id: 0 } }
    ]);

    const menuCreations = await Menu.aggregate([
      {
        $match:
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: startDate },
              restaurantId: { $in: scope.restaurantIds }
            }
            : { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', menus: '$count', _id: 0 } }
    ]);

    const categoryCreations = await Category.aggregate([
      {
        $match:
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: startDate },
              restaurantId: { $in: scope.restaurantIds }
            }
            : { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', categories: '$count', _id: 0 } }
    ]);

    const allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      allDates.push(date.toISOString().split('T')[0]);
    }

    const restaurantMap = new Map(
      restaurantCreations.map((r) => [r.date, r.restaurants])
    );
    const menuMap = new Map(menuCreations.map((m) => [m.date, m.menus]));
    const categoryMap = new Map(
      categoryCreations.map((c) => [c.date, c.categories])
    );

    return allDates.map((date) => ({
      date,
      restaurants: restaurantMap.get(date) || 0,
      menus: menuMap.get(date) || 0,
      categories: categoryMap.get(date) || 0
    }));
  });
};

export const getUserRolesDistribution = async (currentUser = null) => {
  return traceDatabaseOperation(
    'dashboardGetUserRolesDistribution',
    async () => {
      const scope = await getDashboardScope(currentUser);
      return User.aggregate([
        ...(currentUser?.role === 'admin'
          ? [
            {
              $match: {
                $or: [
                  { _id: currentUser.id },
                  { createdByAdminId: currentUser.id },
                  { restaurantId: { $in: scope.restaurantIds } }
                ]
              }
            }
          ]
          : []),
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]);
    }
  );
};

export const getRecentActivity = async (limit = 10, currentUser = null) => {
  return traceDatabaseOperation('dashboardGetRecentActivity', async () => {
    const scope = await getDashboardScope(currentUser);
    return AuditLog.find(buildAuditScopeFilter(scope, currentUser))
      .populate('actorId', 'userName email role profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  });
};

export const getAuditLogAnalytics = async (days = 30, currentUser = null) => {
  return traceDatabaseOperation('dashboardGetAuditLogAnalytics', async () => {
    const scope = await getDashboardScope(currentUser);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const actions = [
      'LOGIN',
      'LOGOUT',
      'CREATE',
      'UPDATE',
      'DELETE',
      'STATUS_CHANGE'
    ];

    const actionAnalytics = {};

    for (const action of actions) {
      const data = await AuditLog.aggregate([
        {
          $match: buildAuditScopeFilter(scope, currentUser, {
            action: action,
            createdAt: { $gte: startDate }
          })
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } }
      ]);
      actionAnalytics[action] = data;
    }

    const entityAnalytics = await AuditLog.aggregate([
      {
        $match: buildAuditScopeFilter(scope, currentUser, {
          createdAt: { $gte: startDate }
        })
      },
      {
        $group: {
          _id: '$entityType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const actorRoleAnalytics = await AuditLog.aggregate([
      {
        $match: buildAuditScopeFilter(scope, currentUser, {
          createdAt: { $gte: startDate }
        })
      },
      {
        $group: {
          _id: '$actorRole',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      allDates.push(date.toISOString().split('T')[0]);
    }

    const dateMaps = {};
    for (const action of actions) {
      dateMaps[action] = new Map(
        actionAnalytics[action]?.map((d) => [d.date, d.count]) || []
      );
    }

    const timelineData = allDates.map((date) => {
      const entry = { date };
      for (const action of actions) {
        entry[action] = dateMaps[action].get(date) || 0;
      }
      return entry;
    });

    return {
      timeline: timelineData,
      byAction: actions.map((action) => ({
        action,
        count:
          actionAnalytics[action]?.reduce((sum, d) => sum + d.count, 0) || 0
      })),
      byEntity: entityAnalytics.map((e) => ({
        entity: e._id,
        count: e.count
      })),
      byRole: actorRoleAnalytics.map((r) => ({
        role: r._id,
        count: r.count
      }))
    };
  });
};

export const getRealtimeStats = async (currentUser = null) => {
  return traceDatabaseOperation('dashboardGetRealtimeStats', async () => {
    const scope = await getDashboardScope(currentUser);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats, activeNow, hourlyVisitors] = await Promise.all([
      Promise.all([
        User.countDocuments(
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: today },
              $or: [
                { createdByAdminId: currentUser.id },
                { restaurantId: { $in: scope.restaurantIds } }
              ]
            }
            : { createdAt: { $gte: today } }
        ),
        AuditLog.countDocuments(
          buildAuditScopeFilter(scope, currentUser, {
            action: 'LOGIN',
            createdAt: { $gte: today }
          })
        ),
        Restaurant.countDocuments(
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: today },
              _id: { $in: scope.restaurantIds },
              adminId: currentUser.id
            }
            : { createdAt: { $gte: today } }
        ),
        Menu.countDocuments(
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: today },
              restaurantId: { $in: scope.restaurantIds }
            }
            : { createdAt: { $gte: today } }
        ),
        Category.countDocuments(
          currentUser?.role === 'admin'
            ? {
              createdAt: { $gte: today },
              restaurantId: { $in: scope.restaurantIds }
            }
            : { createdAt: { $gte: today } }
        )
      ]),
      AuditLog.aggregate([
        {
          $match: buildAuditScopeFilter(scope, currentUser, {
            createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
          })
        },
        { $group: { _id: '$actorId' } },
        { $count: 'activeUsers' }
      ]),
      AuditLog.aggregate([
        {
          $match: buildAuditScopeFilter(scope, currentUser, {
            action: { $in: ['LOGIN', 'REFRESH'] },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      today: {
        newUsers: todayStats[0],
        logins: todayStats[1],
        newRestaurants: todayStats[2],
        newMenus: todayStats[3],
        newCategories: todayStats[4]
      },
      activeNow: activeNow[0]?.activeUsers || 0,
      hourlyVisitors: hourlyVisitors
    };
  });
};

export const getDashboardSummary = async (currentUser = null) => {
  const [
    overview,
    userAnalytics,
    contentAnalytics,
    rolesDistribution,
    recentActivity,
    realtime,
    auditAnalytics
  ] = await Promise.all([
    getOverviewStats(currentUser),
    getUserAnalytics(7, currentUser),
    getContentAnalytics(7, currentUser),
    getUserRolesDistribution(currentUser),
    getRecentActivity(20, currentUser),
    getRealtimeStats(currentUser),
    getAuditLogAnalytics(14, currentUser)
  ]);

  return {
    overview,
    userAnalytics,
    contentAnalytics,
    rolesDistribution,
    recentActivity,
    realtime,
    auditAnalytics
  };
};

export default {
  getOverviewStats,
  getUserAnalytics,
  getContentAnalytics,
  getUserRolesDistribution,
  getRecentActivity,
  getRealtimeStats,
  getAuditLogAnalytics,
  getDashboardSummary
};
