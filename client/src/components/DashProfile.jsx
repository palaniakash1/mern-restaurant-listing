import imageCompression from 'browser-image-compression';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal } from 'flowbite-react';
import { HiOutlineExclamationCircle, HiTrash } from 'react-icons/hi';
import { VscSignOut } from 'react-icons/vsc';
import ImageCircleLoader from '../components/ImageCircleLoader';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { buildCsrfHeaders } from '../utils/http';

export default function DashProfile() {
  const { user: currentUser, updateUser, logout, isLoading, error: authError } = useAuth();
  const filePickerRef = useRef();

  const loading = isLoading;
  const error = authError;
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUploadingError, setImageFileUploadingError] = useState(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [updateUserSuccess, setUpdateUserSuccess] = useState(null);
  const [updateUserError, setUpdateUserError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({});
  const userId = currentUser?._id || currentUser?.id;

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageFileUploadingError('Only image files are allowed.');
      event.target.value = null;
      return;
    }

    try {
      setImageFileUploadingError(null);
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
      setImageFileUploadingError('Compression failed. Try a smaller photo.');
    } finally {
      event.target.value = null;
    }
  };

  useEffect(() => {
    const uploadImage = async () => {
      if (!imageFile) return;

      setIsUploading(true);
      setImageFileUploading(true);
      setImageFileUploadingProgress(20);
      setImageFileUploadingError(null);

      try {
        const uploaded = await uploadToCloudinary({
          file: imageFile,
          folder: 'users/profiles',
          resourceType: 'image',
          publicIdPrefix: 'profile-picture'
        });

        setImageFileUploadingProgress(100);
        setImageFileUrl(uploaded.url);
        setFormData((prev) => ({ ...prev, profilePicture: uploaded.url }));
      } catch (uploadError) {
        setImageFile(null);
        setImageFileUrl(null);
        setImageFileUploadingProgress(null);
        setImageFileUploadingError(
          uploadError.message || "Couldn't upload image."
        );
      } finally {
        setIsUploading(false);
        setImageFileUploading(false);
      }
    };

    uploadImage();
  }, [imageFile]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.id]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUpdateUserError(null);
    setUpdateUserSuccess(null);

    if (Object.keys(formData).length === 0) {
      setUpdateUserError('No changes made to update');
      return;
    }

    if (imageFileUploading) {
      setUpdateUserError('Please wait for the profile photo upload to finish.');
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: buildCsrfHeaders({
          'content-type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        setUpdateUserError(data.message);
        return;
      }

      updateUser(data.data);
      setUpdateUserSuccess('User profile updated successfully.');
    } catch (submitError) {
      setUpdateUserError(submitError.message);
    }
  };

  const handleDeleteUser = async () => {
    setShowDeleteModal(false);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildCsrfHeaders()
      });
      await res.json();

      if (!res.ok) {
        return;
      }

      logout();
    } catch (deleteError) {
      console.log(deleteError);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // Keep the UI calm here; sidebar signout remains available too.
    }
  };

  if (!userId) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-full p-3">
        <form onSubmit={handleSubmit}>
          <div className="relative flex flex-col items-start gap-10 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:flex-row lg:p-10">
            <div
              className="group relative h-36 w-36 flex-shrink-0 cursor-pointer"
              onClick={() => filePickerRef.current.click()}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={filePickerRef}
                hidden
              />

              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-[#DEF7EC] shadow-inner">
                {isUploading && (
                  <div className="absolute inset-0 z-10">
                    <ImageCircleLoader
                      progress={imageFileUploadingProgress || 0}
                    />
                  </div>
                )}
                <img
                  src={imageFileUrl || currentUser.profilePicture}
                  alt="user"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-xs font-medium text-white">
                    Change Photo
                  </span>
                </div>
              </div>
            </div>

            <div className="grid w-full flex-1 grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Name
                </label>
                <input
                  type="text"
                  id="userName"
                  placeholder="Enter name"
                  defaultValue={currentUser.userName}
                  onChange={handleChange}
                  className="w-full rounded-[5px] border-gray-200 bg-white p-3 focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="name@gmail.com"
                  defaultValue={currentUser.email}
                  onChange={handleChange}
                  className="w-full rounded-[5px] border-gray-200 bg-white p-3 focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  placeholder="********"
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Role
                </label>
                <input
                  value={currentUser.role}
                  disabled
                  className="w-full rounded-[5px] border-gray-200 bg-white p-3 text-gray-500"
                />
              </div>

              <div className="mt-4 flex flex-col gap-4 border-t pt-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
                <Button
                  type="submit"
                  className="w-full border-none !bg-[#8fa31e] text-white hover:!bg-[#7a8c1a] lg:w-[30%]"
                  disabled={loading || imageFileUploading}
                >
                  {loading ? 'Loading...' : 'Update'}
                </Button>

                <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                  <Button
                    color="failure"
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full lg:w-auto"
                  >
                    <HiTrash className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>

                  <Button
                    color="light"
                    type="button"
                    onClick={handleSignOut}
                    className="w-full lg:w-auto"
                  >
                    <VscSignOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>

              {updateUserSuccess && (
                <Alert color="success" className="lg:col-span-2">
                  {updateUserSuccess}
                </Alert>
              )}

              {updateUserError && (
                <Alert color="failure" className="lg:col-span-2">
                  {updateUserError}
                </Alert>
              )}

              {imageFileUploadingError && (
                <Alert color="failure" className="lg:col-span-2">
                  {imageFileUploadingError}
                </Alert>
              )}

              {error && (
                <Alert color="failure" className="lg:col-span-2">
                  {error}
                </Alert>
              )}
            </div>
          </div>
        </form>
      </div>

      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Header>Delete Account</Modal.Header>
        <Modal.Body>
          <div className="flex flex-col items-center gap-4 text-center">
            <HiOutlineExclamationCircle className="h-16 w-16 text-red-500" />
            <p className="text-sm text-gray-600">
              This action will permanently remove your account.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={handleDeleteUser}>
            Yes, delete
          </Button>
          <Button color="gray" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
