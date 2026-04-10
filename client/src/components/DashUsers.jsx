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
  HiOutlineArrowPath,
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

const USER_LIMIT = 10;
const DEFAULT_ROLE = 'admin';
const roleBadge = {
  superAdmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  storeManager: 'bg-yellow-700 text-white border-yellow-700',
  user: 'bg-slate-100 text-slate-700 border-slate-200'
};

const buildPrivilegedForm = () => ({
  userName: '',
  email: '',
  password: '',
  role: DEFAULT_ROLE,
  isActive: true,
  profilePicture: ''
});

const buildManagerForm = () => ({
  userName: '',
  email: '',
  password: ''
});

const getUserId = (user) => user?._id || user?.id;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function Metric({ label, value }) {
  return (
    <Card className="border !border-[#dce6c1] bg-white shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#23411f]">{value}</p>
    </Card>
  );
}

function UploadPreview({ value, progress, uploading, onSelect }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#23411f]">Profile image</p>
          <p className="text-xs text-gray-500">
            Upload a 1:1 image for the account.
          </p>
        </div>
        <Button
          className="!bg-[#8fa31e] hover:!bg-[#78871c] !text-white"
          size="xs"
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />
      <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border !border-[#dce6c1] bg-[#f7faef]">
        {value ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative h-full w-full cursor-pointer group"
          >
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover transition group-hover:opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <span className="text-sm font-medium text-white">Change Image</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full items-center justify-center text-sm text-gray-400 hover:text-gray-500"
          >
            Image preview will appear here
          </button>
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

function PermissionEditor({ state, onToggle, onReset, role }) {
  return (
    <div className="space-y-4 rounded-[1.5rem] border !border-[#e4ebce] bg-[#fbfcf7] p-4">
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
            className="rounded-[1.25rem] border !border-[#ebf0d7] bg-white p-4"
          >
            <p className="text-sm font-semibold text-[#23411f]">
              {group.title}
            </p>
            <div className="mt-3 space-y-3">
              {group.permissions.map((permission) => (
                <div
                  key={permission.key}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {permission.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {permission.description}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(state[permission.key])}
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
  const canCreatePrivilegedUser = hasPermission(
    currentUser,
    'admin',
    'createPrivilegedUser'
  );
  const canListAllUsers = hasPermission(currentUser, 'user', 'listAll');
  const canListStoreManagers = hasPermission(
    currentUser,
    'user',
    'listStoreManagers'
  );
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

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privilegedForm, setPrivilegedForm] = useState(buildPrivilegedForm());
  const [managerForm, setManagerForm] = useState(buildManagerForm());
  const [permissionState, setPermissionState] = useState(
    buildPermissionStateForRole(DEFAULT_ROLE)
  );
  const [assignmentRestaurantId, setAssignmentRestaurantId] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingUnassignUser, setPendingUnassignUser] = useState(null);

  const listEndpoint = useMemo(() => {
    if (canListAllUsers)
      return `/api/users?page=${page}&limit=${USER_LIMIT}&q=${encodeURIComponent(search)}`;
    if (canListStoreManagers)
      return `/api/users/store-managers?page=${page}&limit=${USER_LIMIT}`;
    return null;
  }, [canListAllUsers, canListStoreManagers, page, search]);

  const fetchRestaurants = useCallback(async () => {
    if (currentUser?.role === 'superAdmin')
      return (await apiGet('/api/restaurants/all?page=1&limit=100')).data || [];
    if (currentUser?.role === 'admin')
      return (
        (await apiGet('/api/restaurants/me/all?page=1&limit=100')).data || []
      );
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

  const restaurantLookup = useMemo(
    () => new Map(restaurants.map((r) => [r._id, r.name])),
    [restaurants]
  );
  const currentForm = canCreatePrivilegedUser ? privilegedForm : managerForm;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const restaurantName =
        restaurantLookup.get(user.restaurantId) ||
        restaurantLookup.get(user.restaurantId?._id) ||
        user.restaurantId?.name ||
        user.restaurantId ||
        '';
      const searchMatch = q
        ? [user.userName, user.email, user.role, restaurantName]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        : true;
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? user.isActive : !user.isActive);
      const accessMatch =
        accessFilter === 'all' ||
        (accessFilter === 'custom'
          ? Boolean(user.customPermissions)
          : !user.customPermissions);
      return searchMatch && roleMatch && statusMatch && accessMatch;
    });
  }, [accessFilter, restaurantLookup, roleFilter, search, statusFilter, users]);

  const counts = useMemo(
    () => ({
      all: totalUsers || users.length,
      admin: users.filter((user) => user.role === 'admin').length,
      storeManager: users.filter((user) => user.role === 'storeManager').length,
      inactive: users.filter((user) => !user.isActive).length,
      custom: users.filter((user) => Boolean(user.customPermissions)).length
    }),
    [totalUsers, users]
  );

  const resetModalState = () => {
    setModalMode(null);
    setSelectedUser(null);
    setPrivilegedForm(buildPrivilegedForm());
    setManagerForm(buildManagerForm());
    setPermissionState(buildPermissionStateForRole(DEFAULT_ROLE));
    setAssignmentRestaurantId('');
    setImagePreviewUrl('');
    setImageUploading(false);
    setImageUploadProgress(0);
  };

  const permissionsPayload = (role, state) => {
    const template = buildPermissionPayload(buildPermissionStateForRole(role));
    const custom = buildPermissionPayload(state);
    return same(template, custom) ? {} : custom;
  };

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageUploading(true);
    setImageUploadProgress(8);
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
      setPrivilegedForm((current) => ({
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
    setPrivilegedForm({
      userName: user.userName || '',
      email: user.email || '',
      password: '',
      role: user.role || DEFAULT_ROLE,
      isActive: user.isActive !== false,
      profilePicture: user.profilePicture || ''
    });
    const nextState = buildPermissionStateForRole(user.role);
    Object.entries(user.customPermissions || {}).forEach(
      ([resource, actions]) =>
        (actions || []).forEach((action) => {
          nextState[`${resource}.${action}`] = true;
        })
    );
    setPermissionState(nextState);
    setImagePreviewUrl(user.profilePicture || '');
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setAssignmentRestaurantId(
      user.restaurantId?._id || user.restaurantId || ''
    );
    setModalMode('assign');
  };

  const submitUser = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      if (canCreatePrivilegedUser) {
        const permissions = permissionsPayload(
          privilegedForm.role,
          permissionState
        );
        if (modalMode === 'create') {
          const result = await apiPost('/api/admin/users', {
            userName: privilegedForm.userName,
            email: privilegedForm.email,
            password: privilegedForm.password,
            role: privilegedForm.role,
            isActive: privilegedForm.isActive,
            permissions
          });
          const createdId = result.user?.id || result.data?._id;
          if (privilegedForm.profilePicture && createdId) {
            await apiPatch(`/api/admin/users/${createdId}`, {
              profilePicture: privilegedForm.profilePicture
            });
          }
          setSuccess('Privileged user created successfully.');
        } else if (selectedUser) {
          const payload = {
            userName: privilegedForm.userName,
            email: privilegedForm.email,
            role: privilegedForm.role,
            isActive: privilegedForm.isActive,
            permissions
          };
          if (privilegedForm.password.trim())
            payload.password = privilegedForm.password.trim();
          if (privilegedForm.profilePicture)
            payload.profilePicture = privilegedForm.profilePicture;
          await apiPatch(
            `/api/admin/users/${getUserId(selectedUser)}`,
            payload
          );
          setSuccess('User updated successfully.');
        }
      } else if (canCreateStoreManager && modalMode === 'create') {
        await apiPost('/api/users', managerForm);
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

  const deleteUser = async (user) => {
    try {
      await apiDelete(`/api/users/${getUserId(user)}`);
      setPendingDeleteUser(null);
      setSuccess('User deleted successfully.');
      await fetchUsers();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const assignRestaurant = async () => {
    try {
      setSubmitting(true);
      await apiPatch(`/api/users/${getUserId(selectedUser)}/restaurant`, {
        restaurantId: assignmentRestaurantId
      });
      resetModalState();
      setSuccess('Store manager assignment updated.');
      await fetchUsers();
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const unassignRestaurant = async (user) => {
    try {
      await apiDelete(`/api/users/${getUserId(user)}/restaurant`);
      setPendingUnassignUser(null);
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
          Your current role does not have access to the user operations
          workspace.
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
          <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
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
                  ? 'Enterprise-grade control for privileged roles, tailored permission sets, and cross-restaurant staff operations.'
                  : 'Create store managers, review assignments, and control restaurant binding from one clean workspace.'}
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
                    Active dataset
                  </p>
                  <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
                  <p className="mt-1 text-sm text-white/80">
                    {canCreatePrivilegedUser
                      ? 'Platform users across your current page scope'
                      : 'Store managers visible inside your admin scope'}
                  </p>
                </div>
                {(canCreatePrivilegedUser || canCreateStoreManager) && (
                  <Button
                    className="border-0 bg-white !text-[#23411f] hover:!bg-[#f3f7e6]"
                    onClick={openCreateModal}
                  >
                    <HiOutlinePlus className="mr-2 h-4 w-4" />
                    Add user
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Visible users" value={users.length} />
          <Metric label="Admins" value={counts.admin} />
          <Metric label="Store managers" value={counts.storeManager} />
          <Metric label="Custom access" value={counts.custom} />
        </div>

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">
                User table
              </h3>
              <p className="text-sm text-gray-500">
                Filter by role, status, and access model while keeping create
                and edit actions immediately visible.
              </p>
            </div>
            {(canCreatePrivilegedUser || canCreateStoreManager) && (
              <Button
                className="w-full !bg-[#8fa31e] hover:!bg-[#78871c] sm:w-auto lg:hidden"
                onClick={openCreateModal}
              >
                <HiOutlinePlus className="mr-2 h-4 w-4" />
                Add user
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={
                roleFilter === 'all'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              All ({counts.all})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={
                roleFilter === 'admin'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Admin ({counts.admin})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setRoleFilter('storeManager')}
              className={
                roleFilter === 'storeManager'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Store Manager ({counts.storeManager})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={
                statusFilter === 'inactive'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Inactive ({counts.inactive})
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr,1fr,1fr,1fr,auto]">
            <TextInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by user, email, role, or restaurant"
            />
            <Select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="storeManager">Store Manager</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              value={accessFilter}
              onChange={(event) => setAccessFilter(event.target.value)}
            >
              <option value="all">All access models</option>
              <option value="template">Role template</option>
              <option value="custom">Custom access</option>
            </Select>
            <Button
              color="light"
              className="w-full xl:w-auto"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
                setAccessFilter('all');
                setPage(1);
              }}
            >
              <HiOutlineArrowPath className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading users...
            </div>
          )}
          {!loading && filteredUsers.length === 0 && (
            <div className="mt-5 rounded-[1.5rem] border border-dashed !border-[#dce6c1] bg-[#fbfcf7] p-8 text-center text-sm text-gray-500">
              No users matched the current filters.
            </div>
          )}

          {!loading && filteredUsers.length > 0 && (
            <>
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
                    {filteredUsers.map((user) => {
                      const restaurantName =
                        restaurantLookup.get(user.restaurantId) ||
                        restaurantLookup.get(user.restaurantId?._id) ||
                        user.restaurantId?.name ||
                        user.restaurantId ||
                        'Unassigned';
                      return (
                        <Table.Row key={getUserId(user)}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt={user.userName}
                                  className="h-11 w-11 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf4dc] text-sm font-bold text-[#5b6d1a]">
                                  {user.userName?.charAt(0)?.toUpperCase() ||
                                    '?'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[#23411f]">
                                  {user.userName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              className={`border ${roleBadge[user.role] || roleBadge.user}`}
                            >
                              {user.role}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              color={user.isActive ? 'success' : 'failure'}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {user.customPermissions
                              ? 'Custom Access'
                              : 'Role Template'}
                          </Table.Cell>
                          <Table.Cell className="text-sm text-gray-600">
                            {restaurantName}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-2">
                              {canCreatePrivilegedUser &&
                                ['admin', 'storeManager'].includes(
                                  user.role
                                ) && (
                                  <Button
                                    color="light"
                                    size="xs"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                                    Edit
                                  </Button>
                                )}
                              {canAssignStoreManager &&
                                user.role === 'storeManager' && (
                                  <Button
                                    color="light"
                                    size="xs"
                                    onClick={() => openAssignModal(user)}
                                  >
                                    Manage
                                  </Button>
                                )}
                              {canUnassignStoreManager &&
                                user.role === 'storeManager' &&
                                user.restaurantId && (
                                  <Button
                                    color="warning"
                                    size="xs"
                                    onClick={() => setPendingUnassignUser(user)}
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
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>

              <div className="mt-5 space-y-3 md:hidden">
                {filteredUsers.map((user) => {
                  const restaurantName =
                    restaurantLookup.get(user.restaurantId) ||
                    restaurantLookup.get(user.restaurantId?._id) ||
                    user.restaurantId?.name ||
                    user.restaurantId ||
                    'Unassigned';
                  return (
                    <div
                      key={getUserId(user)}
                      className="rounded-[1.5rem] border !border-[#e6eccf] bg-[#fbfcf7] p-4"
                    >
                      <div className="flex items-start gap-3">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={user.userName}
                            className="h-12 w-12 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4dc] text-sm font-bold text-[#5b6d1a]">
                            {user.userName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#23411f]">
                              {user.userName}
                            </p>
                            <Badge
                              className={`border ${roleBadge[user.role] || roleBadge.user}`}
                            >
                              {user.role}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-gray-500">
                            {user.email}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>
                              {user.customPermissions
                                ? 'Custom Access'
                                : 'Role Template'}
                            </span>
                            <span>•</span>
                            <span>{restaurantName}</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canCreatePrivilegedUser &&
                              ['admin', 'storeManager'].includes(user.role) && (
                                <Button
                                  color="light"
                                  size="xs"
                                  onClick={() => openEditModal(user)}
                                >
                                  Edit
                                </Button>
                              )}
                            {canAssignStoreManager &&
                              user.role === 'storeManager' && (
                                <Button
                                  color="light"
                                  size="xs"
                                  onClick={() => openAssignModal(user)}
                                >
                                  Manage
                                </Button>
                              )}
                            {canUnassignStoreManager &&
                              user.role === 'storeManager' &&
                              user.restaurantId && (
                                <Button
                                  color="warning"
                                  size="xs"
                                  onClick={() => setPendingUnassignUser(user)}
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
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500">
              Page {page} of {Math.max(1, totalPages)} • {totalUsers} total
              users
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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
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
        dismissible={true}
        size="7xl"
      >
        <Modal.Header>
          {modalMode === 'edit'
            ? 'Update user workspace'
            : 'Create user workspace'}
        </Modal.Header>
        <Modal.Body>
          <form className="space-y-6" onSubmit={submitUser}>
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fbf1_0%,#fff4f4_100%)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
                {modalMode === 'edit' ? 'User refinement' : 'User onboarding'}
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#23411f]">
                {canCreatePrivilegedUser
                  ? 'Role-aware user configuration'
                  : 'Store manager creation flow'}
              </h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              {canCreatePrivilegedUser ? (
                <UploadPreview
                  value={imagePreviewUrl || privilegedForm.profilePicture}
                  progress={imageUploadProgress}
                  uploading={imageUploading}
                  onSelect={handleImageUpload}
                />
              ) : (
                <div className="rounded-[1.5rem] border !border-[#e4ebce] bg-[#fbfcf7] p-5 text-sm text-gray-600">
                  <p className="font-semibold text-[#23411f]">
                    Store manager contract
                  </p>
                  <p className="mt-2 leading-7">
                    The current backend endpoint for admin-created store
                    managers does not accept profile images during creation, so
                    this modal stays aligned with the live API.
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userName">Username</Label>
                  <TextInput
                    id="userName"
                    value={currentForm.userName}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setPrivilegedForm((current) => ({
                            ...current,
                            userName: event.target.value
                          }))
                        : setManagerForm((current) => ({
                            ...current,
                            userName: event.target.value
                          }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <TextInput
                    id="email"
                    type="email"
                    value={currentForm.email}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setPrivilegedForm((current) => ({
                            ...current,
                            email: event.target.value
                          }))
                        : setManagerForm((current) => ({
                            ...current,
                            email: event.target.value
                          }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {modalMode === 'edit'
                      ? 'Password reset'
                      : 'Temporary password'}
                  </Label>
                  <PasswordInput
                    id="password"
                    value={currentForm.password}
                    onChange={(event) =>
                      canCreatePrivilegedUser
                        ? setPrivilegedForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        : setManagerForm((current) => ({
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
                        value={privilegedForm.role}
                        onChange={(event) => {
                          setPrivilegedForm((current) => ({
                            ...current,
                            role: event.target.value
                          }));
                          setPermissionState(
                            buildPermissionStateForRole(event.target.value)
                          );
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="storeManager">Store Manager</option>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Status</Label>
                      <div className="rounded-[1rem] border !border-[#e4ebce] bg-[#fbfcf7] px-4 py-3">
                        <ToggleSwitch
                          checked={privilegedForm.isActive}
                          label={
                            privilegedForm.isActive
                              ? 'Active account'
                              : 'Inactive account'
                          }
                          onChange={(checked) =>
                            setPrivilegedForm((current) => ({
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

            {canCreatePrivilegedUser && (
              <PermissionEditor
                state={permissionState}
                role={privilegedForm.role}
                onToggle={(key) =>
                  setPermissionState((current) => ({
                    ...current,
                    [key]: !current[key]
                  }))
                }
                onReset={() =>
                  setPermissionState(
                    buildPermissionStateForRole(privilegedForm.role)
                  )
                }
              />
            )}

            <div className="flex justify-end gap-3">
              <Button
                className="!bg-[#B42627] hover:!bg-[#910712]"
                onClick={resetModalState}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
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
                onChange={(event) =>
                  setAssignmentRestaurantId(event.target.value)
                }
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
            onClick={assignRestaurant}
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

      <Modal
        show={Boolean(pendingDeleteUser)}
        onClose={() => setPendingDeleteUser(null)}
      >
        <Modal.Header>Delete user</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete `{pendingDeleteUser?.userName}`?
            Clicking outside this modal will cancel the action.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="failure"
            onClick={() => pendingDeleteUser && deleteUser(pendingDeleteUser)}
          >
            Confirm delete
          </Button>
          <Button color="gray" onClick={() => setPendingDeleteUser(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(pendingUnassignUser)}
        onClose={() => setPendingUnassignUser(null)}
      >
        <Modal.Header>Unassign store manager</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-gray-600">
            Remove `{pendingUnassignUser?.userName}` from the currently assigned
            restaurant? Clicking outside this modal will cancel the action.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="warning"
            onClick={() =>
              pendingUnassignUser && unassignRestaurant(pendingUnassignUser)
            }
          >
            Confirm unassign
          </Button>
          <Button color="gray" onClick={() => setPendingUnassignUser(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
