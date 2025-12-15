import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, TextInput } from "flowbite-react";
import { useSelector } from "react-redux";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import ImageCircleLoader from "../components/ImageCircleLoader";

export default function DashProfile() {
  const { currentUser } = useSelector((state) => state.user);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUploadingError, setImageFileUploadingError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const filePickerRef = useRef();

  console.log(imageFileUploadingProgress, imageFileUploadingError);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ❌ 1. Reject non-image files
    if (!file.type.startsWith("image/")) {
      setImageFileUploadingError("Only image files are allowed.");
      e.target.value = null; // reset input
      return;
    }
    // ✅ 1. Check file size BEFORE upload
    if (file.size > MAX_FILE_SIZE) {
      setImageFileUploadingError("Image must be less than 2MB.");
      e.target.value = null;
      setImageFile(null);
      return; // ❗ STOP here — do not upload
    }

    // ✅ 2. Clear old errors
    setImageFileUploadingError(null);

    // ✅ 3. Accept file
    setImageFile(file);
    setImageFileUrl(URL.createObjectURL(file));
  };

  const uploadImage = useCallback(() => {
    if (!imageFile) return;
    setIsUploading(true); // 👈 START upload UI
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
      () => {
        setIsUploading(false);
        setImageFileUploadingProgress(null);
        setImageFile(null);
        setImageFileUrl(null);
        setImageFileUploadingError(
          `couldn't upload image (image size exceeds 2MB)`
        );
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setImageFileUrl(downloadURL);
          setIsUploading(false);
        });
      }
    );
  }, [imageFile]);

  useEffect(() => {
    if (imageFile) {
      uploadImage();
    }
  }, [imageFile, uploadImage]);

  return (
    <div className="max-w-lg mx-auto p-3 w-full">
      <h1 className="my-7 text-center font-semibold text-3xl ">Profile</h1>
      <form className="flex flex-col gap-4">
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
        />
        <TextInput
          type="email"
          id="email"
          placeholder="email"
          defaultValue={currentUser.email}
        />
        <TextInput type="text" id="password" placeholder="password" />
        <Button
          type="submit"
          className="bg-gradient-to-br from-purple-600 to-blue-500 text-white hover:bg-gradient-to-bl focus:ring-blue-300 dark:focus:ring-blue-800"
          outline
        >
          Update
        </Button>
      </form>
      <div className="text-red-500 flex justify-between mt-5 items-center">
        <span className="cursor-pointer">Delete Account</span>
        <span
          className="cursor-pointer p-2 px-4 rounded-lg bg-blue-500 text-white"
          onClick={() => {
            filePickerRef.current.click();
          }}
        >
          Change Image
        </span>
        <span className="cursor-pointer ">Sign out</span>
      </div>
    </div>
  );
}
