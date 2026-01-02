import imageCompression from "browser-image-compression";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, TextInput, Modal, Select } from "flowbite-react";
import { useSelector } from "react-redux";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import ImageCircleLoader from "../components/ImageCircleLoader";
import {
  updateStart,
  updateSuccess,
  updateFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOutSuccess,
} from "../redux/user/userSlice";
import { useDispatch } from "react-redux";
import { HiOutlineExclamationCircle, HiTrash } from "react-icons/hi";
import { Link } from "react-router-dom";
import { VscSignOut } from "react-icons/vsc";

export default function DashProfile() {
  const { currentUser, error, loading } = useSelector((state) => state.user);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUploadingError, setImageFileUploadingError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [updateUserSuccess, setUpdateUserSuccess] = useState(null);
  const [updateUserError, setUpdateUserError] = useState(null);
  const [showModal, setShowModal] = useState(null);

  const [formData, setFormData] = useState({});

  const filePickerRef = useRef();
  const dispatch = useDispatch();

  console.log(imageFileUploadingProgress, imageFileUploadingError);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ❌ 1. Reject non-image files
    if (!file.type.startsWith("image/")) {
      setImageFileUploadingError("Only image files are allowed.");
      e.target.value = null; // reset input
      return;
    }
    // Define our 2MB limit (2 * 1024 * 1024 bytes)
    const limitInBytes = 2 * 1024 * 1024;
    console.log((file.size / (1024 * 1024)).toFixed(2) + " MB");

    // 2. Conditional Compression
    if (file.size > limitInBytes) {
      console.log("File is large. Starting compression...");

      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        setImageFileUploading(true);
        setImageFileUploadingError(null);

        const compressedFile = await imageCompression(file, options);

        // Use the compressed file
        setImageFile(compressedFile);
        setImageFileUrl(URL.createObjectURL(compressedFile));
        console.log((compressedFile.size / (1024 * 1024)).toFixed(2) + " MB");
      } catch (error) {
        console.error(error);
        setImageFileUploadingError("Compression failed. Try a smaller photo.");
      } finally {
        setImageFileUploading(false);
      }
    } else {
      // 3. File is already small, skip compression and use original
      console.log("File is under 2MB. Skipping compression.");
      setImageFile(file);
      setImageFileUrl(URL.createObjectURL(file));
      setImageFileUploadingError(null);
    }
    // ✅ 2. Clear old errors
    setImageFileUploadingError(null);
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const uploadImage = useCallback(() => {
    if (!imageFile) return;
    setIsUploading(true); // 👈 START upload UI
    setImageFileUploading(true);
    setImageFileUploadingError(null);
    const storage = getStorage(app);
    const fileName = new Date().getTime() + imageFile.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setImageFileUploadingProgress(Math.round(progress));
      },
      // eslint-disable-next-line no-unused-vars
      (error) => {
        setIsUploading(false);
        setImageFileUploadingProgress(null);
        setImageFile(null);
        setImageFileUrl(null);
        setImageFileUploadingError(
          `couldn't upload image (image size exceeds 2MB)`
        );
        setImageFileUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setImageFileUrl(downloadURL);
          setIsUploading(false);
          setFormData((prev) => ({ ...prev, profilePicture: downloadURL }));
          setImageFileUploading(false);
        });
      }
    );
  }, [imageFile]);

  useEffect(() => {
    if (imageFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      uploadImage();
    }
  }, [imageFile, uploadImage]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  console.log(formData);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setUpdateUserError(null);
    setUpdateUserSuccess(null);

    if (Object.keys(formData).length === 0) {
      setUpdateUserError(`No changes made to update`);
      return;
    }

    if (imageFileUploading) {
      setUpdateUserError("please wait for the image to uploaded");
      return;
    }

    try {
      dispatch(updateStart());
      const res = await fetch(`/api/user/update/${currentUser._id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        dispatch(updateFailure(data.message));
        setUpdateUserError(data.message);
      } else {
        dispatch(updateSuccess(data));
        setUpdateUserSuccess(`User Profile updated successfully!`);
      }
    } catch (error) {
      dispatch(updateFailure(error.message));
      setUpdateUserError(error.message);
    }
  };

  const handleDeleteUser = async () => {
    setShowModal(false);
    try {
      dispatch(deleteUserStart());
      const res = await fetch(`/api/user/delete/${currentUser._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch(deleteUserFailure(data.message));
      } else {
        dispatch(deleteUserSuccess(data));
      }
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch(`/api/user/signout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signOutSuccess());
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      {/* gemini design */}
      <div className="p-3 w-full max-w-full mx-auto">
        <form onSubmit={handleSubmit}>
          {/* MAIN PROFILE CARD */}
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-10 items-start relative">
            {/* LEFT SIDE: IMAGE PICKER */}
            <div
              className="relative w-36 h-36 flex-shrink-0 cursor-pointer group"
              onClick={() => filePickerRef.current.click()}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={filePickerRef}
                hidden
              />

              <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#DEF7EC] shadow-inner relative">
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
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-medium">
                    Change Photo
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: FORM FIELDS */}
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Row 1: Name and Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Name
                </label>
                <TextInput
                  type="text"
                  id="userName"
                  placeholder="Enter name"
                  defaultValue={currentUser.userName}
                  onChange={handleChange}
                  className="[&>div>input]:bg-white [&>div>input]:border-gray-300 [&>div>input]:rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  E-mail ID
                </label>
                <TextInput
                  type="email"
                  id="email"
                  placeholder="name@gmail.com"
                  defaultValue={currentUser.email}
                  onChange={handleChange}
                  className="[&>div>input]:bg-white [&>div>input]:border-gray-300 [&>div>input]:rounded-lg"
                />
              </div>

              {/* Row 2: Password and Role */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Password
                </label>
                <TextInput
                  type="password"
                  id="password"
                  placeholder="********"
                  onChange={handleChange}
                  className="[&>div>input]:bg-white [&>div>input]:border-gray-300 [&>div>input]:rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-500">
                  Role
                </label>
                <Select
                  id="role"
                  disabled
                  defaultValue={currentUser.role}
                  className="[&>div>select]:bg-gray-50 [&>div>select]:border-gray-300 [&>div>select]:rounded-lg"
                >
                  <option value="superAdmin">SuperAdmin</option>
                  <option value="admin">Admin</option>
                  <option value="storeManager">Store Manager</option>
                  <option value="user">User</option>
                </Select>
              </div>

              {/* BOTTOM ACTIONS (DELETE & SIGN OUT) */}
              <div className="md:col-span-2 flex justify-between items-center gap-4 mt-4 border-t pt-6">
                <Button
                  type="submit"
                  className="w-[30%] !bg-[#8fa31e] hover:!bg-[#7a8c1a] text-white !rounded-[4px] border-none"
                  disabled={loading || imageFileUploading}
                >
                  {loading ? "loading..." : "Update"}
                </Button>
                <div className="flex gap-5">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-[#ff6b6b] text-white px-4 py-2 !rounded-[4px] font-medium hover:bg-red-600 transition-colors"
                  >
                    <HiTrash className="text-lg" /> Delete
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 !rounded-[4px] font-medium hover:bg-gray-50 transition-colors"
                  >
                    <VscSignOut className="text-lg text-red-500" /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
        {/* FEEDBACK ALERTS */}
        <div className="mt-6 max-w-full space-y-3">
          {/* Image Upload Error */}
          {imageFileUploadingError && (
            <Alert
              color="failure"
              onDismiss={() => setImageFileUploadingError(null)}
            >
              {imageFileUploadingError}
            </Alert>
          )}

          {/* Profile Update Success */}
          {updateUserSuccess && (
            <Alert color="success" onDismiss={() => setUpdateUserSuccess(null)}>
              {updateUserSuccess}
            </Alert>
          )}

          {/* Profile Update Error (Logic Error) */}
          {updateUserError && (
            <Alert color="failure" onDismiss={() => setUpdateUserError(null)}>
              {updateUserError}
            </Alert>
          )}

          {/* General Redux/API Error */}
          {error && (
            <Alert
              color="failure"
              // Note: Usually 'error' from Redux should be cleared via an action,
              // but for UI dismissal, we can check if your slice has a clearError action.
              // If not, this X will show but won't hide unless the page refreshes.
            >
              {error}
            </Alert>
          )}
        </div>

        {/* DELETE MODAL */}
        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          popup
          size="md"
        >
          <Modal.Header />
          <Modal.Body>
            <div className="text-center">
              <HiOutlineExclamationCircle className="h-14 w-14 text-gray-400 mb-4 mx-auto" />
              <h3 className="mb-5 text-lg text-gray-500">
                Are you sure you want to delete your account?
              </h3>
              <div className="flex justify-center gap-4">
                <Button color="failure" onClick={handleDeleteUser}>
                  Yes, I'm sure
                </Button>
                <Button color="gray" onClick={() => setShowModal(false)}>
                  No, Cancel
                </Button>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </>
  );
}
