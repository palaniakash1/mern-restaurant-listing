import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Badge, Button, Modal, Spinner, Table } from "flowbite-react";
import { HiOutlineTrash, HiOutlineUpload, HiX } from "react-icons/hi";
import AddressAutocomplete from "./AddressAutocomplete";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { buildCsrfHeaders } from "../utils/http";

const initialFormState = {
  name: "",
  tagline: "",
  description: "",
  contactNumber: "",
  email: "",
  website: "",
  adminId: "",
  imageLogo: "",
  gallery: [],
  videoUrl: "",
  address: {
    addressLine1: "",
    addressLine2: "",
    areaLocality: "",
    city: "",
    countyRegion: "",
    postcode: "",
    country: "United Kingdom",
  },
  location: null,
};

const emptyFsaState = {
  loading: false,
  error: null,
  matched: false,
  result: null,
  options: [],
  selected: null,
  score: null,
};

const buildAddressSearchValue = (address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.areaLocality,
    address.city,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");

const formatRestaurantAddress = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.areaLocality,
    address.city,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");

const getSelectableFsaOptions = (result, options) => {
  const merged = [];
  const seen = new Set();

  [result, ...(options || [])].forEach((option) => {
    if (!option?.fhrsId || seen.has(option.fhrsId)) {
      return;
    }

    seen.add(option.fhrsId);
    merged.push(option);
  });

  return merged;
};

export default function DashRestaurants() {
  const { currentUser } = useSelector((state) => state.user);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [addressSearch, setAddressSearch] = useState("");
  const [fsaState, setFsaState] = useState(emptyFsaState);
  const [mediaUploading, setMediaUploading] = useState({
    logo: false,
    gallery: false,
    video: false,
  });
  const [mediaError, setMediaError] = useState(null);

  const canManageRestaurants = ["admin", "superAdmin"].includes(currentUser?.role);
  const canAssignAdmin = currentUser?.role === "superAdmin";
  const selectableFsaOptions = useMemo(
    () => getSelectableFsaOptions(fsaState.result, fsaState.options),
    [fsaState.result, fsaState.options],
  );

  const listEndpoint = useMemo(() => {
    if (currentUser?.role === "superAdmin") {
      return `/api/restaurants/all?page=${page}&limit=10`;
    }

    if (currentUser?.role === "admin") {
      return `/api/restaurants/me/all?page=${page}&limit=10`;
    }

    return null;
  }, [currentUser?.role, page]);

  const resetCreateForm = () => {
    setFormData(initialFormState);
    setAddressSearch("");
    setFsaState(emptyFsaState);
    setMediaUploading({
      logo: false,
      gallery: false,
      video: false,
    });
    setMediaError(null);
    setError(null);
  };

  const fetchRestaurants = useCallback(async () => {
    if (!listEndpoint) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(listEndpoint, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load restaurants");
      }

      setRestaurants(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [listEndpoint]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    const shouldSearch = formData.name.trim().length >= 2;

    if (!shouldSearch || !isCreateOpen) {
      setFsaState((current) => ({
        ...emptyFsaState,
        selected: current.selected,
      }));
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setFsaState((current) => ({
          ...current,
          loading: true,
          error: null,
        }));

        const query = new URLSearchParams({
          name: formData.name.trim(),
        });

        if (formData.address.postcode.trim()) {
          query.set("postcode", formData.address.postcode.trim());
        }

        const res = await fetch(`/api/fsa/search?${query.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to search FSA");
        }

        const payload = data.data || {};
        setFsaState((current) => {
          const availableOptions = getSelectableFsaOptions(
            payload.result || null,
            payload.multipleOptions || [],
          );
          const preservedSelection =
            current.selected &&
            availableOptions.find(
              (option) => option.fhrsId === current.selected.fhrsId,
            );

          return {
            loading: false,
            error: null,
            matched: Boolean(payload.matched),
            result: payload.result || null,
            options: availableOptions,
            selected: preservedSelection || null,
            score: payload.score ?? null,
          };
        });
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setFsaState((current) => ({
            ...current,
            loading: false,
            error: fetchError.message,
            matched: false,
            result: null,
            options: [],
          }));
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [formData.name, formData.address.postcode, isCreateOpen]);

  const updateAddress = (field, value) => {
    setFormData((current) => ({
      ...current,
      address: {
        ...current.address,
        [field]: value,
      },
    }));
  };

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const setUploadingState = (field, value) => {
    setMediaUploading((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setMediaError(null);
      setUploadingState("logo", true);
      const uploaded = await uploadToCloudinary({
        file,
        folder: "restaurants/logos",
        resourceType: "image",
        publicIdPrefix: "restaurant-logo",
      });

      setFormData((current) => ({
        ...current,
        imageLogo: uploaded.url,
      }));
    } catch (uploadError) {
      setMediaError(uploadError.message);
    } finally {
      setUploadingState("logo", false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = 10 - formData.gallery.length;
    if (remainingSlots <= 0) {
      setMediaError("You can add up to 10 gallery photos.");
      event.target.value = "";
      return;
    }

    try {
      setMediaError(null);
      setUploadingState("gallery", true);
      const uploadTargets = files.slice(0, remainingSlots);
      const uploadedFiles = [];

      for (const file of uploadTargets) {
        const uploaded = await uploadToCloudinary({
          file,
          folder: "restaurants/gallery",
          resourceType: "image",
          publicIdPrefix: "restaurant-gallery",
        });
        uploadedFiles.push(uploaded.url);
      }

      setFormData((current) => ({
        ...current,
        gallery: [...current.gallery, ...uploadedFiles],
      }));
    } catch (uploadError) {
      setMediaError(uploadError.message);
    } finally {
      setUploadingState("gallery", false);
      event.target.value = "";
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setMediaError(null);
      setUploadingState("video", true);
      const uploaded = await uploadToCloudinary({
        file,
        folder: "restaurants/videos",
        resourceType: "video",
        publicIdPrefix: "restaurant-video",
      });

      setFormData((current) => ({
        ...current,
        videoUrl: uploaded.url,
      }));
    } catch (uploadError) {
      setMediaError(uploadError.message);
    } finally {
      setUploadingState("video", false);
      event.target.value = "";
    }
  };

  const removeGalleryImage = (imageUrl) => {
    setFormData((current) => ({
      ...current,
      gallery: current.gallery.filter((item) => item !== imageUrl),
    }));
  };

  const applyAddressSuggestion = (placeDetails) => {
    setAddressSearch(placeDetails.formattedAddress || "");
    setFormData((current) => ({
      ...current,
      address: {
        ...current.address,
        ...placeDetails.address,
      },
      location: placeDetails.location
        ? {
            lat: placeDetails.location.coordinates[1],
            lng: placeDetails.location.coordinates[0],
          }
        : current.location,
    }));
  };

  const applyFsaCandidate = (candidate) => {
    const fsaAddress = candidate.restaurantAddress || {};
    const nextAddress = {
      addressLine1: fsaAddress.addressLine1 || "",
      addressLine2: fsaAddress.addressLine2 || "",
      areaLocality: fsaAddress.areaLocality || "",
      city: fsaAddress.city || "",
      countyRegion: fsaAddress.countyRegion || "",
      postcode: fsaAddress.postcode || "",
      country: fsaAddress.country || "United Kingdom",
    };

    setFsaState((current) => ({
      ...current,
      selected: candidate,
    }));
    setAddressSearch(candidate.addressLabel || buildAddressSearchValue(nextAddress));

    setFormData((current) => ({
      ...current,
      name: candidate.name || current.name,
      address: {
        ...current.address,
        ...nextAddress,
      },
    }));
  };

  const handleCreateRestaurant = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.name.trim() || formData.name.trim().length < 2) {
        throw new Error("Restaurant name must be at least 2 characters");
      }
      if (!formData.address.addressLine1.trim() || formData.address.addressLine1.trim().length < 2) {
        throw new Error("Address line 1 is required (minimum 2 characters)");
      }
      if (!formData.address.areaLocality.trim() || formData.address.areaLocality.trim().length < 2) {
        throw new Error("Area/Locality is required");
      }
      if (!formData.address.city.trim() || formData.address.city.trim().length < 2) {
        throw new Error("City is required");
      }
      if (!formData.address.postcode.trim() || formData.address.postcode.trim().length < 2) {
        throw new Error("Postcode is required");
      }

      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        website: formData.website.trim(),
        imageLogo: formData.imageLogo,
        gallery: formData.gallery,
        videoUrl: formData.videoUrl,
        address: {
          addressLine1: formData.address.addressLine1.trim(),
          addressLine2: formData.address.addressLine2.trim(),
          areaLocality: formData.address.areaLocality.trim(),
          city: formData.address.city.trim(),
          countyRegion: formData.address.countyRegion.trim(),
          postcode: formData.address.postcode.trim(),
          country: formData.address.country.trim() || "United Kingdom",
        },
      };

      if (formData.location) {
        payload.location = formData.location;
      }

    if (canAssignAdmin && formData.adminId.trim()) {
        payload.adminId = formData.adminId.trim();
      }

      if (mediaUploading.logo || mediaUploading.gallery || mediaUploading.video) {
        throw new Error("Please wait for your uploads to finish.");
      }

      if (fsaState.selected?.fhrsId) {
        payload.fsa = {
          fhrsId: fsaState.selected.fhrsId,
          isManuallyLinked: true,
        };
      }

      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: buildCsrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Restaurant create error:", data);
        throw new Error(data.message || "Failed to create restaurant");
      }

      setSuccess("Restaurant created successfully.");
      setIsCreateOpen(false);
      resetCreateForm();
      await fetchRestaurants();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    const shouldDelete = window.confirm(
      "Delete this restaurant? It will be blocked and can be restored later by a super admin.",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/restaurants/id/${restaurantId}`, {
        method: "DELETE",
        credentials: "include",
        headers: buildCsrfHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete restaurant");
      }

      setSuccess("Restaurant deleted successfully.");
      await fetchRestaurants();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (!canManageRestaurants) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        You are not authorized to manage restaurants.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}
      {mediaError && <Alert color="failure">{mediaError}</Alert>}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#dce8ba] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#556b2f]">Restaurants</h2>
          <p className="text-sm text-gray-500">
            Add your place, pick it from the suggestions, and we will fill in what we can.
          </p>
        </div>
        <Button
          className="!bg-[#8fa31e]"
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          Create Restaurant
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce8ba] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#edf3d6] bg-[#f6fdeb] px-5 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#7b8d25]">
              Managed restaurants
            </p>
            <p className="text-xs text-gray-500">{restaurants.length} visible on this page</p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        <Table hoverable>
          <Table.Head>
            <Table.HeadCell>Name</Table.HeadCell>
            <Table.HeadCell>Location</Table.HeadCell>
            <Table.HeadCell>FSA</Table.HeadCell>
            <Table.HeadCell>Status</Table.HeadCell>
            <Table.HeadCell>Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {restaurants.map((restaurant) => (
              <Table.Row key={restaurant._id} className="bg-white">
                <Table.Cell>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{restaurant.name}</p>
                    <p className="text-xs text-gray-500">{restaurant.email || "No email"}</p>
                  </div>
                </Table.Cell>
                <Table.Cell className="max-w-xs text-sm text-gray-600">
                  {formatRestaurantAddress(restaurant.address) || "No address"}
                </Table.Cell>
                <Table.Cell>
                  {restaurant.fhrsId ? (
                    <div className="space-y-1">
                      <Badge color="success">
                        FHRS {restaurant.fsaRating?.value || "Pending"}
                      </Badge>
                      <p className="text-xs text-gray-500">ID: {restaurant.fhrsId}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not linked</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={restaurant.status === "published" ? "success" : "warning"}>
                    {restaurant.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <button
                    type="button"
                    onClick={() => handleDeleteRestaurant(restaurant._id)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    <HiOutlineTrash />
                    Delete
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
            {!loading && restaurants.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} className="py-10 text-center text-sm text-gray-500">
                  No restaurants found yet.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            size="xs"
            color="light"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            size="xs"
            color="light"
            disabled={page === totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Modal show={isCreateOpen} onClose={() => setIsCreateOpen(false)} size="4xl">
        <Modal.Header>Create Restaurant</Modal.Header>
        <Modal.Body>
          <form className="space-y-6" onSubmit={handleCreateRestaurant}>
            <section className="space-y-3 rounded-xl border border-[#edf3d6] bg-[#f9fceb] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#556b2f]">Find your restaurant</h3>
                  <p className="text-sm text-gray-500">
                    Start typing your restaurant name. Choose the right one from the list, or skip this and enter the details yourself.
                  </p>
                </div>
                {fsaState.loading && <Spinner size="sm" />}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Restaurant name</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => handleFieldChange("name", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d9e6a5]"
                    placeholder="Example: Soho Brew Cafe"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Postcode</span>
                  <input
                    value={formData.address.postcode}
                    onChange={(event) => updateAddress("postcode", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#d9e6a5]"
                    placeholder="Optional, but it helps us find the right place faster"
                  />
                </label>
              </div>

              {fsaState.error && <p className="text-sm text-red-600">{fsaState.error}</p>}

              {selectableFsaOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    We found these possible matches. Choose the one that belongs to you.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectableFsaOptions.map((option, index) => (
                      <button
                        key={option.fhrsId}
                        type="button"
                        onClick={() => applyFsaCandidate(option)}
                        className={`rounded-xl border p-4 text-left transition ${
                          fsaState.selected?.fhrsId === option.fhrsId
                            ? "border-[#8fa31e] bg-[#f6fdeb]"
                            : "border-gray-200 bg-white hover:border-[#c7d883]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900">{option.name}</span>
                          {option.rating && <Badge color="success">{option.rating}</Badge>}
                        </div>
                        {index === 0 && fsaState.score && (
                          <p className="mt-2 text-xs font-medium text-[#7b8d25]">
                            Recommended match
                          </p>
                        )}
                        <p className="mt-2 text-sm text-gray-600">
                          {option.addressLabel || "Address unavailable"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">Food hygiene ID: {option.fhrsId}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {fsaState.selected && (
                <div className="rounded-xl border border-[#dce8ba] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Selected: {fsaState.selected.name}
                    </p>
                    {fsaState.selected.rating && (
                      <Badge color="success">Food hygiene rating {fsaState.selected.rating}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    We have filled the form with the details available from this record.
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#556b2f]">Basic details</h3>
                <p className="text-sm text-gray-500">
                  Check what we filled in and add anything missing.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Tagline</span>
                  <input
                    value={formData.tagline}
                    onChange={(event) => handleFieldChange("tagline", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Healthy food, happy people"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Phone</span>
                  <input
                    required
                    value={formData.contactNumber}
                    onChange={(event) => handleFieldChange("contactNumber", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="+44 20 7000 0000"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Description</span>
                  <textarea
                    value={formData.description}
                    onChange={(event) => handleFieldChange("description", event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Tell customers what makes this restaurant special"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="hello@restaurant.com"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Website</span>
                  <input
                    value={formData.website}
                    onChange={(event) => handleFieldChange("website", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="https://restaurant.com"
                  />
                </label>

                {canAssignAdmin && (
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Assign admin ID</span>
                    <input
                      value={formData.adminId}
                      onChange={(event) => handleFieldChange("adminId", event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Optional ObjectId for admin assignment"
                    />
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <h3 className="text-lg font-semibold text-[#556b2f]">Photos and video</h3>
                <p className="text-sm text-gray-500">
                  Add your logo, a few photos, and one short video to make your page feel complete.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Logo</p>
                      <p className="text-sm text-gray-500">Best for your main brand image.</p>
                    </div>
                    {mediaUploading.logo && <Spinner size="sm" />}
                  </div>
                  {formData.imageLogo ? (
                    <img
                      src={formData.imageLogo}
                      alt="Restaurant logo"
                      className="h-28 w-28 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
                      No logo yet
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#8fa31e] px-3 py-2 text-sm font-medium text-white">
                    <HiOutlineUpload />
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Main video</p>
                      <p className="text-sm text-gray-500">One short video, up to 50MB.</p>
                    </div>
                    {mediaUploading.video && <Spinner size="sm" />}
                  </div>
                  {formData.videoUrl ? (
                    <video
                      src={formData.videoUrl}
                      controls
                      className="h-40 w-full rounded-xl bg-black object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
                      No video uploaded yet
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#8fa31e] px-3 py-2 text-sm font-medium text-white">
                      <HiOutlineUpload />
                      Upload video
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoUpload}
                      />
                    </label>
                    {formData.videoUrl && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange("videoUrl", "")}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Gallery photos</p>
                    <p className="text-sm text-gray-500">
                      Add up to 10 photos of your food, space, or team.
                    </p>
                  </div>
                  {mediaUploading.gallery && <Spinner size="sm" />}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {formData.gallery.map((imageUrl) => (
                    <div key={imageUrl} className="relative">
                      <img
                        src={imageUrl}
                        alt="Restaurant gallery"
                        className="h-28 w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(imageUrl)}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-700 shadow"
                      >
                        <HiX />
                      </button>
                    </div>
                  ))}

                  {formData.gallery.length === 0 && (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
                      No gallery photos yet
                    </div>
                  )}
                </div>

                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-[#8fa31e] px-3 py-2 text-sm font-medium text-white">
                  <HiOutlineUpload />
                  Add gallery photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryUpload}
                  />
                </label>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <h3 className="text-lg font-semibold text-[#556b2f]">Address</h3>
                <p className="text-sm text-gray-500">
                  Search for your address, or type it in yourself if you prefer.
                </p>
              </div>

              <AddressAutocomplete
                value={addressSearch}
                onChange={setAddressSearch}
                onSelect={applyAddressSuggestion}
              />

              {formData.location && (
                <div className="rounded-lg border border-[#dce8ba] bg-white px-3 py-2 text-sm text-gray-600">
                  Location saved for map use: {formData.location.lat}, {formData.location.lng}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Address line 1</span>
                  <input
                    required
                    value={formData.address.addressLine1}
                    onChange={(event) => updateAddress("addressLine1", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Address line 2</span>
                  <input
                    value={formData.address.addressLine2}
                    onChange={(event) => updateAddress("addressLine2", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Area / locality</span>
                  <input
                    required
                    value={formData.address.areaLocality}
                    onChange={(event) => updateAddress("areaLocality", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">City</span>
                  <input
                    required
                    value={formData.address.city}
                    onChange={(event) => updateAddress("city", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">County / region</span>
                  <input
                    value={formData.address.countyRegion}
                    onChange={(event) => updateAddress("countyRegion", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Country</span>
                  <input
                    value={formData.address.country}
                    onChange={(event) => updateAddress("country", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <Button color="light" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="!bg-[#8fa31e]" isProcessing={submitting}>
                Create restaurant
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
