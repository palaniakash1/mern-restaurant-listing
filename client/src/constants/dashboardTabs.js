import {
  HiOutlineBuildingStorefront,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
  HiOutlineStar,
  HiOutlineUserCircle,
  HiOutlineShieldCheck
} from 'react-icons/hi2';
import { hasAnyPermission, hasPermission } from '../utils/permissions';

export const DASHBOARD_TABS = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: HiOutlineSquares2X2,
    isVisible: () => true
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: HiOutlineUserCircle,
    isVisible: () => true
  },
  {
    id: 'users',
    label: 'Users',
    icon: HiOutlineUserGroup,
    isVisible: (user) =>
      hasAnyPermission(user, [
        ['admin', 'createPrivilegedUser'],
        ['user', 'listAll'],
        ['user', 'listStoreManagers'],
        ['user', 'createStoreManager']
      ])
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: HiOutlineBuildingStorefront,
    isVisible: (user) =>
      hasAnyPermission(user, [
        ['restaurant', 'create'],
        ['restaurant', 'listAll'],
        ['restaurant', 'readAllMine']
      ])
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: HiOutlineTag,
    isVisible: (user) =>
      hasAnyPermission(user, [
        ['category', 'readAll'],
        ['category', 'readMine'],
        ['category', 'create']
      ])
  },
  {
    id: 'menu',
    label: 'Menus',
    icon: HiOutlineClipboardDocumentList,
    isVisible: (user) =>
      hasAnyPermission(user, [
        ['menu', 'create'],
        ['menu', 'addItem'],
        ['menu', 'readById']
      ])
  },
  {
    id: 'reviews',
    label: 'Reviews',
    icon: HiOutlineStar,
    isVisible: (user) =>
      hasAnyPermission(user, [
        ['review', 'readMine'],
        ['review', 'readById'],
        ['review', 'moderate'],
        ['review', 'create']
      ]) || hasPermission(user, 'review', 'delete')
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    icon: HiOutlineShieldCheck,
    isVisible: (user) => hasPermission(user, 'audit', 'read')
  }
];

export const getVisibleDashboardTabs = (user) =>
  DASHBOARD_TABS.filter((tab) => tab.isVisible(user));
