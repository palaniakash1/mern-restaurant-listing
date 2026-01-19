import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Table, Alert } from "flowbite-react";
import { Button, Spinner, Modal } from "flowbite-react";
import imageCompression from "browser-image-compression";
import {
  updateStart,
  updateSuccess,
  updateFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
} from "../redux/user/userSlice";
import { useDispatch } from "react-redux";

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import ImageCircleLoader from "../components/ImageCircleLoader";

import {
  HiOutlineX,
  HiPencilAlt,
  HiTrash,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

export default function DashUsers() {
  const { currentUser } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUploadingProgress, setImageFileUploadingProgress] =
    useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);

  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(null);
  const dispatch = useDispatch();
  const [imageFileUploadingError, setImageFileUploadingError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});

  const [updateUserError, setUpdateUserError] = useState(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [updateUserSuccess, setUpdateUserSuccess] = useState(null);

  const filePickerRef = useRef();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/user/all-users?page=${page}&limit=${limit}`,
          { credentials: "include" }
        );
        const data = await res.json();

        if (res.ok) {
          setUsers(data.data);
          setTotalPages(Math.ceil(data.totalUser / limit));
          setTotalUsers(data.totalUser);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser.role === "superAdmin") {
      fetchUsers();
    }
  }, [currentUser?.role, page, limit]);

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

  // =================================================
  // DrawerOpen Module
  // =================================================

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setFormData({
      userName: user.userName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
    });
    // Reset status messages when opening for a new user
    setUpdateUserError(null);
    setUpdateUserSuccess(null);
  };

  // =================================================
  // capture change Module
  // =================================================

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  console.log(formData);

  // =================================================
  // Update Module
  // =================================================

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      setUpdateUserError(null);
      // setUpdateUserSuccess(null);
      if (Object.keys(formData).length === 0) {
        setUpdateUserError(`No changes made to update`);
        return;
      }

      if (imageFileUploading) {
        setUpdateUserError("please wait for the image to uploaded");
        return;
      }

      dispatch(updateStart());
      const res = await fetch(`/api/user/update/${selectedUser._id}`, {
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
      // BUG FIX: Update the local users list so the table reflects changes instantly
      setUsers((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id ? { ...u, ...formData } : u
        )
      );

      // Optional: Close drawer after delay
      setTimeout(() => setIsDrawerOpen(false), 2000);
    } catch (error) {
      dispatch(updateFailure(error.message));
      setUpdateUserError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =================================================
  // Delete user Module
  // =================================================
  const handleDeleteUser = async () => {
    try {
      const res = await fetch(`/api/user/delete/${selectedUser._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      // ✅ Update UI instantly
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));

      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      setError(error.message);
    }
  };

  // =================================================
  // pagination Module
  // =================================================

  const getPagination = (current, total) => {
    const pages = new Set();

    pages.add(1);
    pages.add(total);

    for (let i = current - 1; i <= current + 1; i++) {
      if (i > 1 && i < total) {
        pages.add(i);
      }
    }

    return [...pages].sort((a, b) => a - b);
  };

  return (
    <div className="p-3 w-full">
      {error && (
        <Alert
          color="failure"
          onDismiss={() => setError(null)}
          className="mb-4"
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          color="success"
          onDismiss={() => setSuccess(null)}
          className="mb-4"
        >
          {success}
        </Alert>
      )}
      {/* TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 bg-[#8fa31e] text-white flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase">System Users</h2>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
            {totalUsers} users
          </span>
        </div>
        <Table hoverable className="shadow-md bg-white min-w-[900px]">
          <Table.Head>
            <Table.HeadCell>Profile</Table.HeadCell>
            <Table.HeadCell>Username</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Role</Table.HeadCell>
            {/* <Table.HeadCell>Edit</Table.HeadCell> */}
            <Table.HeadCell>Delete</Table.HeadCell>
          </Table.Head>

          <Table.Body className="divide-y">
            {users.map((user) => (
              <Table.Row key={user._id} onClick={() => handleEditClick(user)}>
                <Table.Cell>
                  <img
                    src={user.profilePicture}
                    alt={user.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Table.Cell>

                <Table.Cell className="font-medium text-gray-900">
                  {user.userName}
                </Table.Cell>

                <Table.Cell>{user.email}</Table.Cell>

                <Table.Cell>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-bold ${
                      user.role === "superAdmin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role.toUpperCase()}
                  </span>
                </Table.Cell>

                {/* <Table.Cell>
                  <button
                    onClick={() => handleEditClick(user)}
                    className="text-[#8fa31e] flex items-center gap-1 font-bold"
                  >
                    <HiPencilAlt /> Edit
                  </button>
                </Table.Cell> */}

                <Table.Cell>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowModal(true);
                    }}
                    className="text-red-600 flex items-center gap-1 font-bold text-center justify-center"
                  >
                    <HiTrash />
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {loading && (
          <p className="text-center py-6 text-gray-500 w-full bg-white">
            Loading users...
          </p>
        )}
        {/* ADVANCED PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 my-8 flex-wrap">
            {/* PREV */}
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={`
        px-4 py-2 rounded-md border text-sm font-medium
        transition-all
        ${
          page === 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-[#CC0001]"
        }
      `}
            >
              &lt; Prev
            </button>

            {/* PAGE NUMBERS */}
            {getPagination(page, totalPages).map((p, index, arr) => {
              const prev = arr[index - 1];

              return (
                <React.Fragment key={p}>
                  {/* DOTS */}
                  {prev && p - prev > 1 && (
                    <span className="px-2 text-gray-400 select-none">…</span>
                  )}

                  {/* PAGE BUTTON */}
                  <button
                    onClick={() => setPage(p)}
                    className={`
              w-10 h-10 rounded-md flex items-center justify-center
              text-sm font-semibold transition-all
              ${
                page === p
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white border hover:bg-gray-100"
              }
            `}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

            {/* NEXT */}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`
        px-4 py-2 rounded-md border text-sm font-medium
        transition-all
        ${
          page === totalPages
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-[#CC0001]"
        }
      `}
            >
              Next &gt;
            </button>
          </div>
        )}
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden flex flex-col gap-4">
        {loading && (
          <p className="text-center py-6 text-gray-500">Loading users...</p>
        )}
        {users.map((user) => (
          <div
            key={user._id}
            className="bg-white rounded-lg shadow-md p-4 flex gap-4 items-start"
          >
            <img
              src={user.profilePicture}
              alt={user.userName}
              className="w-12 h-12 rounded-full object-cover"
            />

            <div className="flex-1 space-y-1">
              <p className="font-semibold text-gray-900">{user.userName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>

              <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100">
                {user.role}
              </span>

              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => handleEditClick(user)}
                  className="text-[#8fa31e] flex items-center gap-1 font-bold"
                >
                  <HiPencilAlt /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className=" w-1/2 flex items-center justify-center gap-2 !bg-[#CC0001] hover:!bg-[#ea2020] text-white px-4 py-2 rounded-[4px] font-medium transition-colors"
                >
                  <HiTrash className="text-lg" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`px-3 py-1 border rounded ${
                    page === pageNumber
                      ? "bg-emerald-500 text-white"
                      : "bg-white"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
      {/* DRAWER OVERLAY */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isDrawerOpen
            ? "bg-black/40 opacity-100"
            : "bg-transparent opacity-0 pointer-events-none"
        }`}
      >
        {/* DRAWER PANEL */}
        <div
          className={`absolute top-0 right-0 w-full max-w-sm h-full bg-white shadow-2xl
    transition-transform duration-500 ${
      isDrawerOpen ? "translate-x-0" : "translate-x-full"
    }`}
        >
          {selectedUser && (
            <div className="p-6 h-full flex flex-col">
              {/* HEADER */}
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h3 className="text-xl font-bold">Edit User</h3>
                <button onClick={() => setIsDrawerOpen(false)}>
                  <HiOutlineX />
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleUpdateUser} className="space-y-4 flex-1">
                {/* IMAGE */}
                <div
                  className="relative w-32 h-32 mx-auto cursor-pointer"
                  onClick={() => filePickerRef.current.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={filePickerRef}
                    onChange={handleImageChange}
                    hidden
                  />
                  <img
                    src={selectedUser.profilePicture}
                    alt="user"
                    className="w-full h-full rounded-full object-cover border"
                  />
                </div>

                {/* USERNAME */}
                <input
                  id="userName"
                  value={formData.userName || ""}
                  onChange={handleChange}
                  className="w-full p-3 border rounded"
                  placeholder="Username"
                />

                {/* EMAIL */}
                <input
                  id="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  className="w-full p-3 border rounded"
                  placeholder="Email"
                />

                {/* ROLE */}
                <select
                  id="role"
                  value={formData.role || "user"}
                  onChange={handleChange}
                  className="w-full p-3 border rounded"
                >
                  <option value="superAdmin">SuperAdmin</option>
                  <option value="admin">Admin</option>
                  <option value="storeManager">Store Manager</option>
                  <option value="user">User</option>
                </select>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full !bg-[#8fa31e]"
                  
                >
                  {loading ? <Spinner size="sm" /> : "Edit User"}
                </Button>

              </form>
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
                      Are you sure you want to delete this user?
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
          )}
        </div>
      </div>
    </div>
  );
}
