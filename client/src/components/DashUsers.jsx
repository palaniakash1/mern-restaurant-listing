import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TextInput,
  ToggleSwitch
} from 'flowbite-react';
import {
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
  buildPermissionPayload,
  buildPermissionStateForRole,
  PERMISSION_GROUPS
} from '../constants/permissionTemplates';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import ImageFrameLoader from './ImageFrameLoader';
import PasswordInput from './PasswordInput';

const DEFAULT_PRIVILEGED_ROLE = 'admin';
const USER_LIMIT = 10;

const buildSuperAdminForm = () => ({
  userName: '',
  email: '',
  password: '',
  role: DEFAULT_PRIVILEGED_ROLE,
  isActive: true,
  profilePicture: ''
});

const buildStoreManagerForm = () => ({
  userName: '',
  email: '',
  password: ''
});

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const getUserId = (user) => user?._id || user?.id;
const getPermissionModeLabel = (user) =>
  user?.customPermissions ? 'Custom Access' : 'Role Template';

function UploadPreview({
  title,
  value,
  progress,
  uploading,
  onSelect,
  helperText,
  disabled = false
}) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#23411f]">{title}</p>
          {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
        </div>
        <Button
          color="light"
          size="xs"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose image
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />
      <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border !border-[#dce6c1] bg-[#f7faef]">
        {value ? (
          <img src={value} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Image preview will appear here
          </div>
        )}
        {uploading && (
          <ImageFrameLoader
            progress={progress}
            label="Uploading asset"
            className="rounded-[1.5rem]"
          />
        )}
      </div>
    </div>
  );
}

function PermissionEditor({ permissionState, onToggle, onReset, role }) {
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[#e4ebce] bg-[#fbfcf7] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#23411f]">Access design</p>
          <p className="text-xs text-gray-500">
            Tailor permissions within the selected `{role}` template.
          </p>
        </div>
        <Button color="light" size="xs" onClick={onReset}>
          Reset template
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <div
            key={group.id}
            className="rounded-[1.25rem] border border-[#ebf0d7] bg-white p-4"
          >
            <p className="text-sm font-semibold text-[#23411f]">{group.title}</p>
            <div className="mt-3 space-y-3">
              {group.permissions.map((permission) => (
                <div key={permission.key} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {permission.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {permission.description}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(permissionState[permission.key])}
                    label=""
                    onChange={() => onToggle(permission.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [superAdminForm, setSuperAdminForm] = useState(buildSuperAdminForm());
  const [storeManagerForm, setStoreManagerForm] = useState(buildStoreManagerForm());
  const [permissionState, setPermissionState] = useState(
    buildPermissionStateForRole(DEFAULT_PRIVILEGED_ROLE)
  );
  const [assignmentRestaurantId, setAssignmentRestaurantId] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  const canCreatePrivilegedUser = hasPermission(
    currentUser,
    'admin',
    'createPrivilegedUser'
  );
  const canListAllUsers = hasPermission(currentUser, 'user', 'listAll');
  const canListStoreManagers = hasPermission(currentUser, 'user', 'listStoreManagers');
  const canCreateStoreManager = hasPermission(
    currentUser,
    'user',
    'createStoreManager'
  );
  const canAssignStoreManager = hasPermission(
    currentUser,
    'user',
    'assignStoreManager'
  );
  const canUnassignStoreManager = hasPermission(
    currentUser,
    'user',
    'unassignStoreManager'
  );

  const listEndpoint = useMemo(() => {
    if (canListAllUsers) {
      return `/api/users?page=${page}&limit=${USER_LIMIT}&q=${encodeURIComponent(search)}`;
    }
    if (canListStoreManagers) {
      return `/api/users/store-managers?page=${page}&limit=${USER_LIMIT}`;
    }
    return null;
  }, [canListAllUsers, canListStoreManagers, page, search]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const roleMatch = roleFilter === 'all' ? true : user.role === roleFilter;
      const statusMatch =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? user.isActive
            : !user.isActive;
      return roleMatch && statusMatch;
    });
  }, [roleFilter, statusFilter, users]);

  const visibleAdmins = users.filter((user) => user.role === 'admin').length;
  const visibleManagers = users.filter((user) => user.role === 'storeManager').length;
  const customAccessCount = users.filter((user) => Boolean(user.customPermissions)).length;
  const roleCounts = {
    all: users.length,
    admin: visibleAdmins,
    storeManager: visibleManagers,
    inactive: users.filter((user) => !user.isActive).length
  };
  const activeForm = canCreatePrivilegedUser ? superAdminForm : storeManagerForm;

  const fetchRestaurants = useCallback(async () => {
    if (currentUser?.role === 'superAdmin') {
      const data = await apiGet('/api/restaurants/all?page=1&limit=100');
      return data.data || [];
    }
    if (currentUser?.role === 'admin') {
      const data = await apiGet('/api/restaurants/me/all?page=1&limit=100');
      return data.data || [];
    }
    return [];
  }, [currentUser?.role]);

  const fetchUsers = useCallback(async () => {
    if (!listEndpoint) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [userData, restaurantData] = await Promise.all([
        apiGet(listEndpoint),
        fetchRestaurants()
      ]);
      setUsers(userData.data || []);
      setTotalPages(Math.max(1, userData.totalPages || 1));
      setTotalUsers(userData.total || 0);
      setRestaurants(restaurantData);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchRestaurants, listEndpoint]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetModalState = () => {
    setModalMode(null);
    setSelectedUser(null);
    setSuperAdminForm(buildSuperAdminForm());
    setStoreManagerForm(buildStoreManagerForm());
    setPermissionState(buildPermissionStateForRole(DEFAULT_PRIVILEGED_ROLE));
    setAssignmentRestaurantId('');
    setImagePreviewUrl('');
    setImageUploading(false);
    setImageUploadProgress(0);
  };

  const handleRoleChange = (role) => {
    setSuperAdminForm((current) => ({ ...current, role }));
    setPermissionState(buildPermissionStateForRole(role));
  };

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    setImagePreviewUrl(URL.createObjectURL(file));
    setImageUploading(true);
    setImageUploadProgress(8);
    setError(null);

    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'users/profiles',
        resourceType: 'image',
        publicIdPrefix: 'admin-profile',
        onProgress: (progress) => setImageUploadProgress(progress)
      });
      setImageUploadProgress(100);
      setImagePreviewUrl(uploaded.url);
      setSuperAdminForm((current) => ({
        ...current,
        profilePicture: uploaded.url
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setImageUploading(false);
    }
  };

  const openCreateModal = () => {
    resetModalState();
    setModalMode('create');
  };

  const openEditModal = (user) => {
    resetModalState();
    setSelectedUser(user);
    setModalMode('edit');
    setSuperAdminForm({
      userName: user.userName || '',
      email: user.email || '',
      password: '',
      role: user.role || DEFAULT_PRIVILEGED_ROLE,
      isActive: user.isActive !== false,
      profilePicture: user.profilePicture || ''
    });
    const nextState = buildPermissionStateForRole(user.role);
    Object.entries(user.customPermissions || {}).forEach(([resource, actions]) => {
      (actions || []).forEach((action) => {
        nextState[`${resource}.${action}`] = true;
      });
    });
    setPermissionState(nextState);
    setImagePreviewUrl(user.profilePicture || '');
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setAssignmentRestaurantId(user.restaurantId || currentUser?.restaurantId || '');
    setModalMode('assign');
  };

  const handleCreateOrUpdateUser = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (canCreatePrivilegedUser) {
        const templatePayload = buildPermissionPayload(
          buildPermissionStateForRole(superAdminForm.role)
        );
        const customPayload = buildPermissionPayload(permissionState);
        const payload = {
          userName: superAdminForm.userName,
          email: superAdminForm.email,
          password: superAdminForm.password,
          role: superAdminForm.role,
          isActive: superAdminForm.isActive,
            permissions: areEqual(templatePayload, customPayload) ? {} : customPayload
          };

        if (modalMode === 'create') {
          const result = await apiPost('/api/admin/users', payload);
          const createdId = result.user?.id;
          if (superAdminForm.profilePicture && createdId) {
            await apiPatch(`/api/admin/users/${createdId}`, {
              profilePicture: superAdminForm.profilePicture
            });
          }
          setSuccess('Privileged user created successfully.');
        } else if (selectedUser) {
          await apiPatch(`/api/admin/users/${getUserId(selectedUser)}`, {
            userName: superAdminForm.userName,
            email: superAdminForm.email,
            password: superAdminForm.password || undefined,
            role: superAdminForm.role,
            isActive: superAdminForm.isActive,
            profilePicture: superAdminForm.profilePicture || undefined,
            permissions: areEqual(templatePayload, customPayload) ? {} : customPayload
          });
          setSuccess('User updated successfully.');
        }
      } else if (canCreateStoreManager && modalMode === 'create') {
        await apiPost('/api/users', storeManagerForm);
        setSuccess('Store manager created successfully.');
      }

      resetModalState();
      await fetchUsers();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/users/${getUserId(user)}`);
      setSuccess('User deleted successfully.');
      setPendingDeleteUser(null);
      await fetchUsers();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const roleBadgeClasses = (role) => {
    switch (role) {
      case 'superAdmin':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 !text-blue-700';
      case 'storeManager':
        return 'bg-yellow-700 text-white';
      default:
        return '!bg-slate-100 !text-slate-700';
    }
  };

  const handleAssignRestaurant = async () => {
    if (!selectedUser || !assignmentRestaurantId) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/users/${getUserId(selectedUser)}/restaurant`, {
        restaurantId: assignmentRestaurantId
      });
      setSuccess('Store manager assignment updated.');
      resetModalState();
      await fetchUsers();
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignRestaurant = async (user) => {
    const confirmed = window.confirm(`Unassign ${user.userName} from this restaurant?`);
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/users/${getUserId(user)}/restaurant`);
      setSuccess('Store manager unassigned successfully.');
      await fetchUsers();
    } catch (unassignError) {
      setError(unassignError.message);
    }
  };

  if (!listEndpoint) {
    return (
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <p className="text-sm text-gray-600">
          Your current role does not have access to the user operations workspace.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {error && <Alert color="failure">{error}</Alert>}
        {success && <Alert color="success">{success}</Alert>}

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                User command center
              </p>
              <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
                {canCreatePrivilegedUser
                  ? 'Privileged user administration'
                  : 'Store manager operations'}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-gray-600">
                {canCreatePrivilegedUser
                  ? 'Enterprise-grade control for privileged roles, custom access templates, and staff lifecycle management.'
                  : 'Create store managers, review assignments, and control restaurant binding from one workspace.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
                Active dataset
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total</p>
                  <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Custom access
                  </p>
                  <p className="mt-2 text-3xl font-bold">{customAccessCount}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Visible users</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">{users.length}</p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Admins</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">{visibleAdmins}</p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Store managers</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">{visibleManagers}</p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Restaurants in scope</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">{restaurants.length}</p>
          </Card>
        </div>

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">User table</h3>
              <p className="text-sm text-gray-500">
                {canCreatePrivilegedUser
                  ? 'Create, edit, and remove privileged users with enterprise-style access controls.'
                  : 'Manage the store managers created inside your admin scope.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]">
                <option value="all">All roles</option>
                <option value="admin">Admins</option>
                <option value="storeManager">Store managers</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              {canListAllUsers && (
                <TextInput
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search users"
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              )}
              {(canCreatePrivilegedUser || canCreateStoreManager) && (
                <Button
                  className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                  onClick={openCreateModal}
                >
                  <HiOutlinePlus className="mr-2 h-4 w-4" />
                  Add user
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`${roleFilter === 'all' ? 'text-[#23411f] font-semibold' : 'text-[#2563eb]'} `}
            >
              All ({roleCounts.all})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`${roleFilter === 'admin' ? 'text-[#23411f] font-semibold' : 'text-[#2563eb]'} `}
            >
              Admin ({roleCounts.admin})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setRoleFilter('storeManager')}
              className={`${roleFilter === 'storeManager' ? 'text-[#23411f] font-semibold' : 'text-[#2563eb]'} `}
            >
              Store Manager ({roleCounts.storeManager})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`${statusFilter === 'inactive' ? 'text-[#23411f] font-semibold' : 'text-[#2563eb]'} `}
            >
              Inactive ({roleCounts.inactive})
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading users...
            </div>
          )}

          <div className="mt-5 hidden overflow-x-auto md:block">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>User</Table.HeadCell>
                <Table.HeadCell>Role</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell>Access mode</Table.HeadCell>
                <Table.HeadCell>Restaurant</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {filteredUsers.map((user) => (
                  <Table.Row key={getUserId(user)}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <img
                          src={user.profilePicture}
                          alt={user.userName}
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                        <div>
                          <p className="font-semibold text-[#23411f]">{user.userName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge className={`border-0 ${roleBadgeClasses(user.role)}`}>
                        {user.role}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={user.isActive ? 'success' : 'failure'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{getPermissionModeLabel(user)}</Table.Cell>
                    <Table.Cell className="text-sm text-gray-600">
                      {restaurants.find(
                        (restaurant) =>
                          restaurant._id === user.restaurantId ||
                          restaurant._id === user.restaurantId?._id
                      )?.name ||
                        user.restaurantId?.name ||
                        user.restaurantId ||
                        'Unassigned'}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-2">
                        {canCreatePrivilegedUser && ['admin', 'storeManager'].includes(user.role) && (
                          <Button size="xs" className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]" onClick={() => openEditModal(user)}>
                            <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {canAssignStoreManager && user.role === 'storeManager' && (
                          <Button size="xs" className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]" onClick={() => openAssignModal(user)}>
                            Manage
                          </Button>
                        )}
                        {canUnassignStoreManager &&
                          user.role === 'storeManager' &&
                          user.restaurantId && (
                            <Button
                              color="failure"
                              size="xs"
                              onClick={() => handleUnassignRestaurant(user)}
                            >
                              Unassign
                            </Button>
                          )}
                        {canCreatePrivilegedUser && (
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() => setPendingDeleteUser(user)}
                          >
                            <HiOutlineTrash className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <div
                key={getUserId(user)}
                className="rounded-[1.5rem] border border-[#e6eccf] bg-[#fbfcf7] p-4"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={user.profilePicture}
                    alt={user.userName}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#23411f]">{user.userName}</p>
                      <Badge className={`border-0 ${roleBadgeClasses(user.role)}`}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {getPermissionModeLabel(user)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                color="light"
                size="xs"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                color="light"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        show={modalMode === 'create' || modalMode === 'edit'}
        onClose={resetModalState}
        size="7xl"
      >
        <Modal.Header>
          {modalMode === 'edit' ? 'Update user workspace' : 'Create user workspace'}
        </Modal.Header>
        <Modal.Body>
          <form className="space-y-6" onSubmit={handleCreateOrUpdateUser}>
            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              {canCreatePrivilegedUser && (
                <UploadPreview
                  title="Profile image"
                  value={imagePreviewUrl || superAdminForm.profilePicture}
                  progress={imageUploadProgress}
                  uploading={imageUploading}
                  onSelect={handleImageUpload}
                  helperText="Upload a profile image for the privileged account."
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userName">Username</Label>
                  <TextInput
                    id="userName"
                    value={activeForm.userName}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setSuperAdminForm((current) => ({
                            ...current,
                            userName: event.target.value
                          }))
                        : setStoreManagerForm((current) => ({
                            ...current,
                            userName: event.target.value
                          }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <TextInput
                    id="email"
                    type="email"
                    value={activeForm.email}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setSuperAdminForm((current) => ({
                            ...current,
                            email: event.target.value
                          }))
                        : setStoreManagerForm((current) => ({
                            ...current,
                            email: event.target.value
                          }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {modalMode === 'edit' ? 'Password reset' : 'Temporary password'}
                  </Label>
                  <PasswordInput
                    id="password"
                    value={activeForm.password}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setSuperAdminForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        : setStoreManagerForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                    }
                    placeholder={
                      modalMode === 'edit'
                        ? 'Leave blank to keep current password'
                        : 'Minimum 8 chars, 1 capital, 1 number'
                    }
                    required={modalMode === 'create'}
                  />
                </div>

                {canCreatePrivilegedUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        id="role"
                        value={superAdminForm.role}
                        onChange={(event) => handleRoleChange(event.target.value)}
                        className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                      >
                        <option value="admin">Admin</option>
                        <option value="storeManager">Store Manager</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="rounded-[1rem] border border-[#e4ebce] bg-[#fbfcf7] px-4 py-3">
                        <ToggleSwitch
                          checked={superAdminForm.isActive}
                          label={superAdminForm.isActive ? 'Active account' : 'Inactive account'}
                          onChange={(checked) =>
                            setSuperAdminForm((current) => ({
                              ...current,
                              isActive: checked
                            }))
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {canCreatePrivilegedUser ? (
              <PermissionEditor
                permissionState={permissionState}
                role={superAdminForm.role}
                onToggle={(permissionKey) =>
                  setPermissionState((current) => ({
                    ...current,
                    [permissionKey]: !current[permissionKey]
                  }))
                }
                onReset={() =>
                  setPermissionState(buildPermissionStateForRole(superAdminForm.role))
                }
              />
            ) : (
              <div className="rounded-[1.5rem] border border-[#e4ebce] bg-[#fbfcf7] p-4 text-sm text-gray-600">
                The current backend contract lets admins create store managers, and then
                assign or unassign them from restaurants. Profile image creation for
                admin-created store managers is not supported by the current API yet, so
                this modal stays aligned with the live endpoint behavior.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button color="gray" onClick={resetModalState}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#8fa31e] hover:bg-[#78871c]"
                isProcessing={submitting}
                disabled={imageUploading}
              >
                {modalMode === 'edit' ? 'Save changes' : 'Create user'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal show={modalMode === 'assign'} onClose={resetModalState}>
        <Modal.Header>Assign restaurant</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#23411f]">
                {selectedUser?.userName}
              </p>
              <p className="text-xs text-gray-500">
                Select the restaurant this store manager should operate.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentRestaurant">Restaurant</Label>
              <Select
                id="assignmentRestaurant"
                value={assignmentRestaurantId}
                onChange={(event) => setAssignmentRestaurantId(event.target.value)}
                className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
              >
                <option value="">Select restaurant</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="bg-[#8fa31e] hover:bg-[#78871c]"
            onClick={handleAssignRestaurant}
            isProcessing={submitting}
            disabled={!assignmentRestaurantId}
          >
            Save assignment
          </Button>
          <Button color="gray" onClick={resetModalState}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(pendingDeleteUser)} onClose={() => setPendingDeleteUser(null)}>
        <Modal.Header>Delete user</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete `{pendingDeleteUser?.userName}`? Clicking
            outside this modal will cancel the action.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="failure"
            onClick={() => pendingDeleteUser && handleDeleteUser(pendingDeleteUser)}
          >
            Confirm delete
          </Button>
          <Button color="gray" onClick={() => setPendingDeleteUser(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
