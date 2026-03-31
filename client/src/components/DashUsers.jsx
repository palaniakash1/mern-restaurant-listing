import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Button, Modal, Spinner, Table } from 'flowbite-react';
import imageCompression from 'browser-image-compression';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable
} from 'firebase/storage';
import {
  HiOutlineExclamationCircle,
  HiOutlineX,
  HiPencilAlt,
  HiTrash
} from 'react-icons/hi';

import { app } from '../firebase';
import {
  buildPermissionPayload,
  buildPermissionStateFromPayload,
  buildPermissionStateForRole,
  countEnabledPermissions,
  PERMISSION_GROUPS
} from '../constants/permissionTemplates';
import {
  updateFailure,
  updateStart,
  updateSuccess
} from '../redux/user/userSlice';

const DEFAULT_ROLE = 'admin';

const buildCreateForm = () => ({
  userName: '',
  email: '',
  password: '',
  role: DEFAULT_ROLE,
  isActive: true
});

const areEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const getPermissionModeLabel = (user) =>
  user?.customPermissions ? 'Custom Access' : 'Role Template';

function SwitchField({ checked, onChange, srLabel }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-[#8fa31e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d8e89d] after:absolute after:left-[4px] after:top-[4px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
      <span className="sr-only">{srLabel}</span>
    </label>
  );
}

export default function DashUsers() {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const filePickerRef = useRef();

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [createForm, setCreateForm] = useState(buildCreateForm);
  const [createPermissionState, setCreatePermissionState] = useState(
    buildPermissionStateForRole(DEFAULT_ROLE)
  );
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [editPermissionState, setEditPermissionState] = useState({});
  const [updateUserError, setUpdateUserError] = useState(null);
  const [updateUserSuccess, setUpdateUserSuccess] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUploadingError, setImageFileUploadingError] =
    useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load users');
      }
      setUsers(data.data || []);
      setTotalPages(Math.max(1, data.totalPages || 1));
      setTotalUsers(data.total || 0);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    if (currentUser?.role === 'superAdmin') {
      fetchUsers();
    }
  }, [currentUser?.role, fetchUsers]);

  const handleCreateInputChange = (event) => {
    const { id, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleTemplateChange = (event) => {
    const nextRole = event.target.value;
    setCreateForm((prev) => ({ ...prev, role: nextRole }));
    setCreatePermissionState(buildPermissionStateForRole(nextRole));
  };

  const resetPermissionsToRoleTemplate = () => {
    setCreatePermissionState(buildPermissionStateForRole(createForm.role));
  };

  const setAllPermissions = (enabled) => {
    setCreatePermissionState((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((permissionKey) => [permissionKey, enabled])
      )
    );
  };

  const togglePermission = (permissionKey) => {
    setCreatePermissionState((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const customPayload = buildPermissionPayload(createPermissionState);
      const roleTemplatePayload = buildPermissionPayload(
        buildPermissionStateForRole(createForm.role)
      );
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm,
          permissions: areEqual(customPayload, roleTemplatePayload)
            ? null
            : customPayload
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create user');
      }
      setCreateSuccess(
        `${data.user.userName} created with ${
          data.permissionMode === 'custom' ? 'custom access' : 'role template access'
        }.`
      );
      setCreateForm(buildCreateForm());
      setCreatePermissionState(buildPermissionStateForRole(DEFAULT_ROLE));
      await fetchUsers();
    } catch (createUserError) {
      setCreateError(createUserError.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      userName: user.userName,
      email: user.email,
      profilePicture: user.profilePicture,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
    setEditPermissionState(
      buildPermissionStateFromPayload(user.customPermissions, user.role)
    );
    setImageFileUrl(user.profilePicture || null);
    setUpdateUserError(null);
    setUpdateUserSuccess(null);
    setIsDrawerOpen(true);
  };

  const handleEditChange = (event) => {
    const { id, value } = event.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleEditRoleTemplateChange = (event) => {
    const nextRole = event.target.value;
    setFormData((prev) => ({ ...prev, role: nextRole }));
    setEditPermissionState(buildPermissionStateForRole(nextRole));
  };

  const resetEditPermissionsToRoleTemplate = () => {
    setEditPermissionState(buildPermissionStateForRole(formData.role));
  };

  const toggleEditPermission = (permissionKey) => {
    setEditPermissionState((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  const setAllEditPermissions = (enabled) => {
    setEditPermissionState((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((permissionKey) => [permissionKey, enabled])
      )
    );
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageFileUploadingError('Only image files are allowed.');
      event.target.value = null;
      return;
    }
    const limitInBytes = 2 * 1024 * 1024;
    try {
      setImageFileUploading(true);
      setImageFileUploadingError(null);
      if (file.size > limitInBytes) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        });
        setImageFile(compressedFile);
        setImageFileUrl(URL.createObjectURL(compressedFile));
      } else {
        setImageFile(file);
        setImageFileUrl(URL.createObjectURL(file));
      }
    } catch {
      setImageFileUploadingError('Compression failed. Try a smaller photo.');
    } finally {
      setImageFileUploading(false);
    }
  };

  const uploadImage = useCallback(() => {
    if (!imageFile) return;
    setIsUploading(true);
    setImageFileUploading(true);
    setImageFileUploadingError(null);
    const storage = getStorage(app);
    const storageRef = ref(storage, `${Date.now()}-${imageFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setImageFileUploadingProgress(Math.round(progress));
      },
      () => {
        setIsUploading(false);
        setImageFileUploadingProgress(null);
        setImageFile(null);
        setImageFileUrl(null);
        setImageFileUploadingError("Couldn't upload image.");
        setImageFileUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setImageFileUrl(downloadURL);
          setFormData((prev) => ({ ...prev, profilePicture: downloadURL }));
          setIsUploading(false);
          setImageFileUploading(false);
        });
      }
    );
  }, [imageFile]);

  useEffect(() => {
    if (imageFile) uploadImage();
  }, [imageFile, uploadImage]);

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    setLoading(true);
    setUpdateUserError(null);
    setUpdateUserSuccess(null);
    try {
      if (!selectedUser?._id) throw new Error('Select a user to update');
      if (imageFileUploading) {
        throw new Error('Please wait for the image upload to finish');
      }

      const customPayload = buildPermissionPayload(editPermissionState);
      const roleTemplatePayload = buildPermissionPayload(
        buildPermissionStateForRole(formData.role)
      );

      dispatch(updateStart());
      const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          password: formData.password || undefined,
          permissions: areEqual(customPayload, roleTemplatePayload)
            ? null
            : customPayload
        })
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch(updateFailure(data.message));
        throw new Error(data.message || 'Failed to update user');
      }
      if (
        currentUser &&
        (currentUser._id === selectedUser._id || currentUser.id === selectedUser._id)
      ) {
        dispatch(updateSuccess(data.user));
      }
      setUsers((prev) =>
        prev.map((user) =>
          user._id === selectedUser._id
            ? {
              ...user,
              ...data.user,
              _id: user._id,
              customPermissions: data.user.customPermissions
            }
            : user
        )
      );
      setUpdateUserSuccess('Staff profile updated successfully.');
      setTimeout(() => setIsDrawerOpen(false), 1200);
    } catch (updateError) {
      dispatch(updateFailure(updateError.message));
      setUpdateUserError(updateError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?._id) return;
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((user) => user._id !== selectedUser._id));
      setTotalUsers((prev) => Math.max(0, prev - 1));
      setSuccess('User deleted successfully.');
      setShowModal(false);
      setSelectedUser(null);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const getPagination = (current, total) => {
    const pages = new Set([1, total]);
    for (let pageNumber = current - 1; pageNumber <= current + 1; pageNumber += 1) {
      if (pageNumber > 1 && pageNumber < total) pages.add(pageNumber);
    }
    return [...pages].sort((left, right) => left - right);
  };

  if (currentUser?.role !== 'superAdmin') {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <Alert color="failure">
          Only the super admin can access the staff creation and permission
          management module.
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-3">
      {error && (
        <Alert color="failure" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#dce6b7] bg-white shadow-sm">
        <div className="border-b border-[#e8efcd] bg-gradient-to-r from-[#8fa31e] to-[#a4b738] px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/75">
            Super Admin Access
          </p>
          <h2 className="text-2xl font-bold">Create Staff Profile</h2>
          <p className="mt-1 text-sm text-white/80">
            Create privileged users and tailor their dashboard access with role
            templates and permission toggles.
          </p>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateUser}
            className="space-y-5 rounded-2xl border border-gray-200 bg-[#fbfcf6] p-5"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Personal Details
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                This section is restricted to the platform super admin.
              </p>
            </div>

            {createError && <Alert color="failure">{createError}</Alert>}
            {createSuccess && <Alert color="success">{createSuccess}</Alert>}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Username
              </span>
              <input
                id="userName"
                value={createForm.userName}
                onChange={handleCreateInputChange}
                placeholder="e.g. sarahsmith"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d8e89d]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Email (Login ID)
              </span>
              <input
                id="email"
                type="email"
                value={createForm.email}
                onChange={handleCreateInputChange}
                placeholder="sarah@company.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d8e89d]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Temporary Password
              </span>
              <input
                id="password"
                type="password"
                value={createForm.password}
                onChange={handleCreateInputChange}
                placeholder="Minimum 8 chars, 1 capital, 1 number"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d8e89d]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Role Template (Auto-fill)
              </span>
              <select
                id="role"
                value={createForm.role}
                onChange={handleRoleTemplateChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d8e89d]"
              >
                <option value="admin">Admin</option>
                <option value="storeManager">Store Manager</option>
              </select>
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Account Status
                </p>
                <p className="text-xs text-slate-500">
                  New user starts {createForm.isActive ? 'active' : 'inactive'}.
                </p>
              </div>
              <SwitchField
                checked={createForm.isActive}
                onChange={() =>
                  setCreateForm((prev) => ({
                    ...prev,
                    isActive: !prev.isActive
                  }))
                }
                srLabel="Toggle account status"
              />
            </label>

            <div className="rounded-2xl border border-dashed border-[#cad98a] bg-[#f6fadf] p-4">
              <p className="text-sm font-semibold text-slate-800">
                Permission Summary
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {countEnabledPermissions(createPermissionState)} permissions
                enabled across grouped access cards.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetPermissionsToRoleTemplate}
                className="rounded-xl border border-[#8fa31e] px-4 py-2 text-sm font-semibold text-[#556b2f] transition hover:bg-[#f0f6d4]"
              >
                Reset To Role Template
              </button>
              <button
                type="button"
                onClick={() => setAllPermissions(true)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setAllPermissions(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear All
              </button>
            </div>

            <Button
              type="submit"
              disabled={createSubmitting}
              className="w-full !bg-[#4f6f1b] hover:!bg-[#3d5614]"
            >
              {createSubmitting ? <Spinner size="sm" /> : 'Save User Profile'}
            </Button>
          </form>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-[#fbfcfe] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Operational Permissions
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Role template changes auto-fill these switches, and you can
                    fine-tune them before saving.
                  </p>
                </div>
                <span className="rounded-full bg-[#eef4d3] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#556b2f]">
                  {createForm.role === 'admin'
                    ? 'Admin Template'
                    : 'Store Manager Template'}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {PERMISSION_GROUPS.map((group) => (
                <section
                  key={group.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h4 className="font-semibold text-slate-800">
                      {group.title}
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.permissions.map((permission) => (
                      <div
                        key={permission.key}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {permission.label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {permission.description}
                          </p>
                        </div>
                        <SwitchField
                          checked={Boolean(createPermissionState[permission.key])}
                          onChange={() => togglePermission(permission.key)}
                          srLabel={`Toggle ${permission.label}`}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm md:block">
        <div className="flex items-center justify-between bg-[#8fa31e] px-5 py-4 text-white">
          <h2 className="text-xl font-bold uppercase">System Users</h2>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
            {totalUsers} users
          </span>
        </div>

        <Table hoverable className="min-w-[960px] bg-white shadow-none">
          <Table.Head>
            <Table.HeadCell>Profile</Table.HeadCell>
            <Table.HeadCell>Username</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Role</Table.HeadCell>
            <Table.HeadCell>Access Mode</Table.HeadCell>
            <Table.HeadCell>Status</Table.HeadCell>
            <Table.HeadCell>Delete</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {users.map((user) => (
              <Table.Row
                key={user._id}
                className="cursor-pointer"
                onClick={() => handleEditClick(user)}
              >
                <Table.Cell>
                  <img
                    src={user.profilePicture}
                    alt={user.userName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </Table.Cell>
                <Table.Cell className="font-medium text-gray-900">
                  {user.userName}
                </Table.Cell>
                <Table.Cell>{user.email}</Table.Cell>
                <Table.Cell>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                    {user.role.toUpperCase()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.customPermissions
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {getPermissionModeLabel(user)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedUser(user);
                      setShowModal(true);
                    }}
                    className="flex items-center justify-center gap-1 font-bold text-red-600"
                  >
                    <HiTrash />
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {loading && (
          <p className="bg-white py-6 text-center text-gray-500">
            Loading users...
          </p>
        )}

        {totalPages > 1 && (
          <div className="my-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                page === 1
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-red-600 text-white hover:bg-[#CC0001]'
              }`}
            >
              &lt; Prev
            </button>

            {getPagination(page, totalPages).map((pageNumber, index, pages) => {
              const previousPage = pages[index - 1];
              return (
                <React.Fragment key={pageNumber}>
                  {previousPage && pageNumber - previousPage > 1 && (
                    <span className="select-none px-2 text-gray-400">...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold transition-all ${
                      page === pageNumber
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'border bg-white hover:bg-gray-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                </React.Fragment>
              );
            })}

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                page === totalPages
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-red-600 text-white hover:bg-[#CC0001]'
              }`}
            >
              Next &gt;
            </button>
          </div>
        )}
      </section>

      <section className="space-y-4 md:hidden">
        {loading && (
          <p className="py-6 text-center text-gray-500">Loading users...</p>
        )}
        {users.map((user) => (
          <div key={user._id} className="rounded-2xl bg-white p-4 shadow-md">
            <div className="flex gap-4">
              <img
                src={user.profilePicture}
                alt={user.userName}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-gray-900">{user.userName}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {user.role}
                  </span>
                  <span className="rounded bg-[#eef4d3] px-2 py-1 text-xs text-[#556b2f]">
                    {getPermissionModeLabel(user)}
                  </span>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleEditClick(user)}
                    className="flex items-center gap-1 font-bold text-[#8fa31e]"
                  >
                    <HiPencilAlt /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 rounded-[4px] bg-[#CC0001] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ea2020]"
                  >
                    <HiTrash className="text-lg" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isDrawerOpen
            ? 'bg-black/40 opacity-100'
            : 'pointer-events-none bg-transparent opacity-0'
        }`}
      >
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-500 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedUser && (
            <div className="flex h-full flex-col p-6">
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold">Edit User</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Update role, status, and custom permissions as super admin.
                  </p>
                </div>
                <button type="button" onClick={() => setIsDrawerOpen(false)}>
                  <HiOutlineX />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="flex-1 space-y-4">
                <div
                  className="relative mx-auto h-32 w-32 cursor-pointer"
                  onClick={() => filePickerRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={filePickerRef}
                    onChange={handleImageChange}
                    hidden
                  />
                  <img
                    src={imageFileUrl || selectedUser.profilePicture}
                    alt="user"
                    className="h-full w-full rounded-full border object-cover"
                  />
                </div>

                {imageFileUploading && (
                  <p className="text-center text-xs text-slate-500">
                    Uploading image... {imageFileUploadingProgress || 0}%
                  </p>
                )}
                {imageFileUploadingError && (
                  <Alert color="failure">{imageFileUploadingError}</Alert>
                )}
                {isUploading && (
                  <p className="text-center text-xs text-slate-500">
                    Finalizing upload...
                  </p>
                )}

                <input
                  id="userName"
                  value={formData.userName || ''}
                  onChange={handleEditChange}
                  className="w-full rounded border p-3"
                  placeholder="Username"
                />
                <input
                  id="email"
                  value={formData.email || ''}
                  onChange={handleEditChange}
                  className="w-full rounded border p-3"
                  placeholder="Email"
                />
                <input
                  id="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={handleEditChange}
                  className="w-full rounded border p-3"
                  placeholder="Optional new password"
                />
                <select
                  id="role"
                  value={formData.role || DEFAULT_ROLE}
                  onChange={handleEditRoleTemplateChange}
                  className="w-full rounded border p-3"
                >
                  <option value="admin">Admin</option>
                  <option value="storeManager">Store Manager</option>
                </select>

                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Account Status
                    </p>
                    <p className="text-xs text-slate-500">
                      This user is currently {formData.isActive ? 'active' : 'inactive'}.
                    </p>
                  </div>
                  <SwitchField
                    checked={Boolean(formData.isActive)}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: !prev.isActive
                      }))
                    }
                    srLabel="Toggle edit account status"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-[#cad98a] bg-[#f6fadf] p-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Permission Summary
                  </p>
                  <p className="text-sm text-slate-600">
                    {countEnabledPermissions(editPermissionState)} permissions enabled.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetEditPermissionsToRoleTemplate}
                  className="w-full rounded-xl border border-[#8fa31e] px-4 py-2 text-sm font-semibold text-[#556b2f] transition hover:bg-[#f0f6d4]"
                >
                  Reset Edit Permissions To Role Template
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllEditPermissions(true)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllEditPermissions(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => (
                    <section
                      key={`edit-${group.id}`}
                      className="rounded-xl border border-gray-200"
                    >
                      <div className="border-b border-gray-100 px-3 py-2">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {group.title}
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.permissions.map((permission) => (
                          <div
                            key={`edit-${permission.key}`}
                            className="flex items-start justify-between gap-3 px-3 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {permission.label}
                              </p>
                              <p className="text-xs text-slate-500">
                                {permission.description}
                              </p>
                            </div>
                            <SwitchField
                              checked={Boolean(editPermissionState[permission.key])}
                              onChange={() => toggleEditPermission(permission.key)}
                              srLabel={`Toggle ${permission.label} for edit`}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full !bg-[#8fa31e]"
                >
                  {loading ? <Spinner size="sm" /> : 'Save Changes'}
                </Button>

                {updateUserError && <Alert color="failure">{updateUserError}</Alert>}
                {updateUserSuccess && (
                  <Alert color="success">{updateUserSuccess}</Alert>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} popup size="md">
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400" />
            <h3 className="mb-5 text-lg text-gray-500">
              Are you sure you want to delete this user?
            </h3>
            <div className="flex justify-center gap-4">
              <Button color="failure" onClick={handleDeleteUser}>
                Yes, I&apos;m sure
              </Button>
              <Button color="gray" onClick={() => setShowModal(false)}>
                No, Cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
