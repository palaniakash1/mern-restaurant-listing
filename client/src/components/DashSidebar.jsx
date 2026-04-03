import { useMemo } from 'react';
import { Avatar, Badge, Sidebar } from 'flowbite-react';
import { HiX } from 'react-icons/hi';
import { HiArrowLeftOnRectangle } from 'react-icons/hi2';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/eatwisely.ico';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../utils/permissions';
import { getVisibleDashboardTabs } from '../constants/dashboardTabs';

export default function DashSidebar({ onClose }) {
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const tab = urlParams.get('tab') || 'dashboard';
  const visibleTabs = useMemo(
    () => getVisibleDashboardTabs(currentUser),
    [currentUser]
  );

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Sidebar className="h-full rounded-[2rem] border border-[#dfe7c9] shadow-[0_20px_70px_rgba(58,79,21,0.18)] [&>div]:h-full [&>div]:rounded-[2rem] [&>div]:bg-[linear-gradient(180deg,#23411f_0%,#3d601a_52%,#8fa31e_100%)] [&>div]:p-0">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Logo"
            className="h-11 w-11 rounded-2xl border border-white/15 bg-white/10 object-contain p-1.5"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              EatWisely
            </p>
            <p className="text-lg font-bold text-white">Operations</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="rounded-2xl border border-white/10 bg-white/10 p-2 text-2xl text-white hover:!bg-white/15 lg:hidden"
        >
          <HiX />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-white shadow-inner backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar
            rounded
            img={currentUser?.profilePicture}
            placeholderInitials={(currentUser?.userName || 'U').slice(0, 2).toUpperCase()}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {currentUser?.userName || 'User'}
            </p>
            <p className="truncate text-xs text-white/70">{currentUser?.email}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Badge color="failure" className="border-0">
            {getRoleLabel(currentUser?.role)}
          </Badge>
          {currentUser?.customPermissions && (
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/65">
              Custom scope
            </span>
          )}
        </div>
      </div>

      <Sidebar.Items className="mt-4 px-3 pb-4">
        <Sidebar.ItemGroup className="flex flex-col gap-1">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <Sidebar.Item
                key={item.id}
                as={Link}
                to={`/dashboard?tab=${item.id}`}
                active={tab === item.id}
                icon={() => <Icon className="text-xl" />}
                className={`w-full rounded-[1.1rem] border transition-all ${
                  tab === item.id
                    ? '!border-[#f0f5dd] !bg-white !text-[#1e3316] shadow-md'
                    : '!border-transparent !bg-transparent !text-white/90 hover:!bg-white/10 hover:!text-white'
                }`}
              >
                {item.label}
              </Sidebar.Item>
            );
          })}

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[#ffffff12] p-4 text-white/80">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">
              Access scope
            </p>
            <p className="mt-2 text-sm leading-6">
              {currentUser?.role === 'superAdmin' &&
                'Full platform control across users, restaurants, menus, categories, and review moderation.'}
              {currentUser?.role === 'admin' &&
                'Restaurant-scoped management for stores, menus, categories, reviews, and assigned store managers.'}
              {currentUser?.role === 'storeManager' &&
                'Operational menu management with item updates, availability changes, and read access to restaurant feedback.'}
              {currentUser?.role === 'user' &&
                'Personal profile and review workspace for posting, editing, and deleting your own reviews.'}
            </p>
          </div>

          <div className="border-t border-white/10 pt-3">
            <Sidebar.Item
              icon={() => <HiArrowLeftOnRectangle className="text-xl" />}
              className="group w-full rounded-[1.1rem] border border-transparent !bg-transparent !text-white/90 hover:!bg-[#b62828] hover:!text-white"
              onClick={handleSignOut}
            >
              Sign out
            </Sidebar.Item>
          </div>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
