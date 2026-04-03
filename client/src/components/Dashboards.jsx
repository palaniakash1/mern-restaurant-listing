import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Spinner } from 'flowbite-react';
import {
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineTag,
  HiOutlineUserGroup
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/api';
import { getRoleLabel, hasPermission } from '../utils/permissions';

const pluralize = (value, label) =>
  `${value} ${label}${value === 1 ? '' : 's'}`;

export default function Dashboards() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user?.role === 'superAdmin') {
          const [users, restaurants, managers] = await Promise.all([
            apiGet('/api/users?page=1&limit=1'),
            apiGet('/api/restaurants/all?page=1&limit=1'),
            apiGet('/api/users/store-managers?page=1&limit=1')
          ]);

          if (!ignore) {
            setSummary({
              users: users.total || 0,
              restaurants: restaurants.total || restaurants.data?.length || 0,
              managers: managers.total || 0,
              menus: null
            });
          }
          return;
        }

        if (user?.role === 'admin') {
          const [restaurantSummary, managers, restaurants] = await Promise.all([
            apiGet('/api/restaurants/me/summary'),
            apiGet('/api/users/store-managers?page=1&limit=1'),
            apiGet('/api/restaurants/me/all?page=1&limit=1')
          ]);

          if (!ignore) {
            const payload = restaurantSummary.data || restaurantSummary;
            setSummary({
              users: null,
              restaurants: restaurants.total || restaurants.data?.length || 0,
              managers: managers.total || payload.storeManagerCount || 0,
              menus: payload.menuCount || 0,
              categories: payload.categoryCount || 0,
              rating: payload.averageRating || null
            });
          }
          return;
        }

        if (user?.role === 'storeManager' && user.restaurantId) {
          const menus = await apiGet(
            `/api/menu/restaurant/${user.restaurantId}?page=1&limit=50`
          );
          if (!ignore) {
            setSummary({
              restaurants: 1,
              menus: menus.total || menus.data?.length || 0
            });
          }
          return;
        }

        if (user?.role === 'user') {
          const reviews = await apiGet('/api/reviews/my?page=1&limit=1');
          if (!ignore) {
            setSummary({ reviews: reviews.total || 0 });
          }
          return;
        }

        if (!ignore) {
          setSummary({});
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [user?.restaurantId, user?.role]);

  const cards = useMemo(() => {
    const items = [];

    if (summary?.users !== null && summary?.users !== undefined) {
      items.push({
        label: 'Users',
        value: summary.users,
        icon: HiOutlineUserGroup,
        tone: 'bg-[#fff4f4] text-[#8e1d1d]'
      });
    }

    if (summary?.restaurants !== null && summary?.restaurants !== undefined) {
      items.push({
        label: 'Restaurants',
        value: summary.restaurants,
        icon: HiOutlineBuildingStorefront,
        tone: 'bg-[#f5faeb] text-[#4d6518]'
      });
    }

    if (summary?.categories !== null && summary?.categories !== undefined) {
      items.push({
        label: 'Categories',
        value: summary.categories,
        icon: HiOutlineTag,
        tone: 'bg-[#fbf6ea] text-[#6f5a12]'
      });
    }

    if (summary?.menus !== null && summary?.menus !== undefined) {
      items.push({
        label: 'Menus',
        value: summary.menus,
        icon: HiOutlineClipboardDocumentList,
        tone: 'bg-[#eef4ff] text-[#1f4f8c]'
      });
    }

    if (summary?.managers !== null && summary?.managers !== undefined) {
      items.push({
        label: 'Store Managers',
        value: summary.managers,
        icon: HiOutlineUserGroup,
        tone: 'bg-[#fff4f4] text-[#8e1d1d]'
      });
    }

    if (summary?.reviews !== null && summary?.reviews !== undefined) {
      items.push({
        label: 'Reviews',
        value: summary.reviews,
        icon: HiOutlineClipboardDocumentList,
        tone: 'bg-[#f5faeb] text-[#4d6518]'
      });
    }

    return items;
  }, [summary]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-[#dce6c1] bg-white shadow-[0_25px_80px_rgba(60,79,25,0.08)]">
        <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            <Badge color="failure" className="w-fit border-0">
              {getRoleLabel(user?.role)}
            </Badge>
            <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
              Role-aware operations dashboard
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              This control center follows the backend RBAC model, so each user
              only sees the modules and actions they are actually allowed to
              manage.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Active scope
            </p>
            <p className="mt-3 text-xl font-semibold">
              {user?.role === 'superAdmin' &&
                'Full platform oversight across privileged users, restaurants, categories, menus, and reviews.'}
              {user?.role === 'admin' &&
                'Scoped restaurant operations with store manager assignment and moderated business control.'}
              {user?.role === 'storeManager' &&
                'Menu-first operations for assigned stores, including item updates and availability management.'}
              {user?.role === 'user' &&
                'Customer-facing review workspace for posting and managing your own feedback.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="border border-[#dce6c1] bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 text-[#4d6518]">
                <Spinner size="sm" />
                Loading metrics...
              </div>
            </Card>
          ))}

        {!loading &&
          cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className="border border-[#dce6c1] bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#23411f]">
                      {card.value}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${card.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border border-[#dce6c1] bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-[#23411f]">
            What this dashboard covers
          </h3>
          <div className="mt-4 grid gap-3">
            {hasPermission(user, 'admin', 'createPrivilegedUser') && (
              <div className="rounded-2xl bg-[#fff5f5] p-4 text-sm text-[#6f1b1b]">
                Super Admin tools include privileged user creation,
                cross-restaurant governance, and ownership reassignment.
              </div>
            )}
            {hasPermission(user, 'restaurant', 'readAllMine') && (
              <div className="rounded-2xl bg-[#f5faeb] p-4 text-sm text-[#4d6518]">
                Restaurant management is scoped to the current operator, so
                admins only work with the stores they own.
              </div>
            )}
            {hasPermission(user, 'menu', 'addItem') && (
              <div className="rounded-2xl bg-[#eef4ff] p-4 text-sm text-[#1f4f8c]">
                Menu operations support menu creation, menu item changes, and
                availability toggles for authorized users.
              </div>
            )}
            {hasPermission(user, 'review', 'moderate') && (
              <div className="rounded-2xl bg-[#fbf6ea] p-4 text-sm text-[#6f5a12]">
                Review moderation lets admins and super admins approve or hide
                reviews inside their allowed scope.
              </div>
            )}
            {hasPermission(user, 'audit', 'read') && (
              <div className="rounded-2xl bg-[#f4f1ff] p-4 text-sm text-[#5b3fb0]">
                Audit monitoring exposes change history and activity trails
                within the exact scope allowed by your role.
              </div>
            )}
          </div>
        </Card>

        <Card className="border border-[#dce6c1] bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-[#23411f]">At a glance</h3>
          <div className="mt-4 space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl border border-[#ebf0d7] p-4">
              <p className="font-semibold text-[#23411f]">Signed in as</p>
              <p className="mt-1">
                {user?.email || 'No session email available'}
              </p>
            </div>
            {summary?.rating !== null && summary?.rating !== undefined && (
              <div className="rounded-2xl border border-[#ebf0d7] p-4">
                <p className="font-semibold text-[#23411f]">Average rating</p>
                <p className="mt-1">{summary.rating || 0}</p>
              </div>
            )}
            {summary?.menus !== null && summary?.menus !== undefined && (
              <div className="rounded-2xl border border-[#ebf0d7] p-4">
                <p className="font-semibold text-[#23411f]">Operational load</p>
                <p className="mt-1">{pluralize(summary.menus, 'menu')}</p>
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-[#fff5f5] p-4 text-[#8e1d1d]">
                {error}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
