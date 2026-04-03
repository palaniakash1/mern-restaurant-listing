import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiMenu, HiOutlineChevronLeft } from 'react-icons/hi';
import DashSidebar from '../components/DashSidebar';
import DashProfile from '../components/DashProfile';
import DashUsers from '../components/DashUsers';
import DashRestaurants from '../components/DashRestaurants';
import DashCategories from '../components/DashCategories';
import DashMenu from '../components/DashMenu';
import Dashboards from '../components/Dashboards';
import DashReviews from '../components/DashReviews';
import DashAuditLogs from '../components/DashAuditLogs';
import { useAuth } from '../context/AuthContext';
import { getVisibleDashboardTabs } from '../constants/dashboardTabs';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const visibleTabs = useMemo(() => getVisibleDashboardTabs(user), [user]);
  const tabFromUrl = new URLSearchParams(location.search).get('tab');
  const activeTab =
    visibleTabs.find((item) => item.id === tabFromUrl) || visibleTabs[0];
  const tab = activeTab?.id || 'dashboard';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-0 xl:px-5">
        <div className="hidden w-[310px] shrink-0 p-4 lg:block xl:p-5">
          <div className="sticky top-4">
            <DashSidebar />
          </div>
        </div>

        <div className="lg:hidden">
          {isSidebarOpen && (
            <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] p-3">
              <DashSidebar onClose={() => setIsSidebarOpen(false)} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3 pb-6 pt-3 sm:px-4 lg:px-0 lg:pr-5">
          <div className="sticky top-5 z-30 rounded-b-[1.75rem] border border-white/50 bg-white/80 px-4 py-4 shadow-[0_18px_60px_rgba(77,103,22,0.12)] backdrop-blur lg:mt-4 lg:rounded-[2rem]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    className="rounded-2xl border border-[#e6eccf] bg-white p-3 text-2xl text-[#23411f] shadow-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <HiMenu />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                      Control center
                    </p>
                    <h1 className="truncate text-xl font-bold text-[#23411f] sm:text-2xl">
                      {activeTab?.label || 'Dashboard'}
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#e6eccf] bg-white px-4 py-2 text-sm font-semibold text-[#4f5f1d] shadow-sm"
                >
                  <HiOutlineChevronLeft className="text-lg" />
                  Back
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {visibleTabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/dashboard?tab=${item.id}`)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab?.id === item.id
                        ? 'bg-[#8fa31e] text-white shadow-md'
                        : 'bg-[#f7faef] !text-[#4f5f1d] hover:!bg-[#eef5db]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 py-4">
            {tab === 'profile' && <DashProfile />}
            {tab === 'users' && <DashUsers />}
            {tab === 'restaurants' && <DashRestaurants />}
            {tab === 'categories' && <DashCategories />}
            {tab === 'menu' && <DashMenu />}
            {tab === 'reviews' && <DashReviews />}
            {tab === 'audit' && <DashAuditLogs />}
            {tab === 'dashboard' && <Dashboards />}
            {!activeTab && <Dashboards />}
          </div>
        </div>
      </div>
    </div>
  );
}
