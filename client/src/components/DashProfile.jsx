import imageCompression from "browser-image-compression";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, TextInput, Modal } from "flowbite-react";
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
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Link } from "react-router-dom";

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
  }, [imageFile]);

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
    <div className="max-w-lg mx-auto p-3 w-full">
      <h1 className="my-7 text-center font-semibold text-3xl ">
        welcome {currentUser.role}!
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={filePickerRef}
          hidden
        />
        <div
          className="relative w-32 h-32 self-center cursor-pointer shadow-md overflow-hidden rounded-full"
          onClick={() => {
            filePickerRef.current.click();
          }}
        >
          {/* 👇 Loader overlays image ONLY while uploading */}
          {isUploading && (
            <ImageCircleLoader progress={imageFileUploadingProgress || 0} />
          )}
          <img
            src={imageFileUrl || currentUser.profilePicture}
            alt="user"
            className={`rounded-full w-full h-full object-cover border-8 border-[#DEF7EC]`}
          />
        </div>
        {imageFileUploadingError && (
          <Alert color="failure"> {imageFileUploadingError}</Alert>
        )}
        <TextInput
          type="text"
          id="userName"
          placeholder="userName"
          defaultValue={currentUser.userName}
          onChange={handleChange}
        />
        <TextInput
          type="email"
          id="email"
          placeholder="email"
          defaultValue={currentUser.email}
          onChange={handleChange}
        />
        <TextInput
          type="text"
          id="password"
          placeholder="password"
          onChange={handleChange}
        />
        <Button
          type="submit"
          className="bg-gradient-to-br from-purple-600 to-blue-500 text-white hover:bg-gradient-to-bl focus:ring-blue-300 dark:focus:ring-blue-800"
          outline
          disabled={loading || imageFileUploading}
        >
          {loading ? "loading..." : "Update"}
        </Button>

        {/* Standardized Dashboard Actions */}
        <div className="flex flex-col gap-3">
          {/* Restaurants - SuperAdmin & Admin */}
          {(currentUser.role === "superAdmin" ||
            currentUser.role === "admin") && (
            <Link to="/create-restaurant">
              <Button className="w-full bg-gradient-to-r from-green-400 to-blue-600">
                {currentUser.role === "superAdmin"
                  ? "Manage All Restaurants"
                  : "Create New Restaurant"}
              </Button>
            </Link>
          )}

          {/* Store Manager - Only Admin */}
          {currentUser.role === "admin" && (
            <Link to="/create-storeManager">
              <Button className="w-full bg-gradient-to-br from-purple-600 to-blue-500">
                Create Store Manager
              </Button>
            </Link>
          )}

          {/* Food & Categories - Everyone except regular users */}
          {["superAdmin", "admin", "storeManager"].includes(
            currentUser.role
          ) && (
            <div className="flex gap-3">
              <Link to="/dashboard?tab=foods" className="flex-1">
                <Button color="gray" className="w-full">
                  Create Food
                </Button>
              </Link>
              <Link to="/dashboard?tab=categories" className="flex-1">
                <Button color="gray" className="w-full">
                  Create Category
                </Button>
              </Link>
            </div>
          )}
        </div>
      </form>
      <div className="text-red-500 flex justify-between mt-5 items-center">
        <span onClick={() => setShowModal(true)} className="cursor-pointer">
          Delete Account
        </span>
        {/* <span
          className="cursor-pointer p-2 px-4 rounded-lg bg-blue-500 text-white"
          onClick={() => {
            filePickerRef.current.click();
          }}
        >
          Change Image
        </span> */}
        <span onClick={handleSignOut} className="cursor-pointer ">
          Sign out
        </span>
      </div>
      {updateUserSuccess && (
        <Alert color="success" className="mt-5">
          {updateUserSuccess}
        </Alert>
      )}
      {updateUserError && (
        <Alert color="failure" className="mt-5">
          {updateUserError}
        </Alert>
      )}
      {error && (
        <Alert color="failure" className="mt-5">
          {error}
        </Alert>
      )}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        popup
        size="md"
      >
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="h-14 w-14 text-gray-400 dark:text-gray-200 mb-4 mx-auto" />
            <h3 className="mb-5 text-lg text-gray-500 dark:text-gray-400">
              Are you sure, you want to delete your account?
            </h3>
            <div className="flex flex-row justify-center gap-4">
              <Button color="failure" className="" onClick={handleDeleteUser}>
                Yes, I'm sure
              </Button>
              <Button
                color="gray"
                className=""
                onClick={() => setShowModal(false)}
              >
                No, Cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
