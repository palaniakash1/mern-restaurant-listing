import axios from 'axios';

const API_BASE = '/api';

export const dashboardApi = {
  getOverview: async () => {
    const res = await axios.get(`${API_BASE}/dashboard/overview`);
    return res.data;
  },

  getStats: async (days = 30) => {
    const res = await axios.get(`${API_BASE}/dashboard/stats?days=${days}`);
    return res.data;
  },

  getAnalytics: async (type, days = 30) => {
    const res = await axios.get(
      `${API_BASE}/dashboard/analytics?type=${type}&days=${days}`
    );
    return res.data;
  },

  getRealtime: async () => {
    const res = await axios.get(`${API_BASE}/dashboard/realtime`);
    return res.data;
  }
};

export default dashboardApi;
