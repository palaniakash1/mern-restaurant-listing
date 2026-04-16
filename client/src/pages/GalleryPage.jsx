import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineCamera, HiOutlineShoppingBag, HiOutlineStar, HiOutlineArrowRight, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { publicShellClass, sectionWrapClass, sectionEyebrowClass } from '../utils/publicPage';
import { getGalleryRestaurantImages, getGalleryMenuImages, getGalleryReviewImages } from '../services/restaurantService';

const INITIAL_LIMIT = 20;

const ImageSection = ({ title, icon: Icon, images, loading, hasMore, onLoadMore, total }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const IconComponent = Icon;

  const handlePrev = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowLeft') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Escape') {
      setSelectedIndex(null);
    }
  };

  return (
    <div className="mb-16" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5faeb]">
            <IconComponent className="h-5 w-5 text-[#8fa31e]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#23411f]">{title}</h2>
            <p className="text-sm text-gray-500">{total} images</p>
          </div>
        </div>
      </div>

      {loading && images.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-[#edf4dc]" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dce6c1] bg-[#fafcf7] p-8 text-center">
          <p className="text-sm text-gray-500">No images available</p>
        </div>
      ) : (
        <>
          <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4 xl:grid-cols-5">
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                onClick={() => setSelectedIndex(index)}
                className="group relative break-inside-avoid overflow-hidden rounded-xl transition-all hover:shadow-lg hover:ring-2 hover:ring-[#8fa31e] hover:ring-offset-2"
              >
                <img
                  src={image.url}
                  alt={image.sourceName || image.source || 'Gallery image'}
                  className="h-auto w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition group-hover:opacity-100">
                  {image.sourceName && (
                    <p className="text-xs font-semibold text-white truncate">
                      {image.sourceName}
                    </p>
                  )}
                  {image.restaurantName && (
                    <p className="text-[10px] text-white/80 truncate">
                      {image.restaurantName}
                    </p>
                  )}
                  {image.userName && (
                    <p className="text-xs font-medium text-white truncate">
                      by {image.userName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="flex items-center gap-2 rounded-full bg-[#8fa31e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#78871c] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Load more
                    <HiOutlineArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {selectedIndex !== null && images[selectedIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 pb-28"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition"
            onClick={() => setSelectedIndex(null)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition md:p-4"
          >
            <HiOutlineChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition md:p-4"
          >
            <HiOutlineChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </button>

          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedIndex].url}
              alt={images[selectedIndex].sourceName || 'Gallery image'}
              className="max-h-[65vh] max-w-[85vw] rounded-lg object-contain"
            />

            <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  {images[selectedIndex].sourceName && (
                    <p className="font-semibold">{images[selectedIndex].sourceName}</p>
                  )}
                  {images[selectedIndex].restaurantName && (
                    <Link
                      to={`/restaurant/${images[selectedIndex].restaurantSlug || images[selectedIndex].restaurantId}`}
                      className="text-sm text-white/80 hover:text-white"
                      onClick={() => setSelectedIndex(null)}
                    >
                      {images[selectedIndex].restaurantName}
                    </Link>
                  )}
                  {images[selectedIndex].menuName && (
                    <p className="text-xs text-white/70">{images[selectedIndex].menuName}</p>
                  )}
                  {images[selectedIndex].userName && (
                    <p className="text-sm text-white/80">
                      by {images[selectedIndex].userName}
                      {images[selectedIndex].rating && (
                        <span className="ml-2 text-yellow-400">
                          {' '}{'★'.repeat(images[selectedIndex].rating)}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {selectedIndex + 1} / {images.length}
                  </span>
                  {images[selectedIndex].source === 'restaurant' && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                      Restaurant
                    </span>
                  )}
                  {images[selectedIndex].source === 'menu' && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                      Menu Item
                    </span>
                  )}
                  {images[selectedIndex].source === 'review' && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                      Review
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-4 left-1/2 z-10 flex max-w-[95vw] -translate-x-1/2 gap-2 overflow-x-auto pb-2">
            {images.map((image, idx) => (
              <button
                key={`thumb-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
                className={`relative flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                  idx === selectedIndex
                    ? 'ring-2 ring-[#8fa31e] ring-offset-2'
                    : 'opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={image.url}
                  alt=""
                  className="h-14 w-14 object-cover md:h-16 md:w-16"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GalleryPage() {
  const [restaurantImages, setRestaurantImages] = useState([]);
  const [menuImages, setMenuImages] = useState([]);
  const [reviewImages, setReviewImages] = useState([]);

  const [restaurantPage, setRestaurantPage] = useState(1);
  const [menuPage, setMenuPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);

  const [restaurantTotal, setRestaurantTotal] = useState(0);
  const [menuTotal, setMenuTotal] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);

  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchRestaurantImages = useCallback(async (page = 1, append = false) => {
    setLoadingRestaurants(true);
    try {
      const res = await getGalleryRestaurantImages({ page, limit: INITIAL_LIMIT });
      if (res.success) {
        setRestaurantImages(prev => append ? [...prev, ...(res.data || [])] : (res.data || []));
        setRestaurantTotal(res.total || 0);
        setRestaurantPage(page);
      }
    } catch (err) {
      console.error('Error fetching restaurant images:', err);
    } finally {
      setLoadingRestaurants(false);
    }
  }, []);

  const fetchMenuImages = useCallback(async (page = 1, append = false) => {
    setLoadingMenus(true);
    try {
      const res = await getGalleryMenuImages({ page, limit: INITIAL_LIMIT });
      if (res.success) {
        setMenuImages(prev => append ? [...prev, ...(res.data || [])] : (res.data || []));
        setMenuTotal(res.total || 0);
        setMenuPage(page);
      }
    } catch (err) {
      console.error('Error fetching menu images:', err);
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  const fetchReviewImages = useCallback(async (page = 1, append = false) => {
    setLoadingReviews(true);
    try {
      const res = await getGalleryReviewImages({ page, limit: INITIAL_LIMIT });
      if (res.success) {
        setReviewImages(prev => append ? [...prev, ...(res.data || [])] : (res.data || []));
        setReviewTotal(res.total || 0);
        setReviewPage(page);
      }
    } catch (err) {
      console.error('Error fetching review images:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchRestaurantImages(1),
        fetchMenuImages(1),
        fetchReviewImages(1)
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchRestaurantImages, fetchMenuImages, fetchReviewImages]);

  const handleLoadMoreRestaurants = () => {
    fetchRestaurantImages(restaurantPage + 1, true);
  };

  const handleLoadMoreMenus = () => {
    fetchMenuImages(menuPage + 1, true);
  };

  const handleLoadMoreReviews = () => {
    fetchReviewImages(reviewPage + 1, true);
  };

  const hasMoreRestaurants = restaurantImages.length < restaurantTotal;
  const hasMoreMenus = menuImages.length < menuTotal;
  const hasMoreReviews = reviewImages.length < reviewTotal;

  const isLoading = loading || loadingRestaurants || loadingMenus || loadingReviews;

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Gallery</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Explore Our Gallery
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Browse stunning images from our restaurants, dishes, and customer reviews
          </p>
        </div>

        {isLoading && restaurantImages.length === 0 && menuImages.length === 0 && reviewImages.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          </div>
        ) : (
          <>
            <ImageSection
              title="Restaurant Images"
              icon={HiOutlineCamera}
              images={restaurantImages}
              loading={loadingRestaurants}
              hasMore={hasMoreRestaurants}
              onLoadMore={handleLoadMoreRestaurants}
              total={restaurantTotal}
            />

            <ImageSection
              title="Menu Items"
              icon={HiOutlineShoppingBag}
              images={menuImages}
              loading={loadingMenus}
              hasMore={hasMoreMenus}
              onLoadMore={handleLoadMoreMenus}
              total={menuTotal}
            />

            <ImageSection
              title="Customer Reviews"
              icon={HiOutlineStar}
              images={reviewImages}
              loading={loadingReviews}
              hasMore={hasMoreReviews}
              onLoadMore={handleLoadMoreReviews}
              total={reviewTotal}
            />
          </>
        )}
      </section>
    </main>
  );
}
