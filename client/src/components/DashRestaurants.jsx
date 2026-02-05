import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Table,
  Button,
  TextInput,
  Textarea,
  Alert,
  Spinner,
} from "flowbite-react";
import imageCompression from "browser-image-compression";
import { HiPencilAlt, HiTrash, HiOutlineX } from "react-icons/hi";

export default function DashRestaurants() {
  const { currentUser } = useSelector((state) => state.user);

  const [restaurants, setRestaurants] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [formData, setFormData] = useState({});
  const [imageFileUploadingError, setImageFileUploadingError] = useState(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);

  const filePickerRef = useRef();

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

  /* =========================
     FETCH RESTAURANTS
  ========================= */
  useEffect(() => {
    if (currentUser.role === "admin") {
      const fetchRestaurants = async () => {
        try {
          setLoading(true);
          const res = await fetch(
            `/api/restaurant/my`,
            { credentials: "include" }
          );
          const data = await res.json();

          if (!res.ok) throw new Error(data.message);

          setRestaurants(data.data);
          setTotalPages(Math.ceil(data.total / limit));
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRestaurants();
    }
  }, [currentUser.role, page]);

  useEffect(() => {
    if (currentUser.role === "superAdmin") {
      const fetchRestaurants = async () => {
        try {
          setLoading(true);
          const res = await fetch(
            `/api/restaurant/all-restaurants?page=${page}&limit=${limit}`,
            { credentials: "include" }
          );
          const data = await res.json();

          if (!res.ok) throw new Error(data.message);

          setRestaurants(data.data);
          setTotalPages(Math.ceil(data.total / limit));
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRestaurants();
    }
  }, [currentUser.role, page]);

  /* =========================
     EDIT
  ========================= */
  const openEditDrawer = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      tagline: restaurant.tagline,
      description: restaurant.description,
      email: restaurant.email,
      contactNumber: restaurant.contactNumber,
    });
    setIsDrawerOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(
        `/api/restaurant/update/${selectedRestaurant._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setRestaurants((prev) =>
        prev.map((r) => (r._id === data.data._id ? data.data : r))
      );

      setSuccess("Restaurant updated successfully");
      setIsDrawerOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id) => {
    if (!confirm("Delete this restaurant permanently?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/restaurant/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setRestaurants((prev) => prev.filter((r) => r._id !== id));
      setSuccess("Restaurant deleted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     PAGINATION UTILS
  ========================= */
  const getPages = () => {
    const pages = new Set([1, totalPages]);
    for (let i = page - 1; i <= page + 1; i++) {
      if (i > 1 && i < totalPages) pages.add(i);
    }
    return [...pages].sort((a, b) => a - b);
  };

  /* =========================
     UI
  ========================= */
  if (currentUser.role !== "superAdmin") {
    return (
      <p className="p-6 text-center text-gray-500">
        You are not authorized to view this page.
      </p>
    );
  }

  return (
    <div className="p-4 w-full">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <div className="p-5 bg-[#8fa31e] text-white flex justify-between">
          <h2 className="text-xl font-bold uppercase">All Restaurants</h2>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            {restaurants.length} shown
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Spinner size="xl" />
          </div>
        ) : (
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Logo</Table.HeadCell>
              <Table.HeadCell>Name</Table.HeadCell>
              <Table.HeadCell>Tagline</Table.HeadCell>
              <Table.HeadCell>Contact</Table.HeadCell>
              <Table.HeadCell>Actions</Table.HeadCell>
            </Table.Head>
            <Table.Body>
              {restaurants.map((r) => (
                <Table.Row key={r._id}>
                  <Table.Cell>
                    <img
                      src={r.imageLogo}
                      alt="logo"
                      className="w-12 h-12 rounded object-cover"
                    />
                  </Table.Cell>
                  <Table.Cell className="font-semibold">{r.name}</Table.Cell>
                  <Table.Cell className="text-gray-500">{r.tagline}</Table.Cell>
                  <Table.Cell>{r.contactNumber}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditDrawer(r)}
                        className="text-[#8fa31e] font-semibold flex items-center gap-1"
                      >
                        <HiPencilAlt /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-600 font-semibold flex items-center gap-1"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {getPages().map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && p - arr[i - 1] > 1 && <span>…</span>}
              <button
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded border ${
                  page === p ? "bg-emerald-600 text-white" : ""
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* DRAWER */}
      <div
        className={`fixed inset-0 z-50 transition ${
          isDrawerOpen
            ? "bg-black/40 opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h3 className="text-xl font-bold">Edit Restaurant</h3>
              <button onClick={() => setIsDrawerOpen(false)}>
                <HiOutlineX />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="space-y-4 flex-1 overflow-y-auto"
            >
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
                  src={selectedRestaurant.imageLogo}
                  alt="user"
                  className="w-full h-full rounded-full object-cover border"
                />
              </div>
              <TextInput
                id="name"
                value={formData.name || ""}
                onChange={handleChange}
                placeholder="Name"
                required
              />
              <TextInput
                id="tagline"
                value={formData.tagline || ""}
                onChange={handleChange}
                placeholder="Tagline"
              />
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={3}
                placeholder="Description"
              />
              <TextInput
                id="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="Email"
              />
              <TextInput
                id="contactNumber"
                value={formData.contactNumber || ""}
                onChange={handleChange}
                placeholder="Phone"
              />
              <Button type="submit" className="w-full !bg-[#8fa31e]">
                Save Changes
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
