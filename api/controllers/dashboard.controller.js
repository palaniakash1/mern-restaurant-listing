import {
  getDashboardSummary,
  getOverviewStats,
  getUserAnalytics,
  getContentAnalytics,
  getUserRolesDistribution,
  getRecentActivity,
  getRealtimeStats
} from '../repositories/dashboard.repository.js';

export const getOverview = async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.user);
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const [overview, userAnalytics, contentAnalytics] = await Promise.all([
      getOverviewStats(req.user),
      getUserAnalytics(parseInt(days), req.user),
      getContentAnalytics(parseInt(days), req.user)
    ]);

    res.json({
      success: true,
      data: { overview, userAnalytics, contentAnalytics }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { type, days = 30 } = req.query;

    switch (type) {
    case 'users':
      return res.json({
        success: true,
        data: await getUserAnalytics(parseInt(days), req.user)
      });
    case 'content':
      return res.json({
        success: true,
        data: await getContentAnalytics(parseInt(days), req.user)
      });
    case 'roles':
      return res.json({
        success: true,
        data: await getUserRolesDistribution(req.user)
      });
    case 'activity':
      return res.json({
        success: true,
        data: await getRecentActivity(50, req.user)
      });
    default:
      return res.status(400).json({
        success: false,
        message:
          'Invalid analytics type. Use: users, content, roles, or activity'
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getRealtime = async (req, res) => {
  try {
    const stats = await getRealtimeStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Dashboard realtime error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getOverview,
  getStats,
  getAnalytics,
  getRealtime
};
