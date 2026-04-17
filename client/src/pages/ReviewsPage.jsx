import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiStar, HiUserCircle } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  joinClasses
} from '../utils/publicPage';
import { apiGet } from '../utils/api';
import { ImageLightbox } from '../components/ImageLightbox';

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const INITIAL_LIMIT = 20;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRating, setFilterRating] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchReviews = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await apiGet(`/api/reviews?page=${pageNum}&limit=${INITIAL_LIMIT}&sort=desc`);
      if (response.success) {
        const newReviews = response.data || [];
        setReviews(prev => append ? [...prev, ...newReviews] : newReviews);
        setTotalPages(response.pages || 1);
        setHasMore(pageNum < (response.pages || 1));
        setPage(pageNum);
      }
    } catch (err) {
      setError('Failed to load reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchReviews(page + 1, true);
    }
  };

  const handleImageClick = (reviewIndex, imageIndex) => {
    const reviewImages = reviews[reviewIndex]?.images || [];
    setLightboxImages(reviewImages.map((url) => ({
      url,
      source: 'review',
      sourceId: reviews[reviewIndex]?._id,
      userName: reviews[reviewIndex]?.userId?.userName,
      userAvatar: reviews[reviewIndex]?.userId?.profilePicture,
      rating: reviews[reviewIndex]?.rating,
      restaurantName: reviews[reviewIndex]?.restaurantId?.name,
      restaurantSlug: reviews[reviewIndex]?.restaurantId?.slug
    })));
    setLightboxIndex(imageIndex);
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
    setLightboxImages([]);
  };

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const reviewsByRating = [5, 4, 3, 2, 1].reduce((acc, rating) => {
    acc[rating] = reviews.filter((r) => r.rating === rating).length;
    return acc;
  }, {});

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Testimonials</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Reviews & Testimonials
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            See what our guests are saying about their dining experiences
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-[#dce6c1] bg-[#fafcf7] p-8 text-center">
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setFilterRating(null)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  !filterRating
                    ? 'bg-[#8fa31e] text-white'
                    : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
                }`}
              >
                All ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(rating)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    filterRating === rating
                      ? 'bg-[#8fa31e] text-white'
                      : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
                  }`}
                >
                  <HiStar className="mr-1 inline h-4 w-4" />
                  {rating} ({reviewsByRating[rating] || 0})
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {filteredReviews.map((review, reviewIndex) => (
                <article
                  key={review._id || review.id}
                  className={joinClasses(surfaceCardClass, 'p-6')}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5faef]">
                      {review.userId?.profilePicture ? (
                        <img
                          src={review.userId.profilePicture}
                          alt={review.userId.userName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HiUserCircle className="h-8 w-8 text-[#8fa31e]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#23411f]">
                          {review.userId?.userName || 'Anonymous'}
                        </h3>
                        {review.restaurantId?.slug ? (
                          <Link
                            to={`/restaurant/${review.restaurantId.slug}`}
                            className="text-sm text-[#8fa31e] hover:underline"
                          >
                            {review.restaurantId.name}
                          </Link>
                        ) : review.restaurantId?.name ? (
                          <span className="text-sm text-[#8fa31e]">
                            {review.restaurantId.name}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <HiStar
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'text-[#efb634]'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm leading-7 text-gray-600">
                          {review.comment}
                        </p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.images.map((img, imgIndex) => (
                            <button
                              key={imgIndex}
                              onClick={() => handleImageClick(reviewIndex, imgIndex)}
                              className="relative overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-[#8fa31e] hover:ring-offset-2"
                            >
                              <img
                                src={img}
                                alt={`Review image ${imgIndex + 1}`}
                                className="h-20 w-20 object-cover transition hover:opacity-90"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredReviews.length === 0 && (
              <div className={joinClasses(surfaceCardClass, 'py-12 text-center')}>
                <p className="text-gray-600">No reviews found</p>
              </div>
            )}

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-full bg-[#8fa31e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#78871c] disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Load more reviews'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <ImageLightbox
        images={lightboxImages}
        selectedIndex={lightboxIndex}
        onClose={handleCloseLightbox}
      />
    </main>
  );
}

const surfaceCardClass = '!rounded-[1.75rem] !border-[#dce6c1] !bg-white shadow-sm';
