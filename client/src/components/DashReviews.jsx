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
  Table,
  Textarea
} from 'flowbite-react';
import { HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

const REVIEW_FILTER_LIMIT = 50;

const emptyReviewForm = {
  restaurantId: '',
  rating: '5',
  comment: ''
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : 'Unknown';

export default function DashReviews() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(user?.restaurantId || '');
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [editingReview, setEditingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canCreateReview = hasPermission(user, 'review', 'create');
  const canUpdateReview = hasPermission(user, 'review', 'update');
  const canDeleteReview = hasPermission(user, 'review', 'delete');
  const canModerateReview = hasPermission(user, 'review', 'moderate');
  const canReadOwnReviews = hasPermission(user, 'review', 'readMine');

  const isCustomer = user?.role === 'user';
  const canBrowseRestaurantReviews =
    canModerateReview || user?.role === 'storeManager' || user?.role === 'superAdmin';

  const loadRestaurants = useCallback(async () => {
    if (isCustomer) {
      const data = await apiGet(`/api/restaurants?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (user?.role === 'superAdmin') {
      const data = await apiGet(`/api/restaurants/all?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (user?.role === 'admin') {
      const data = await apiGet(`/api/restaurants/me/all?page=1&limit=${REVIEW_FILTER_LIMIT}`);
      return data.data || [];
    }

    if (user?.role === 'storeManager' && user?.restaurantId) {
      const data = await apiGet(`/api/restaurants/id/${user.restaurantId}`);
      return data.data ? [data.data] : [];
    }

    return [];
  }, [isCustomer, user?.restaurantId, user?.role]);

  const loadReviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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

      if (defaultRestaurantId && (canBrowseRestaurantReviews || isCustomer)) {
        const [reviewList, reviewSummary] = await Promise.all([
          apiGet(`/api/reviews/restaurant/${defaultRestaurantId}?page=1&limit=20`),
          apiGet(`/api/reviews/restaurant/${defaultRestaurantId}/summary`)
        ]);
        setReviews(reviewList.data || []);
        setSummary(reviewSummary.data || reviewSummary);
      } else {
        setReviews([]);
        setSummary(null);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [
    canBrowseRestaurantReviews,
    canReadOwnReviews,
    isCustomer,
    loadRestaurants,
    selectedRestaurantId,
    user?.restaurantId
  ]);

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

  const handleCreateReview = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPost(`/api/reviews/restaurant/${reviewForm.restaurantId}`, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
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

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm('Delete this review?');
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/reviews/${reviewId}`);
      setSuccess('Review deleted successfully.');
      await loadReviewData();
    } catch (deleteError) {
      setError(deleteError.message);
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

  return (
    <div className="space-y-5">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
              Review workspace
            </p>
            <h2 className="text-2xl font-bold text-[#23411f]">
              {canModerateReview
                ? 'Review moderation'
                : isCustomer
                  ? 'Your ratings and comments'
                  : 'Restaurant feedback'}
            </h2>
            <p className="text-sm text-gray-500">
              {canModerateReview
                ? 'Approve or hide reviews for the restaurants in your scope.'
                : 'See the feedback connected to your account and restaurant scope.'}
            </p>
          </div>

          {(canBrowseRestaurantReviews || isCustomer) && (
            <div className="space-y-2">
              <Label htmlFor="reviewRestaurant">Restaurant</Label>
              <Select
                id="reviewRestaurant"
                value={selectedRestaurantId}
                onChange={(event) => setSelectedRestaurantId(event.target.value)}
                disabled={restaurants.length === 0}
              >
                <option value="">Select restaurant</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {summary && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbef] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7e9128]">Rating</p>
                <p className="mt-1 text-2xl font-bold text-[#23411f]">
                  {summary.averageRating || summary.rating || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fff5f5] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#b62828]">Reviews</p>
                <p className="mt-1 text-2xl font-bold text-[#5c1111]">
                  {summary.totalReviews || summary.reviewCount || reviews.length}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8f7f1] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7a7a6b]">Scope</p>
                <p className="mt-1 text-sm font-semibold text-[#23411f]">
                  {selectedRestaurant?.name || 'No restaurant selected'}
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f7fbef] p-4 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading review data...
            </div>
          )}
        </Card>

        {canCreateReview && (
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#23411f]">Post a review</h3>
              <p className="text-sm text-gray-500">
                Public users can leave a rating and comment for restaurants.
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
                <Label htmlFor="newReviewRating">Rating</Label>
                <Select
                  id="newReviewRating"
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      rating: event.target.value
                    }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} star{rating > 1 ? 's' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newReviewComment">Comment</Label>
                <Textarea
                  id="newReviewComment"
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      comment: event.target.value
                    }))
                  }
                  placeholder="Tell other diners what stood out."
                />
              </div>
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">Your reviews</h3>
              <p className="text-sm text-gray-500">
                Edit or remove the feedback you have already posted.
              </p>
            </div>
            <Badge color="failure">{myReviews.length}</Badge>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>Restaurant</Table.HeadCell>
                <Table.HeadCell>Rating</Table.HeadCell>
                <Table.HeadCell>Comment</Table.HeadCell>
                <Table.HeadCell>Date</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {myReviews.map((review) => (
                  <Table.Row key={review._id}>
                    <Table.Cell>{review.restaurantId?.name || 'Restaurant'}</Table.Cell>
                    <Table.Cell>{review.rating}/5</Table.Cell>
                    <Table.Cell className="max-w-md text-sm text-gray-600">
                      {review.comment || 'No comment'}
                    </Table.Cell>
                    <Table.Cell>{formatDate(review.createdAt)}</Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-2">
                        {canUpdateReview && (
                          <Button
                            color="light"
                            size="xs"
                            onClick={() =>
                              setEditingReview({
                                _id: review._id,
                                rating: String(review.rating),
                                comment: review.comment || ''
                              })
                            }
                          >
                            <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {canDeleteReview && (
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() => handleDeleteReview(review._id)}
                          >
                            <HiOutlineTrash className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Card>
      )}

      {(canBrowseRestaurantReviews || (!isCustomer && reviews.length > 0)) && (
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">Restaurant reviews</h3>
              <p className="text-sm text-gray-500">
                {canModerateReview
                  ? 'Moderate customer feedback for the selected restaurant.'
                  : 'Read the latest feedback for the selected restaurant.'}
              </p>
            </div>
            <Badge color="failure">{reviews.length}</Badge>
          </div>

          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="rounded-2xl border border-[#ebf0d7] bg-[#fbfcf7] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#23411f]">
                      {review.userId?.userName || 'Guest'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={review.isActive ? 'success' : 'failure'}>
                      {review.isActive ? 'Visible' : 'Hidden'}
                    </Badge>
                    <Badge color="gray">{review.rating}/5</Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">{review.comment || 'No comment'}</p>
                {canModerateReview && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      color="success"
                      onClick={() => handleModerateReview(review._id, true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      color="failure"
                      onClick={() => handleModerateReview(review._id, false)}
                    >
                      Hide
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal show={Boolean(editingReview)} onClose={() => setEditingReview(null)}>
        <Modal.Header>Edit review</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editReviewRating">Rating</Label>
              <Select
                id="editReviewRating"
                value={editingReview?.rating || '5'}
                onChange={(event) =>
                  setEditingReview((current) => ({
                    ...current,
                    rating: event.target.value
                  }))
                }
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} star{rating > 1 ? 's' : ''}
                  </option>
                ))}
              </Select>
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
    </div>
  );
}
