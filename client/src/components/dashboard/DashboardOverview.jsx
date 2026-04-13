import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from 'flowbite-react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  HiArrowLeftOnRectangle,
  HiArrowPath,
  HiArrowRightOnRectangle,
  HiChartBar,
  HiMagnifyingGlass,
  HiMiniUsers,
  HiOutlineArrowsRightLeft,
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineTrash
} from 'react-icons/hi2';
import { FaUtensils } from 'react-icons/fa';
import dashboardApi from '../../services/dashboardApi';
import { SkeletonCard } from '../SkeletonCard';

const ROLE_COLORS = ['#576500', '#8fa31e', '#476640', '#b62828', '#c7c8b1'];
const ACTION_COLORS = {
  LOGIN: '#576500',
  LOGOUT: '#94a3b8',
  CREATE: '#8fa31e',
  UPDATE: '#476640',
  DELETE: '#b62828',
  STATUS_CHANGE: '#c58b2b'
};

const ACTION_ICONS = {
  LOGIN: HiArrowRightOnRectangle,
  LOGOUT: HiArrowLeftOnRectangle,
  CREATE: HiOutlinePlus,
  UPDATE: HiOutlinePencil,
  DELETE: HiOutlineTrash,
  REFRESH: HiArrowPath,
  STATUS_CHANGE: HiOutlineArrowsRightLeft
};

const numberFormat = new Intl.NumberFormat('en-GB');

const formatMetric = (value) => numberFormat.format(Number(value || 0));

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });

const sanitizeSearch = (value = '') => value.trim().toLowerCase();

const calculateTrend = (current, total) => {
  if (!current || !total) return 'Stable';
  const ratio = Math.round((current / total) * 100);
  return ratio > 0 ? `+${ratio}%` : 'Stable';
};

function MetricCard({ eyebrow, title, value, icon, bars }) {
  const Icon = icon;

  return (
    <Card className="border !border-[#dce6c1] bg-white shadow-sm">
      <div className="group relative overflow-hidden">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#b62828]">
          {eyebrow}
        </p>
        <p className="mt-2 text-sm text-gray-500">{title}</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="font-['Manrope'] text-4xl font-extrabold tracking-tight text-[#23411f]">
            {formatMetric(value)}
          </p>
          <div className="flex h-12 items-end gap-1">
            {bars.map((bar, index) => (
              <span
                key={`${title}-${index}`}
                className="w-2 rounded-t-full bg-[#dfe7cf] transition-colors duration-300 group-hover:bg-[#8fa31e]"
                style={{ height: `${bar}%` }}
              />
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 rounded-2xl bg-[#eff6e4] p-3 text-[#8fa31e]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function RealtimeCard({ label, value, note }) {
  return (
    <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
      <p className="text-sm font-medium text-white/75">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">
        {formatMetric(value)}
      </p>
      <p className="mt-2 text-xs font-semibold text-[#d8ef8f]">{note}</p>
    </div>
  );
}

function OverviewTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[#e4ebd9] bg-white/95 p-4 shadow-[0_24px_60px_rgba(35,65,31,0.08)] backdrop-blur">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7564]">
          {label}
        </p>
      ) : null}
      {payload.map((entry) => (
        <p
          key={`${entry.name}-${entry.value}`}
          className="mt-2 text-sm font-medium"
          style={{ color: entry.color || entry.fill }}
        >
          {entry.name}:{' '}
          <span className="font-bold">{formatMetric(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardOverview({ role = 'superAdmin' }) {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('monthly');

  const isDashboardAdmin = role === 'superAdmin' || role === 'admin';
  const isSuperAdmin = role === 'superAdmin';

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [overviewResponse, realtimeResponse] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getRealtime()
      ]);

      if (overviewResponse?.success) {
        setData(overviewResponse.data);
      }

      if (realtimeResponse?.success) {
        setRealtimeData(realtimeResponse.data);
      }
    } catch (loadError) {
      setError(loadError.message || 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      dashboardApi
        .getRealtime()
        .then((response) => {
          if (response?.success) {
            setRealtimeData(response.data);
          }
        })
        .catch(() => {});
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const filteredActivity = useMemo(() => {
    const entries = data?.recentActivity || [];
    const query = sanitizeSearch(search);

    if (!query) return entries.slice(0, 6);

    return entries
      .filter((entry) => {
        const actor = entry.actorId?.userName || 'system';
        const entity = entry.entityType || '';
        const action = entry.action || '';
        return [actor, entity, action].some((value) =>
          String(value).toLowerCase().includes(query)
        );
      })
      .slice(0, 6);
  }, [data?.recentActivity, search]);

  const auditTimeline = useMemo(() => {
    const timeline = data?.auditAnalytics?.timeline || [];
    const selectedTimeline =
      timeframe === 'weekly' ? timeline.slice(-7) : timeline;

    return selectedTimeline.map((entry) => ({
      label: formatDate(entry.date),
      value:
        (entry.LOGIN || 0) +
        (entry.CREATE || 0) +
        (entry.UPDATE || 0) +
        (entry.STATUS_CHANGE || 0) +
        (entry.DELETE || 0) +
        (entry.LOGOUT || 0)
    }));
  }, [data?.auditAnalytics?.timeline, timeframe]);

  const actionDistribution = useMemo(() => {
    return (data?.auditAnalytics?.byAction || [])
      .filter((item) => item.count > 0)
      .map((item) => ({
        ...item,
        color: ACTION_COLORS[item.action] || '#576500'
      }));
  }, [data?.auditAnalytics?.byAction]);

  const totalActions = useMemo(
    () => actionDistribution.reduce((sum, item) => sum + item.count, 0),
    [actionDistribution]
  );

  const heroStats = useMemo(() => {
    const today = realtimeData?.today || {};
    const overview = data?.overview || {};

    return [
      {
        label: 'Active Now',
        value: realtimeData?.activeNow || 0,
        note: calculateTrend(realtimeData?.activeNow, overview.users?.active)
      },
      {
        label: isSuperAdmin ? 'New Users' : 'New Staff',
        value: today.newUsers || 0,
        note: calculateTrend(today.newUsers, overview.users?.total)
      },
      {
        label: 'Logins',
        value: today.logins || 0,
        note: today.logins > 0 ? 'Healthy flow' : 'Stable'
      },
      {
        label: 'New Restaurants',
        value: today.newRestaurants || 0,
        note: today.newRestaurants > 0 ? `+${today.newRestaurants}` : 'Stable'
      },
      {
        label: 'New Menus',
        value: today.newMenus || 0,
        note: today.newMenus > 0 ? `+${today.newMenus}` : 'Stable'
      }
    ];
  }, [data?.overview, isSuperAdmin, realtimeData]);

  const metricCards = useMemo(() => {
    const overview = data?.overview;
    if (!overview) return [];

    return [
      {
        eyebrow: isSuperAdmin ? 'User Growth' : 'Team Scope',
        title: isSuperAdmin ? 'Total Users' : 'Scoped Staff',
        value: overview.users?.total || 0,
        icon: HiMiniUsers,
        bars: [35, 50, 58, 78, 100]
      },
      {
        eyebrow: isSuperAdmin ? 'Venue Database' : 'Restaurant Scope',
        title: 'Restaurants',
        value: overview.restaurants?.total || 0,
        icon: HiOutlineBuildingStorefront,
        bars: [20, 40, 68, 52, 74]
      },
      {
        eyebrow: 'Classification',
        title: 'Categories',
        value: overview.categories?.total || 0,
        icon: HiOutlineSquares2X2,
        bars: [48, 34, 60, 58, 56]
      },
      {
        eyebrow: 'Catalog Size',
        title: 'Menu Items',
        value: overview.menus?.totalItems || 0,
        icon: FaUtensils,
        bars: [72, 86, 63, 92, 98]
      }
    ];
  }, [data?.overview, isSuperAdmin]);

  const roleDistribution = useMemo(() => {
    return (data?.rolesDistribution || []).map((item, index) => ({
      ...item,
      label: item._id?.charAt(0)?.toUpperCase() + item._id?.slice(1),
      color: ROLE_COLORS[index % ROLE_COLORS.length]
    }));
  }, [data?.rolesDistribution]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-[#edf4dc] animate-pulse" />
              <div className="h-8 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-[#edf4dc] animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-[#edf4dc] animate-pulse" />
              </div>
            </div>
            <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
              <div className="h-3 w-24 rounded bg-white/20 animate-pulse" />
              <div className="mt-3 h-8 w-40 rounded bg-white/20 animate-pulse" />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard variant="metric" />
          <SkeletonCard variant="metric" />
          <SkeletonCard variant="metric" />
          <SkeletonCard variant="metric" />
        </div>

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="h-64 rounded-xl bg-[#edf4dc] animate-pulse" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert color="failure">{error}</Alert>}

      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
              Dashboard command center
            </p>
            <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
              {isSuperAdmin
                ? 'Platform-wide operational overview'
                : 'Bound restaurant performance overview'}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-gray-600">
              {isSuperAdmin
                ? 'This overview reflects the entire application across users, restaurants, menus, categories, reviews, and audit activity.'
                : 'This overview is limited to your assigned restaurants and the managers, menus, categories, reviews, and activity inside that scope.'}
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
                  Active scope
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {isSuperAdmin
                    ? 'Full platform dataset'
                    : 'Admin-bound dataset'}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {isSuperAdmin
                    ? 'Every record across the web app is included in these metrics.'
                    : 'Only your bound restaurants and related records are included.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="border-0 bg-white !text-[#23411f] hover:!bg-[#f3f7e6]"
                  onClick={() => loadDashboard({ silent: true })}
                >
                  <HiArrowPath
                    className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard?tab=profile')}
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/15 text-sm font-bold text-white"
                >
                  {currentUser?.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt={currentUser.userName || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (currentUser?.userName || 'A').charAt(0).toUpperCase()
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/75">
              Operational pulse
            </p>
            <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
              Real-time at a glance
            </h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d7ee64]" />
            Live System Status: Optimal
          </div>
        </div>

        <div className="mt-6 grid grid-cols-5 gap-4">
          {heroStats.map((item) => (
            <RealtimeCard
              key={item.label}
              label={item.label}
              value={item.value}
              note={item.note}
            />
          ))}
        </div>
      </section>

      {isDashboardAdmin && metricCards.length > 0 && (
        <section className="grid grid-cols-4 gap-5">
          {metricCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </section>
      )}

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)]">
        <Card className="min-w-0 border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                Audit intelligence
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#23411f] sm:text-2xl">
                Audit Log Activity
              </h3>
            </div>
            <div className="inline-flex rounded-full bg-[#eff6e4] !p-1">
              {['weekly', 'monthly'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTimeframe(value)}
                  className={`rounded-full !px-4 !py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    timeframe === value
                      ? '!bg-[#23411f] !text-white shadow-md'
                      : '!text-[#6d7564] hover:!text-[#23411f]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 h-[20rem] min-w-0">
            {auditTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={auditTimeline}
                  margin={{ top: 10, right: 0, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="audit-area-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#576500"
                        stopOpacity={0.18}
                      />
                      <stop offset="95%" stopColor="#576500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<OverviewTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Activity"
                    stroke="#576500"
                    strokeWidth={3}
                    fill="url(#audit-area-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-[#f7faef] text-sm text-[#6d7564]">
                No audit activity available yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="min-w-0 border !border-[#dce6c1] bg-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
            Activity mix
          </p>
          <h3 className="mt-2 text-xl font-bold text-[#23411f] sm:text-2xl">
            Actions Distribution
          </h3>

          <div className="mt-6 h-64 min-w-0">
            {actionDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionDistribution}
                    dataKey="count"
                    nameKey="action"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {actionDistribution.map((item) => (
                      <Cell key={item.action} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<OverviewTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-[#f7faef] text-sm text-[#6d7564]">
                No distribution data available yet.
              </div>
            )}
          </div>

          <div className="flex justify-center" style={{ marginTop: '-12rem' }}>
            <div className="rounded-full bg-white px-8 py-6 text-center shadow-[0_20px_45px_rgba(35,65,31,0.08)]">
              <p className="font-['Manrope'] text-4xl font-extrabold tracking-tight text-[#171d13]">
                {totalActions > 999
                  ? `${(totalActions / 1000).toFixed(1)}k`
                  : formatMetric(totalActions)}
              </p>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6d7564]">
                Total
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {actionDistribution.map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#4d5643]">
                    {item.action.replace('_', ' ')}
                  </span>
                </div>
                <span className="font-bold text-[#171d13]">
                  {totalActions
                    ? `${Math.round((item.count / totalActions) * 100)}%`
                    : '0%'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="min-w-0 rounded-lg border border-[#dce6c1] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                  Operational feed
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#23411f] sm:text-2xl">
                  Recent Activity
                </h3>
              </div>
              <label className="relative hidden lg:block">
                <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7564]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                  className="w-32 rounded-full border !border-[#dde4d1] bg-white pl-9 pr-3 py-1.5 text-sm text-[#171d13] outline-none focus:border-[#576500]"
                />
              </label>
            </div>
            <span className="rounded-full bg-[#eff6e4] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#576500]">
              {filteredActivity.length} visible
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {filteredActivity.length > 0 ? (
              filteredActivity.map((activity, index) => (
                <div
                  key={activity._id || `${activity.action}-${index}`}
                  className="rounded-[1.5rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-white"
                      style={{
                        backgroundColor:
                          ACTION_COLORS[activity.action] || '#576500'
                      }}
                    >
                      {(() => {
                        const Icon = ACTION_ICONS[activity.action] || HiChartBar;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#171d13]">
                        <span className="font-semibold">
                          {activity.actorId?.userName || 'System'}
                        </span>{' '}
                        performed{' '}
                        <span className="font-semibold text-[#576500]">
                          {activity.action}
                        </span>{' '}
                        on{' '}
                        <span className="capitalize text-[#6d7564]">
                          {activity.entityType || 'system'}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-[#8f9586]">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-6 text-sm text-[#6d7564]">
                No activity matches the current search.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {isDashboardAdmin && (
            <Card className="min-w-0 border !border-[#dce6c1] bg-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                Team makeup
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#23411f] sm:text-2xl">
                User Roles
              </h3>

              <div className="mt-6 space-y-3">
                {roleDistribution.length > 0 ? (
                  roleDistribution.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between rounded-[1.5rem] border !border-[#ebf0d7] bg-[#fbfcf7] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium capitalize text-[#4d5643]">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-['Manrope'] text-xl font-extrabold text-[#171d13]">
                        {formatMetric(item.count)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-5 text-sm text-[#6d7564]">
                    No role distribution data available.
                  </div>
                )}
              </div>
            </Card>
          )}

          {isDashboardAdmin && data?.overview && (
            <Card className="min-w-0 border !border-[#dce6c1] bg-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                Snapshot
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#23411f] sm:text-2xl">
                Quick Stats
              </h3>

              <div className="mt-6 space-y-3">
                {[
                  {
                    label: isSuperAdmin
                      ? 'Active Users'
                      : 'Active Scoped Staff',
                    value: data.overview.users?.active || 0,
                    color: '#576500'
                  },
                  {
                    label: 'Published Restaurants',
                    value: data.overview.restaurants?.published || 0,
                    color: '#8fa31e'
                  },
                  {
                    label: 'Draft Restaurants',
                    value: data.overview.restaurants?.draft || 0,
                    color: '#c58b2b'
                  },
                  {
                    label: 'Blocked Restaurants',
                    value: data.overview.restaurants?.blocked || 0,
                    color: '#b62828'
                  },
                  {
                    label: 'Audit Logs',
                    value: data.overview.auditLogs?.total || 0,
                    color: '#476640'
                  },
                  {
                    label: 'Reviews',
                    value: data.overview.reviews?.total || 0,
                    color: '#6d7564'
                  }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[1.5rem] border !border-[#ebf0d7] bg-[#fbfcf7] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-[#4d5643]">
                      {item.label}
                    </span>
                    <span
                      className="font-['Manrope'] text-xl font-extrabold"
                      style={{ color: item.color }}
                    >
                      {formatMetric(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
