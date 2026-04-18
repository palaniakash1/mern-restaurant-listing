import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiStar, HiArrowSmLeft } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass
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
  const [searchParams] = useSearchParams();
  const restaurantSlug = searchParams.get('restaurant');
  const restaurantName = searchParams.get('restaurantName');
  
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
      let endpoint = `/api/reviews?page=${pageNum}&limit=${INITIAL_LIMIT}&sort=desc`;
      
      if (restaurantSlug) {
        endpoint = `/api/reviews/restaurant-by-slug/${restaurantSlug}?page=${pageNum}&limit=${INITIAL_LIMIT}&sort=desc`;
      }
      
      const response = await apiGet(endpoint);
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
  }, [restaurantSlug]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchReviews(page + 1, true);
    }
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

  const getReviewAuthor = (review) => {
    return review?.userId?.userName || review?.user?.userName || 'Guest diner';
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          {restaurantSlug ? (
            <div className="mb-4">
              <Link
                to={`/restaurant/${restaurantSlug}`}
                className="inline-flex items-center gap-1 text-sm text-[#8fa31e] hover:underline"
              >
                <HiArrowSmLeft className="h-4 w-4" />
                Back to {restaurantName || 'restaurant'}
              </Link>
            </div>
          ) : null}
          <p className={sectionEyebrowClass}>Testimonials</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            {restaurantSlug ? `${restaurantName || 'Restaurant'} Reviews` : 'Reviews & Testimonials'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            {restaurantSlug 
              ? `See what guests are saying about ${restaurantName || 'this restaurant'}`
              : 'See what our guests are saying about their dining experiences'
            }
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse rounded-[2rem] border border-[#dce6c1] bg-[#faf6ef] p-7">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <HiStar key={j} className="h-5 w-5 text-[#ddd1bc]" />
                  ))}
                </div>
                <div className="mt-6 h-20 rounded-lg bg-[#e8e2d6]" />
                <div className="mt-7 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#e8e2d6]" />
                  <div className="h-8 w-24 rounded-lg bg-[#e8e2d6]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-dashed border-[#dce6c1] bg-[#fafcf7] p-8 text-center">
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setFilterRating(null)}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
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
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                    filterRating === rating
                      ? 'bg-[#8fa31e] text-white'
                      : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
                  }`}
                >
                  <HiStar className={`h-3.5 w-3.5 ${filterRating === rating ? 'fill-current' : ''}`} />
                  {rating} ({reviewsByRating[rating] || 0})
                </button>
              ))}
            </div>

            {filteredReviews.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#dce6c1] bg-white px-6 py-12 text-center shadow-[0_18px_45px_rgba(64,48,20,0.04)]">
                <p className="text-base text-[#6d6358]">No reviews found</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
                  {filteredReviews.map((review) => {
                    const reviewImages = review.images || [];
                    const hasImages = reviewImages.length > 0;

                    return (
                      <article
                        key={review._id || review.id}
                        className="group rounded-[2rem] border border-[#dce6c1] bg-white p-6 shadow-[0_18px_45px_rgba(64,48,20,0.06)] transition hover:border-[#8fa31e]"
                      >
                        <div className="flex gap-1 text-[#efb634]">
                          {[...Array(5)].map((_, starIndex) => (
                            <HiStar
                              key={starIndex}
                              className={`h-4 w-4 ${
                                starIndex < (review.rating || 5)
                                  ? 'fill-current'
                                  : 'text-[#ddd1bc]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-4 text-sm italic leading-6 text-[#4f473d] line-clamp-4">
                          "{review.comment || 'Wonderful food and warm service.'}"
                        </p>
                        
                        {hasImages && (
                          <div 
                            className="mt-4 flex gap-1.5 overflow-hidden rounded-lg cursor-pointer"
                            onClick={() => {
                              const imageList = [];
                              reviews.forEach((r) => {
                                (r.images || []).forEach((img) => {
                                  imageList.push({
                                    url: img,
                                    source: 'review',
                                    sourceName: getReviewAuthor(r),
                                    restaurantName: r.restaurantId?.name,
                                    rating: r.rating
                                  });
                                });
                              });
                              const startIdx = imageList.findIndex(
                                (img) => img.sourceName === getReviewAuthor(review)
                              );
                              setLightboxImages(imageList);
                              setLightboxIndex(startIdx >= 0 ? startIdx : 0);
                            }}
                          >
                            {reviewImages.slice(0, 3).map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Review image ${idx + 1}`}
                                className="h-14 w-14 object-cover transition hover:opacity-80"
                              />
                            ))}
                            {reviewImages.length > 3 && (
                              <div className="flex h-14 w-14 items-center justify-center bg-[#f6fdeb] text-xs font-semibold text-[#8e5c2d]">
                                +{reviewImages.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-5 flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2e17] text-xs font-semibold text-white">
                            {getReviewAuthor(review).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#23411f] truncate">
                              {getReviewAuthor(review)}
                            </p>
                            {!restaurantSlug && review.restaurantId?.slug && (
                              <Link
                                to={`/restaurant/${review.restaurantId.slug}`}
                                className="text-xs text-[#8fa31e] hover:underline truncate block"
                              >
                                {review.restaurantId.name}
                              </Link>
                            )}
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9d9284]">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-10 flex justify-center">
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
