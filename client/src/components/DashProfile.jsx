import imageCompression from 'browser-image-compression';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Modal, Spinner } from 'flowbite-react';
import {
  HiOutlineEnvelope,
  HiOutlineCamera,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUser,
  HiTrash
} from 'react-icons/hi2';
import { VscSignOut } from 'react-icons/vsc';
import ImageFrameLoader from './ImageFrameLoader';
import PasswordInput from './PasswordInput';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiDelete, apiPatch } from '../utils/api';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const ROLE_STYLES = {
  superAdmin: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Super Admin'
  },
  admin: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Admin'
  },
  storeManager: {
    badge: 'bg-yellow-700 text-white border-yellow-700',
    pill: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    label: 'Store Manager'
  },
  user: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    pill: 'bg-slate-50 text-slate-700 border-slate-200',
    label: 'Public User'
  }
};

const formatMemberSince = (value) => {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

function SummaryTile({ icon, title, value, tone = 'green' }) {
  const Icon = icon;
  const toneClasses = {
    green: 'bg-[#f5faeb] text-[#4d6518]',
    red: 'bg-[#fff4f4] text-[#8e1d1d]',
    blue: 'bg-[#eef4ff] text-[#1f4f8c]'
  };

  return (
    <div className="rounded-[1.35rem] border !border-[#ebf0d7] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            {title}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#23411f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashProfile() {
  const {
    user: currentUser,
    updateUser,
    logout,
    isLoading
  } = useAuth();
  const { showToast } = useToast();
  const filePickerRef = useRef(null);
  const userId = currentUser?._id || currentUser?.id;

  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    phoneNumber: '',
    profilePicture: ''
  });

  useEffect(() => {
    if (!currentUser) return;

    setFormData({
      userName: currentUser.userName || '',
      email: currentUser.email || '',
      password: '',
      phoneNumber: currentUser.phoneNumber || '',
      profilePicture: currentUser.profilePicture || ''
    });
    setImageFileUrl(currentUser.profilePicture || '');
  }, [currentUser]);

  useEffect(() => {
    const uploadImage = async () => {
      if (!imageFile) return;

      setImageFileUploading(true);
      setImageFileUploadingProgress(12);

      try {
        const uploaded = await uploadToCloudinary({
          file: imageFile,
          folder: 'users/profiles',
          resourceType: 'image',
          publicIdPrefix: 'profile-picture',
          onProgress: (progress) => setImageFileUploadingProgress(progress)
        });

        setImageFileUploadingProgress(100);
        setImageFileUrl(uploaded.url);
        setFormData((prev) => ({ ...prev, profilePicture: uploaded.url }));
      } catch (uploadError) {
        showToast(uploadError.message || "Couldn't upload image.", 'error');
      } finally {
        setImageFileUploading(false);
        setImageFile(null);
      }
    };

    uploadImage();
  }, [imageFile]);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed.', 'error');
      event.target.value = null;
      return;
    }

    try {
      const preparedFile =
        file.size > 2 * 1024 * 1024
          ? await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            })
          : file;

      setImageFile(preparedFile);
      setImageFileUrl(URL.createObjectURL(preparedFile));
} catch {
      showToast('Compression failed. Try a smaller photo.', 'error');
      event.target.value = null;
    }
  };

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.id]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {};

    if (formData.userName !== (currentUser?.userName || '')) {
      payload.userName = formData.userName;
    }
    if (formData.email !== (currentUser?.email || '')) {
      payload.email = formData.email;
    }
    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }
    if (formData.phoneNumber !== (currentUser?.phoneNumber || '')) {
      payload.phoneNumber = formData.phoneNumber;
    }
    if (
      formData.profilePicture &&
      formData.profilePicture !== currentUser?.profilePicture
    ) {
      payload.profilePicture = formData.profilePicture;
    }

    if (Object.keys(payload).length === 0) {
      showToast('No changes made to update.', 'error');
      return;
    }

    if (imageFileUploading) {
      showToast('Please wait for the profile photo upload to finish.', 'error');
      return;
    }

    try {
      const data = await apiPatch(`/api/users/${userId}`, payload);
      updateUser(data.data);
      setFormData((prev) => ({ ...prev, password: '' }));
      showToast('Profile updated successfully.', 'success');
    } catch (submitError) {
      showToast(submitError.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    setShowDeleteModal(false);

    try {
      await apiDelete(`/api/users/${userId}`);
      await logout();
    } catch (deleteError) {
      showToast(deleteError.message, 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // Quiet on purpose.
    }
  };

  const roleStyle = ROLE_STYLES[currentUser?.role] || ROLE_STYLES.user;
  const accountStatus = currentUser?.isActive === false ? 'Inactive' : 'Active';

  const profileCompletion = useMemo(() => {
    let completed = 0;
    if (currentUser?.userName) completed += 1;
    if (currentUser?.email) completed += 1;
    if (currentUser?.phoneNumber) completed += 1;
    if (currentUser?.profilePicture) completed += 1;
    return Math.round((completed / 4) * 100);
  }, [currentUser?.email, currentUser?.profilePicture, currentUser?.userName, currentUser?.phoneNumber]);

  if (!userId) {
    return (
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="flex items-center gap-3 text-[#4d6518]">
          <Spinner size="sm" />
          Loading profile...
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="overflow-hidden border !border-[#dce6c1] bg-white shadow-[0_25px_80px_rgba(60,79,25,0.08)]">
          <div className="rounded-[1.8rem] bg-[linear-gradient(135deg,#576500_0%,#8fa31e_50%,#b62828_100%)] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="mb-4 flex items-center gap-3">
                  <Badge className={`w-fit border ${roleStyle.badge}`}>
                    {roleStyle.label}
                  </Badge>
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
                  Account profile
                </p>
                <h2 className="mb-3 font-['Manrope'] text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Personal Settings
                </h2>
                <p className="max-w-xl text-sm leading-6 text-white/80">
                  Manage your identity, contact details, password, and account
                  presentation from one central workspace.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <HiOutlineSparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        Profile completion
                      </p>
                      <p className="font-['Manrope'] text-2xl font-bold">
                        {profileCompletion}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-[#d7ee64]"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <HiOutlineShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        Account status
                      </p>
                      <p className="font-['Manrope'] text-lg font-bold">
                        {accountStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t !border-[#ebf0d7] bg-[#f8fbf1] p-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon={HiOutlineUser}
              title="Display name"
              value={currentUser?.userName || 'Unknown'}
              tone="green"
            />
            <SummaryTile
              icon={HiOutlineEnvelope}
              title="Primary email"
              value={currentUser?.email || 'Not available'}
              tone="blue"
            />
            <SummaryTile
              icon={HiOutlineShieldCheck}
              title="Role access"
              value={roleStyle.label}
              tone="red"
            />
            <SummaryTile
              icon={HiOutlineSparkles}
              title="Member since"
              value={formatMemberSince(currentUser?.createdAt)}
              tone="green"
            />
          </div>
        </Card>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 xl:grid-cols-[0.8fr,1.2fr]"
        >
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
                  Profile image
                </p>
                <h3 className="text-xl font-bold text-[#23411f]">
                  Visual identity
                </h3>
                <p className="text-sm leading-7 text-gray-600">
                  Upload a polished square avatar to keep the control center
                  feeling professional and consistent.
                </p>
              </div>

              <div
                className="group cursor-pointer"
                onClick={() => filePickerRef.current?.click()}
              >
                <input
                  ref={filePickerRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />

                <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] border !border-[#dce6c1] bg-[#f7faef] shadow-inner">
                  {imageFileUrl || currentUser?.profilePicture ? (
                    <img
                      src={imageFileUrl || currentUser?.profilePicture}
                      alt={currentUser?.userName || 'Profile'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#e5edc3_0%,#f7faef_55%,#f2f5e6_100%)]">
                      <span className="text-5xl font-bold text-[#5c6f1a]">
                        {currentUser?.userName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}

                  {imageFileUploading && (
                    <ImageFrameLoader
                      progress={imageFileUploadingProgress || 0}
                      label="Uploading profile"
                      className="rounded-[1.75rem]"
                    />
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <div className="rounded-2xl bg-white/15 px-4 py-3 text-center text-white backdrop-blur">
                      <HiOutlineCamera className="mx-auto h-6 w-6" />
                      <p className="mt-2 text-sm font-semibold">Change photo</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-4 text-sm text-gray-600">
                Square images work best. Large photos are compressed before
                upload to keep updates quick on mobile connections.
              </div>
            </div>
          </Card>

          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
                  Personal information
                </p>
                <h3 className="text-xl font-bold text-[#23411f]">
                  Account details
                </h3>
                <p className="text-sm leading-7 text-gray-600">
                  Update your core identity details while keeping role access
                  and account controls visible at a glance.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="userName"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Username
                  </label>
                  <input
                    id="userName"
                    type="text"
                    value={formData.userName}
                    onChange={handleChange}
                    className="w-full rounded-[1rem] border !border-[#d9e2bc] bg-[#f8fbf1] px-4 py-3 text-sm text-[#23411f] outline-none transition focus:!border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50"
                    placeholder="Enter your username"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-[1rem] border !border-[#d9e2bc] bg-[#f8fbf1] px-4 py-3 text-sm text-[#23411f] outline-none transition focus:!border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="phoneNumber"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full rounded-[1rem] border !border-[#d9e2bc] bg-[#f8fbf1] px-4 py-3 text-sm text-[#23411f] outline-none transition focus:!border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50"
                    placeholder="+44 123 456 7890"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Role
                  </label>
                  <div
                    className={`rounded-[1rem] border px-4 py-3 text-sm font-semibold ${roleStyle.pill}`}
                  >
                    {roleStyle.label}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.35rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Security posture
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#23411f]">
                    Password changes take effect immediately after saving.
                  </p>
                </div>
                <div className="rounded-[1.35rem] border !border-[#ebf0d7] bg-[#fbfcf7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Session note
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#23411f]">
                    Sign out from here any time if you need to close the current
                    session.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t !border-[#ebf0d7] pt-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="!bg-red-600 hover:!bg-red-700 w-full sm:w-auto"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <HiTrash className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                  <Button
                    type="button"
                    className="!bg-red-600 hover:!bg-red-700 w-full sm:w-auto"
                    onClick={handleSignOut}
                  >
                    <VscSignOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full !bg-[#6b7d18] text-white shadow-lg !shadow-[#8fa31e]/20 hover:opacity-95 lg:w-auto"
                  disabled={isLoading || imageFileUploading}
                >
                  {isLoading || imageFileUploading
                    ? 'Saving...'
                    : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>

      <DeleteConfirmModal
        show={showDeleteModal}
        dismissible={true}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title="Delete Account"
        message="This action permanently removes your account and cannot be undone."
        warning="This will delete your profile, settings, and all associated data."
        confirmText="Yes, Delete Account"
      />
    </>
  );
}
