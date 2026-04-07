import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Modal,
  Select,
  Spinner,
  TextInput,
  Textarea
} from 'flowbite-react';
import {
  HiOutlineCheck,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineEyeSlash,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineXMark
} from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import DeleteConfirmModal from './DeleteConfirmModal';

const REVIEW_FILTER_LIMIT = 50;

const emptyReviewForm = {
  restaurantId: '',
  rating: '5',
  comment: '',
  images: []
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : 'Unknown';

const ImageUploader = ({ images, onChange, maxImages = 3, uploading, onUpload }) => {
  const [previews, setPreviews] = useState(() => 
    images.map((url) => ({ url, isNew: false }))
  );
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  const processFiles = async (files) => {
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newPreviews = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      const preview = await new Promise((resolve) => {
        reader.onload = (e) => resolve({ url: e.target.result, file, isNew: true });
        reader.readAsDataURL(file);
      });
      newPreviews.push(preview);
    }

    if (newPreviews.length > 0) {
      setPreviews((current) => [...current, ...newPreviews]);
      onUpload(newPreviews.map((p) => p.file));
    }
  };

  const removeImage = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews.filter((p) => !p.isNew).map((p) => p.url));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition-colors ${
          dragActive
            ? 'border-[#8fa31e] bg-[#f7fbef]'
            : 'border-[#dce6c1] hover:border-[#8fa31e]'
        } ${images.length >= maxImages ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => images.length < maxImages && document.getElementById('review-image-input')?.click()}
      >
        <input
          id="review-image-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={images.length >= maxImages}
        />
        <HiOutlinePhoto className="h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          {uploading
            ? 'Uploading...'
            : `Add photos (${images.length}/${maxImages})`}
        </p>
        {uploading && <Spinner size="sm" className="mt-2" />}
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview.url}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 rounded-lg object-cover border border-[#dce6c1]"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StarRating = ({ rating, showValue = true }) => {
  const stars = Array.from({ length: 5 }, (_, i) => i < rating);
  return (
    <div className="flex items-center gap-1">
      {stars.map((filled, index) => (
        <HiOutlineStar
          key={index}
          className={`h-4 w-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      {showValue && <span className="ml-1 text-sm font-medium text-gray-600">({rating})</span>}
    </div>
  );
};

const StarRatingInput = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const rating = Number(value) || 0;
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(String(star))}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <HiOutlineStar
            className={`h-6 w-6 transition-colors ${
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const REVIEW_STATUS = {
  all: 'all',
  active: 'active',
  hidden: 'hidden'
};

export default function DashReviews() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [allReviews, setAllReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [editingReview, setEditingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [overviewCounts, setOverviewCounts] = useState({ total: 0, active: 0, hidden: 0 });
  const [imageUploading, setImageUploading] = useState(false);
  const [lightboxImages, setLightboxImages] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [myReviewSearch, setMyReviewSearch] = useState('');
  const [myReviewFilter, setMyReviewFilter] = useState('');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const canCreateReview = hasPermission(user, 'review', 'create');
  const canDeleteReview = hasPermission(user, 'review', 'delete');
  const canReadOwnReviews = hasPermission(user, 'review', 'readMine');

  const isSuperAdmin = user?.role === 'superAdmin';
  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'user';
  const isModerator = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (isModerator) {
      setPage(1);
    }
  }, [selectedRestaurantId, isModerator, sortOrder]);

  const loadRestaurants = useCallback(async () => {
    if (isCustomer) {
      const data = await apiGet(`/api/restaurants?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (isSuperAdmin) {
      const data = await apiGet(`/api/restaurants/all?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (isAdmin) {
      const data = await apiGet(`/api/restaurants/me/all?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (user?.role === 'storeManager' && user?.restaurantId) {
      const data = await apiGet(`/api/restaurants/id/${user.restaurantId}`);
      return data.data ? [data.data] : [];
    }

    return [];
  }, [isCustomer, user?.restaurantId, user?.role, isSuperAdmin, isAdmin]);

  const loadOverviewCounts = useCallback(async () => {
    if (!isModerator) return;
    
    try {
      const countsData = await apiGet('/api/reviews/admin/counts');
      if (countsData.success) {
        setOverviewCounts(countsData.data);
      }
    } catch (countError) {
      console.error('Failed to load overview counts:', countError);
    }
  }, [isModerator]);

  const loadReviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isCustomer) {
        const restaurantList = await loadRestaurants();
        setRestaurants(restaurantList);

        const defaultRestaurantId =
          selectedRestaurantId || user?.restaurantId || restaurantList[0]?._id || '';

        if (!selectedRestaurantId && defaultRestaurantId) {
          setSelectedRestaurantId(defaultRestaurantId);
        }

        if (canReadOwnReviews) {
          const mine = await apiGet('/api/reviews/my?page=1&limit=20');
          setMyReviews(mine.data || []);
        }
      } else if (isModerator) {
        const restaurantList = await loadRestaurants();
        setRestaurants(restaurantList);

        if (isSuperAdmin) {
          const reviewEndpoint = `/api/reviews/all?page=${page}&limit=10&sort=${sortOrder}${selectedRestaurantId ? `&restaurantId=${selectedRestaurantId}` : ''}`;
          const data = await apiGet(reviewEndpoint);
          setAllReviews(data.data || []);
          setTotalPages(Math.max(1, data.totalPages || 1));
          setTotalItems(data.total || 0);
        } else {
          if (selectedRestaurantId) {
            const reviewEndpoint = `/api/reviews/restaurant/${selectedRestaurantId}/all?page=${page}&limit=10&sort=${sortOrder}`;
            const data = await apiGet(reviewEndpoint);
            setAllReviews(data.data || []);
            setTotalPages(Math.max(1, data.totalPages || 1));
            setTotalItems(data.total || 0);
          } else if (user?.restaurantId) {
            const reviewEndpoint = `/api/reviews/restaurant/${user.restaurantId}/all?page=${page}&limit=10&sort=${sortOrder}`;
            const data = await apiGet(reviewEndpoint);
            setAllReviews(data.data || []);
            setTotalPages(Math.max(1, data.totalPages || 1));
            setTotalItems(data.total || 0);
            setSelectedRestaurantId(user.restaurantId);
          } else if (restaurantList.length > 0) {
            const reviewEndpoint = `/api/reviews/restaurant/${restaurantList[0]._id}/all?page=${page}&limit=10&sort=${sortOrder}`;
            const data = await apiGet(reviewEndpoint);
            setAllReviews(data.data || []);
            setTotalPages(Math.max(1, data.totalPages || 1));
            setTotalItems(data.total || 0);
            setSelectedRestaurantId(restaurantList[0]._id);
          }
        }

        await loadOverviewCounts();
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isCustomer, isSuperAdmin, isModerator, loadRestaurants, loadOverviewCounts, selectedRestaurantId, user?.restaurantId, canReadOwnReviews, page, sortOrder]);

  useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  useEffect(() => {
    if (isCustomer) {
      setReviewForm((current) => ({
        ...current,
        restaurantId: selectedRestaurantId
      }));
    }
  }, [isCustomer, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant._id === selectedRestaurantId),
    [restaurants, selectedRestaurantId]
  );

  const filteredReviews = useMemo(() => {
    if (statusFilter === 'all') return allReviews;
    return allReviews.filter(review => 
      statusFilter === 'active' ? review.isActive : !review.isActive
    );
  }, [allReviews, statusFilter]);

  const activeCount = allReviews.filter(r => r.isActive).length;
  const hiddenCount = allReviews.filter(r => !r.isActive).length;

  const handleCreateReview = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const uploadedImages = [];
      if (reviewForm.images && reviewForm.images.length > 0) {
        setImageUploading(true);
        for (const file of reviewForm.images) {
          try {
            const result = await uploadToCloudinary({
              file,
              folder: 'reviews',
              resourceType: 'image',
              publicIdPrefix: 'review'
            });
            uploadedImages.push(result.url);
          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
          }
        }
        setImageUploading(false);
      }

      await apiPost(`/api/reviews/restaurant/${reviewForm.restaurantId}`, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
        images: uploadedImages
      });
      setSuccess('Review submitted successfully.');
      setReviewForm(emptyReviewForm);
      await loadReviewData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (files) => {
    setReviewForm((current) => ({
      ...current,
      images: [...(current.images || []), ...files]
    }));
  };

  const handleImageChange = (urls) => {
    setReviewForm((current) => ({
      ...current,
      images: urls
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingReview?._id) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/reviews/${editingReview._id}`, {
        rating: Number(editingReview.rating),
        comment: editingReview.comment
      });
      setSuccess('Review updated successfully.');
      setEditingReview(null);
      await loadReviewData();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    setReviewToDelete(reviewId);
    setShowDeleteModal(true);
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/reviews/${reviewToDelete}`);
      setSuccess('Review deleted successfully.');
      await loadReviewData();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setShowDeleteModal(false);
      setReviewToDelete(null);
    }
  };

  const handleModerateReview = async (reviewId, isActive) => {
    try {
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/reviews/${reviewId}/moderate`, { isActive });
      setSuccess(`Review ${isActive ? 'approved' : 'hidden'} successfully.`);
      await loadReviewData();
    } catch (moderateError) {
      setError(moderateError.message);
    }
  };

  const handleBulkModerate = async (isActive) => {
    if (selectedReviews.length === 0) return;
    try {
      setError(null);
      setSuccess(null);
      await apiPatch('/api/reviews/bulk-moderate', {
        reviewIds: selectedReviews,
        isActive
      });
      setSuccess(`${selectedReviews.length} review(s) ${isActive ? 'approved' : 'hidden'} successfully.`);
      setSelectedReviews([]);
      await loadReviewData();
    } catch (bulkError) {
      setError(bulkError.message);
    }
  };

  const toggleSelectReview = (reviewId) => {
    setSelectedReviews((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews.map((r) => r._id));
    }
  };

  if (isModerator) {
    return (
      <>
        <div className="space-y-5">
          {error && <Alert color="failure">{error}</Alert>}
          {success && <Alert color="success">{success}</Alert>}

          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                  Review governance
                </p>
                <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
                  {isSuperAdmin ? 'Enterprise review moderation' : 'Restaurant review moderation'}
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-gray-600">
                  {isSuperAdmin
                    ? 'Monitor, approve, and manage customer feedback across all restaurants on the platform.'
                    : 'Monitor, approve, and manage customer feedback for your restaurant.'}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
                  Review overview
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/12 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Total
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {overviewCounts.total}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Visible
                    </p>
                    <p className="mt-2 text-3xl font-bold">{overviewCounts.active}</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Hidden
                    </p>
                    <p className="mt-2 text-3xl font-bold">{overviewCounts.hidden}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#23411f]">
                  Review registry
                </h3>
                <p className="text-sm text-gray-500">
                  Comprehensive review management with moderation controls.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                  value={selectedRestaurantId}
                  onChange={(event) => setSelectedRestaurantId(event.target.value)}
                  disabled={restaurants.length === 0}
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e] min-w-[200px]"
                >
                  <option value="">All Restaurants</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e] min-w-[150px]"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={
                  statusFilter === 'all'
                    ? 'font-semibold text-[#23411f]'
                    : 'text-[#2563eb]'
                }
              >
                All ({allReviews.length})
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={
                  statusFilter === 'active'
                    ? 'font-semibold text-[#23411f]'
                    : 'text-[#2563eb]'
                }
              >
                Visible ({activeCount})
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setStatusFilter('hidden')}
                className={
                  statusFilter === 'hidden'
                    ? 'font-semibold text-[#23411f]'
                    : 'text-[#2563eb]'
                }
              >
                Hidden ({hiddenCount})
              </button>
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
                <Spinner size="sm" />
                Loading reviews...
              </div>
            )}

            {!loading && filteredReviews.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-[#dce6c1] p-8 text-center">
                <HiOutlineStar className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No reviews found</p>
              </div>
            )}

            {!loading && filteredReviews.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                    />
                    Select all ({selectedReviews.length}/{filteredReviews.length})
                  </label>

                  {selectedReviews.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        className="!bg-green-600 hover:!bg-green-700 text-white border-none"
                        onClick={() => handleBulkModerate(true)}
                      >
                        <HiOutlineCheck className="mr-1 h-3 w-3" />
                        Approve ({selectedReviews.length})
                      </Button>
                      <Button
                        size="xs"
                        className="!bg-red-600 hover:!bg-red-700 text-white border-none"
                        onClick={() => handleBulkModerate(false)}
                      >
                        <HiOutlineEyeSlash className="mr-1 h-3 w-3" />
                        Hide ({selectedReviews.length})
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredReviews.map((review) => (
                    <div
                      key={review._id}
                      className={`group relative rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                        selectedReviews.includes(review._id)
                          ? 'border-[#8fa31e] bg-[#f7fbef]'
                          : 'border-[#e6eccf] bg-white'
                      }`}
                    >
                      <div className="absolute left-3 top-3 z-10">
                        <input
                          type="checkbox"
                          checked={selectedReviews.includes(review._id)}
                          onChange={() => toggleSelectReview(review._id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                        />
                      </div>
                      <div className="flex items-start justify-between gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        {review.userId?.profilePicture ? (
                          <img
                            src={review.userId.profilePicture}
                            alt=""
                            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f7faef] text-[#7e9128] font-semibold">
                            {(review.userId?.userName || 'G')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#23411f]">
                            {review.userId?.userName || 'Guest User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {review.restaurantId?.name || 'Restaurant'}
                          </p>
                        </div>
                      </div>
                      <Badge color={review.isActive ? 'success' : 'failure'}>
                        {review.isActive ? 'Visible' : 'Hidden'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <StarRating rating={review.rating} showValue={true} />
                      <span className="text-xs text-gray-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                      {review.comment || 'No comment'}
                    </p>

                    {review.images && review.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setLightboxImages(review.images); setLightboxIndex(0); }}
                            className="relative overflow-hidden rounded-lg"
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-16 w-16 object-cover transition-transform hover:scale-110"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e6eccf] pt-3">
                      {review.isActive ? (
                        <Button
                          size="xs"
                          className="!bg-red-600 hover:!bg-red-700 text-white border-none"
                          onClick={() => handleModerateReview(review._id, false)}
                        >
                          <HiOutlineEyeSlash className="mr-1 h-3 w-3" />
                          Hide
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          className="!bg-green-600 hover:!bg-green-700 text-white border-none"
                          onClick={() => handleModerateReview(review._id, true)}
                        >
                          <HiOutlineCheck className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                      )}
                      {canDeleteReview && (
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <HiOutlineTrash className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}

            <div className="mt-5 space-y-3 md:hidden">
              {filteredReviews.map((review) => (
                <div
                  key={review._id}
                  className="rounded-[1.5rem] border border-[#e6eccf] bg-[#fbfcf7] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#23411f]">
                        {review.userId?.userName || 'Guest User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {review.restaurantId?.name || selectedRestaurant?.name}
                      </p>
                    </div>
                    <Badge color={review.isActive ? 'success' : 'failure'}>
                      {review.isActive ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={review.rating} showValue />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {review.comment || 'No comment'}
                  </p>
                  {review.images && review.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {review.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Review img ${idx + 1}`}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-500">
                Page {page} of {Math.max(1, totalPages)} • {totalItems} {totalItems === 1 ? 'item' : 'items'}
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
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Modal show={Boolean(editingReview)} onClose={() => setEditingReview(null)}>
          <Modal.Header>Edit review</Modal.Header>
          <Modal.Body>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRatingInput
                  value={editingReview?.rating || '5'}
                  onChange={(val) => setEditingReview((current) => ({ ...current, rating: val }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editReviewComment">Comment</Label>
                <Textarea
                  id="editReviewComment"
                  rows={4}
                  value={editingReview?.comment || ''}
                  onChange={(event) =>
                    setEditingReview((current) => ({
                      ...current,
                      comment: event.target.value
                    }))
                  }
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="!bg-[#8fa31e] hover:!bg-[#78871c]"
              onClick={handleSaveEdit}
              isProcessing={submitting}
            >
              Save changes
            </Button>
            <Button color="gray" onClick={() => setEditingReview(null)}>
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>

        {lightboxImages && lightboxImages.length > 0 && (
          <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
            onClick={() => setLightboxImages(null)}
          >
            <div 
              className="relative w-full max-w-5xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImages(null)}
                className="absolute -top-12 right-0 text-gray-600 hover:text-[#23411f] transition-colors"
              >
                <HiOutlineXMark className="h-8 w-8" />
              </button>

              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#dce6c1]">
                <div className="relative aspect-video bg-gradient-to-br from-[#f7faef] to-[#fbfcf7]">
                  <img
                    src={lightboxImages[lightboxIndex]}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                  
                  {lightboxImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === 0 ? lightboxImages.length - 1 : i - 1)); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-[#23411f] hover:bg-[#8fa31e] hover:text-white transition-all"
                      >
                        <HiOutlineChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === lightboxImages.length - 1 ? 0 : i + 1)); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-[#23411f] hover:bg-[#8fa31e] hover:text-white transition-all"
                      >
                        <HiOutlineChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>

                {lightboxImages.length > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-white border-t border-[#dce6c1]">
                    {lightboxImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                        className={`relative overflow-hidden rounded-lg transition-all ${
                          idx === lightboxIndex 
                            ? 'ring-2 ring-[#8fa31e] ring-offset-2' 
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="h-16 w-16 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 bg-[#f7faef] border-t border-[#dce6c1]">
                  <span className="text-sm text-[#23411f] font-medium">
                    {lightboxIndex + 1} of {lightboxImages.length}
                  </span>
                  <span className="text-xs text-gray-500">Click outside to close</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setReviewToDelete(null);
          }}
          onConfirm={confirmDeleteReview}
          title="Delete Review"
          message="Are you sure you want to delete this review? This action cannot be undone."
          confirmText="Yes, Delete Review"
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
        {canCreateReview && (
          <Card className="border !border-[#dce6c1] bg-white shadow-sm xl:col-span-2">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#23411f]">Post a review</h3>
              <p className="text-sm text-gray-500">
                Share your dining experience with other users.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCreateReview}>
              <div className="space-y-2">
                <Label htmlFor="newReviewRestaurant">Restaurant</Label>
                <Select
                  id="newReviewRestaurant"
                  value={reviewForm.restaurantId}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      restaurantId: event.target.value
                    }))
                  }
                  required
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                >
                  <option value="">Choose a restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRatingInput
                  value={reviewForm.rating}
                  onChange={(val) => setReviewForm((current) => ({ ...current, rating: val }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newReviewComment">Comment</Label>
                <Textarea
                  id="newReviewComment"
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      comment: event.target.value
                    }))
                  }
                  placeholder="Tell other diners what stood out."
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
              <div className="space-y-2">
                <Label>Photos (optional)</Label>
                <ImageUploader
                  images={reviewForm.images || []}
                  onChange={handleImageChange}
                  maxImages={3}
                  uploading={imageUploading}
                  onUpload={handleImageUpload}
                />
              </div>
              {error && (
                <Alert color="failure" className="text-sm">
                  {error}
                </Alert>
              )}
              {success && (
                <Alert color="success" className="text-sm">
                  {success}
                </Alert>
              )}
              <Button
                type="submit"
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                isProcessing={submitting}
                disabled={!reviewForm.restaurantId}
              >
                Submit review
              </Button>
            </form>
          </Card>
        )}
      </div>

      {canReadOwnReviews && (
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">Your reviews</h3>
              <p className="text-sm text-gray-500">
                Manage feedback you have posted.
              </p>
            </div>
            {myReviews.length > 0 && <Badge color="failure">{myReviews.length}</Badge>}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <TextInput
              type="text"
              placeholder="Search your reviews..."
              value={myReviewSearch}
              onChange={(e) => setMyReviewSearch(e.target.value)}
              className="flex-1 focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
            />
            <Select
              value={myReviewFilter}
              onChange={(e) => setMyReviewFilter(e.target.value)}
              className="min-w-[200px] focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
            >
              <option value="">All Restaurants</option>
              {myReviews
                .reduce((acc, r) => {
                  const name = r.restaurantId?.name;
                  if (name && !acc.find((n) => n === name)) acc.push(name);
                  return acc;
                }, [])
                .slice(0, 5)
                .map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f7fbef] p-4 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading...
            </div>
          ) : myReviews.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">You haven't posted any reviews yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {myReviews
                .filter((r) => {
                  const matchesSearch = !myReviewSearch || 
                    r.restaurantId?.name?.toLowerCase().includes(myReviewSearch.toLowerCase()) ||
                    r.comment?.toLowerCase().includes(myReviewSearch.toLowerCase());
                  const matchesFilter = !myReviewFilter || r.restaurantId?.name === myReviewFilter;
                  return matchesSearch && matchesFilter;
                })
                .map((review) => (
                  <div
                    key={review._id}
                    className="rounded-2xl border border-[#ebf0d7] bg-[#fbfcf7] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#23411f]">
                          {review.restaurantId?.name || 'Restaurant'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} showValue={true} />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{review.comment || 'No comment'}</p>
                    {review.images && review.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {review.images.slice(0, 3).map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setLightboxImages(review.images); setLightboxIndex(0); }}
                            className="focus:outline-none"
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-12 w-12 rounded object-cover hover:opacity-80 transition-opacity"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {canDeleteReview && (
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <HiOutlineTrash className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      <Modal show={Boolean(editingReview)} onClose={() => setEditingReview(null)}>
        <Modal.Header>Edit review</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRatingInput
                value={editingReview?.rating || '5'}
                onChange={(val) => setEditingReview((current) => ({ ...current, rating: val }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editReviewComment">Comment</Label>
              <Textarea
                id="editReviewComment"
                rows={4}
                value={editingReview?.comment || ''}
                onChange={(event) =>
                  setEditingReview((current) => ({
                    ...current,
                    comment: event.target.value
                  }))
                }
                className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            onClick={handleSaveEdit}
            isProcessing={submitting}
          >
            Save changes
          </Button>
          <Button color="gray" onClick={() => setEditingReview(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {lightboxImages && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
          onClick={() => setLightboxImages(null)}
        >
          <div 
            className="relative w-full max-w-5xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImages(null)}
              className="absolute -top-12 right-0 text-gray-600 hover:text-[#23411f] transition-colors"
            >
              <HiOutlineXMark className="h-8 w-8" />
            </button>

            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#dce6c1]">
              <div className="relative aspect-video bg-gradient-to-br from-[#f7faef] to-[#fbfcf7]">
                <img
                  src={lightboxImages[lightboxIndex]}
                  alt=""
                  className="w-full h-full object-contain"
                />
                
                {lightboxImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === 0 ? lightboxImages.length - 1 : i - 1)); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-[#23411f] hover:bg-[#8fa31e] hover:text-white transition-all"
                    >
                      <HiOutlineChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === lightboxImages.length - 1 ? 0 : i + 1)); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-[#23411f] hover:bg-[#8fa31e] hover:text-white transition-all"
                    >
                      <HiOutlineChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              {lightboxImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 bg-white border-t border-[#dce6c1]">
                  {lightboxImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                      className={`relative overflow-hidden rounded-lg transition-all ${
                        idx === lightboxIndex 
                          ? 'ring-2 ring-[#8fa31e] ring-offset-2' 
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3 bg-[#f7faef] border-t border-[#dce6c1]">
                <span className="text-sm text-[#23411f] font-medium">
                  {lightboxIndex + 1} of {lightboxImages.length}
                </span>
                <span className="text-xs text-gray-500">Click outside to close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
        onConfirm={confirmDeleteReview}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Yes, Delete Review"
      />
    </div>
  );
}
