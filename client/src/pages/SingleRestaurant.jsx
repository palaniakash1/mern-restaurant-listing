import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { toggleAllergen } from '../redux/allergen/allergenSlice';
import { setDietary } from '../redux/dietary/dietarySlice';
import { MenuItemCard } from '../components/public/MenuItemCard';
import {
  HiArrowSmRight,
  HiChevronDown,
  HiClock,
  HiGlobe,
  HiLocationMarker,
  HiMail,
  HiPhone,
  HiPlus,
  HiStar
} from 'react-icons/hi';
import {
  getRestaurantBySlug,
  getRestaurantMenus,
  getNearbyRestaurants,
  listRestaurants
} from '../services/restaurantService';
import { listRestaurantReviews } from '../services/reviewService';
import RestaurantSpotlightCard from '../components/public/RestaurantSpotlightCard';
import ImageLightbox from '../components/ImageLightbox';
import AddReviewModal from '../components/public/AddReviewModal';
import { Modal, Button } from 'flowbite-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600';

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const ALLERGY_LABELS = {
  gluten: 'Gluten',
  egg: 'Egg',
  fish: 'Fish',
  crustaceans: 'Crustaceans',
  molluscs: 'Molluscs',
  milk: 'Milk',
  peanut: 'Peanut',
  tree_nuts: 'Tree Nuts',
  sesame: 'Sesame',
  soya: 'Soya',
  celery: 'Celery',
  mustard: 'Mustard',
  sulphites: 'Sulphites',
  lupin: 'Lupin'
};

const ALLERGEN_KEYS = Object.keys(ALLERGY_LABELS);

const DIETARY_OPTIONS = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'gf', label: 'Gluten-Free' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' }
];

const pickImage = (restaurant, type = 'hero') => {
  const common = [
    restaurant?.bannerImage,
    restaurant?.gallery?.[0],
    restaurant?.imageLogo,
    FALLBACK_IMAGE
  ].filter(Boolean);

  if (type === 'thumb') {
    return (
      restaurant?.bannerImage ||
      restaurant?.gallery?.[0] ||
      restaurant?.imageLogo ||
      FALLBACK_IMAGE
    );
  }

  return common[0];
};

const getBadgeUrl = (rating) =>
  rating && rating !== 'Exempt'
    ? `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${rating}.svg`
    : null;

const formatAddress = (address) =>
  [
    address?.addressLine1,
    address?.addressLine2,
    address?.areaLocality,
    address?.city,
    address?.postcode,
    address?.country
  ]
    .filter(Boolean)
    .join(', ');

const formatHours = (hours) =>
  DAY_ORDER.map((day) => {
    const value = hours?.[day];
    return !value || value.isClosed
      ? { day, short: day.slice(0, 3), label: 'Closed', isClosed: true }
      : {
          day,
          short: day.slice(0, 3),
          label: `${value.open} - ${value.close}`,
          isClosed: false
        };
  });

const getTodayHours = (hours) => {
  if (!hours) return null;
  const day = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ][new Date().getDay()];
  const value = hours[day];
  if (!value || value.isClosed)
    return { status: 'Closed', hours: 'Closed', statusType: 'closed' };

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHour, openMin] = value.open.split(':').map(Number);
  const [closeHour, closeMin] = value.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  let statusType = 'closed';
  let statusText = 'Closed';

  if (currentTime >= openTime && currentTime < closeTime) {
    const minutesUntilClose = closeTime - currentTime;
    if (minutesUntilClose <= 30) {
      statusType = 'closes-soon';
      statusText = 'Closes Soon';
    } else {
      statusType = 'open';
      statusText = 'Open Now';
    }
  } else if (currentTime >= closeTime || currentTime < openTime) {
    statusType = 'closed';
    statusText = 'Closed';
  }

  return { status: statusText, hours: `${value.open} - ${value.close}`, statusType };
};

const getReviewAuthor = (review) =>
  typeof review?.user === 'string' && review.user.trim()
    ? review.user
    : review?.userId?.userName || review?.user?.userName || 'Guest diner';

const jumpToCategory = (category) => {
  const element = document.getElementById(
    `menu-category-${category.replace(/\s+/g, '-')}`
  );
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.pageYOffset - 120;
  window.scrollTo({ top, behavior: 'smooth' });
};

const buildMapsUrl = (restaurant, address) => {
  const coordinates = restaurant?.address?.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    return `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;
  }
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
};

const getFeaturedDishImage = (restaurant, menus) => {
  for (const menu of menus || []) {
    for (const item of menu.items || []) {
      if (item?.image) return item.image;
    }
  }

  return pickImage(restaurant, 'hero');
};

const Skeleton = () => (
  <div className="min-h-screen !bg-[#fff8f7] pt-24">
    <div className="h-[75vh] animate-pulse !bg-[#d8c2c0]" />
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1.6fr)_390px]">
      <div className="h-[560px] rounded-[2rem] !bg-[#d8c2c0]" />
      <div className="space-y-6">
        <div className="h-72 rounded-[2rem] !bg-[#d8c2c0]" />
        <div className="h-72 rounded-[2rem] !bg-[#d8c2c0]" />
      </div>
    </div>
  </div>
);

export default function SingleRestaurant() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [relatedRestaurants, setRelatedRestaurants] = useState([]);
  const dispatch = useDispatch();
  const allergenState = useSelector((state) => state.allergen || { selectedAllergens: [] });
  const selectedAllergens = allergenState.selectedAllergens || [];
  const selectedDiet = useSelector((state) => state.dietary?.selectedDiet || null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const restaurantData = await getRestaurantBySlug(slug);
      setRestaurant(restaurantData);
      if (restaurantData?._id) {
        const menusData = await getRestaurantMenus(restaurantData._id);
        setMenus(menusData.data || []);

        const location = restaurantData.address?.location;
        if (location?.coordinates?.length === 2) {
          const [lng, lat] = location.coordinates;

          const nearbyRes = await getNearbyRestaurants({
            lng,
            lat,
            radius: 10000,
            limit: 4,
            exclude: restaurantData._id
          });
          setNearbyRestaurants(
            nearbyRes.data?.restaurants || nearbyRes.data || []
          );
        }

        if (restaurantData.categories?.length > 0) {
          const relatedRes = await listRestaurants({
            categories: restaurantData.categories.join(','),
            limit: 4
          });
          const related = (
            relatedRes.data?.restaurants ||
            relatedRes.data ||
            []
          ).filter((r) => r._id !== restaurantData._id);
          setRelatedRestaurants(related.slice(0, 4));
        }
      } else {
        setMenus([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadReviews = useCallback(async () => {
    if (!restaurant || !restaurant._id) return;
    try {
      setReviewsLoading(true);
      const response = await listRestaurantReviews(restaurant._id, {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      const reviewsArray = Array.isArray(response) ? response : (response?.data || []);
      setReviews(reviewsArray);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [restaurant?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setActiveCategory(menus.find((menu) => menu.category)?.category || null);
  }, [menus]);

  useEffect(() => {
    if (restaurant?._id) {
      loadReviews();
    }
  }, [restaurant?._id, loadReviews]);

  if (loading) return <Skeleton />;

  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';
  const isPublished = restaurant?.status === 'published';

  if (!isPublished && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center !bg-[#fff8f7] px-4 pt-24">
        <div className="max-w-md rounded-[2rem] border border-[#c4dcc1] !bg-white p-8 text-center shadow-[0_18px_50px_rgba(64,48,20,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] !text-[#2f6a34]">
            Restaurant
          </p>
          <h1 className="mt-3 text-3xl font-black !text-[#201a1a]">
            Not Available
          </h1>
          <p className="mt-3 text-sm leading-7 !text-[#534342]">
            This restaurant is currently {restaurant?.status || 'unavailable'}{' '}
            and cannot be viewed.
          </p>
          <Link
            to="/restaurants"
            className="mt-6 inline-flex rounded-full !bg-[#bf1e18] px-6 py-3 text-sm font-semibold !text-white transition hover:opacity-90"
          >
            Browse restaurants
          </Link>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center !bg-[#fff8f7] px-4 pt-24">
        <div className="max-w-md rounded-[2rem] border border-[#c4dcc1] !bg-white p-8 text-center shadow-[0_18px_50px_rgba(64,48,20,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] !text-[#2f6a34]">
            Restaurant
          </p>
          <h1 className="mt-3 text-3xl font-black !text-[#201a1a]">Not Found</h1>
          <p className="mt-3 text-sm leading-7 !text-[#534342]">
            {error || 'This restaurant page is not available right now.'}
          </p>
          <Link
            to="/restaurants"
            className="mt-6 inline-flex rounded-full !bg-[#bf1e18] px-6 py-3 text-sm font-semibold !text-white transition hover:opacity-90"
          >
            Browse restaurants
          </Link>
        </div>
      </div>
    );
  }

  const heroImage = getFeaturedDishImage(restaurant, menus);
  const address = formatAddress(restaurant.address);
  const todayHours = getTodayHours(restaurant.openingHours);
  const openingHours = formatHours(restaurant.openingHours);
  const categories = menus.map((menu) => menu.category).filter(Boolean);
  const mapsUrl = buildMapsUrl(restaurant, address);

  const openLightbox = (images, startIndex) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  };

  const handleReviewSuccess = () => {
    loadReviews();
    setShowThankYou(true);
  };

  const handleThankYouClose = () => {
    setShowThankYou(false);
  };

  return (
    <div className="min-h-screen !bg-[#fff8f7] pt-24 !text-[#201a1a]">
      {/* Hero Section */}
      <header className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
          src={heroImage}
        />
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-white  !text-[6rem] md:text-9xl font-extrabold tracking-tighter mb-2">
            {restaurant.name}
          </h1>
          <p className="text-white/80 text-lg md:text-xl tracking-[0.3em] uppercase mb-6">
            {restaurant.tagline}
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-white font-bold text-sm tracking-widest uppercase">
            <span className="flex items-center gap-1">
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {restaurant.rating?.toFixed(1) || 'New'} Rating
            </span>
            <span className="opacity-40">|</span>
            <span className="!text-[#bf1e18]">{restaurant.priceRange || '$$'}</span>
            <span className="opacity-40">|</span>
            <span>
              {restaurant.address?.city ||
                restaurant.address?.areaLocality ||
                'UK'}
            </span>
            {todayHours && (
              <>
                <span className="opacity-40">|</span>
                <span
                  className={`font-semibold ${
                    todayHours.statusType === 'open'
                      ? '!text-green-400'
                      : todayHours.statusType === 'closes-soon'
                      ? '!text-yellow-400'
                      : '!text-red-400'
                  }`}
                >
                  {todayHours.status}
                </span>
              </>
            )}
          </div>
          {restaurant.fsaRating?.value &&
            restaurant.fsaRating.value !== 'Exempt' && (
              <div className="mt-4 flex justify-center">
                <img
                  src={getBadgeUrl(restaurant.fsaRating.value)}
                  alt={`FSA Rating ${restaurant.fsaRating.value}`}
                  className="h-12 w-auto"
                />
              </div>
            )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_360px]">
          <div>
            <section className="overflow-hidden rounded-[2.2rem] border border-[#c4dcc1] !bg-white shadow-[0_22px_70px_rgba(65,48,24,0.08)]">
              <div className="border-b border-[#c4dcc1] !bg-[#fff8f7] p-6 sm:p-8">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] !text-[#2f6a34]">
                    Curated Menu
                  </p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight !text-[#201a1a]">
                    Designed to feel like a destination, not a list
                  </h2>
                  <p className="mt-4 text-base leading-8 !text-[#534342]">
                    Browse the standout dishes, signature sections, and
                    high-intent menu story of {restaurant.name}.
                  </p>
                </div>
                
                <div className="mt-6 border-t border-[#c4dcc1] pt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.15em] !text-[#2f6a34]">Allergens:</span>
                      <div className="flex flex-wrap gap-2">
                        {ALLERGEN_KEYS.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => dispatch(toggleAllergen(key))}
                            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${
                              selectedAllergens.includes(key)
                                ? '!bg-[#bf1e18] !text-white'
                                : '!bg-[#fff1f0] !text-[#534342]'
                            }`}
                          >
                            {ALLERGY_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-px bg-[#c4dcc1]" />
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.15em] !text-[#2f6a34]">Diet:</span>
                      <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => dispatch(setDietary(selectedDiet === opt.key ? null : opt.key))}
                            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${
                              selectedDiet === opt.key
                                ? '!bg-[#bf1e18] !text-white'
                                : '!bg-[#fff1f0] !text-[#534342]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                
                <div className="h-px bg-[#c4dcc1] my-4" />

                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category);
                        jumpToCategory(category);
                      }}
                      className={`group relative rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                        activeCategory === category
                          ? '!bg-[#bf1e18] !text-white shadow-lg'
                          : '!bg-[#fff1f0] !text-[#000] hover:!bg-[#bf1e18] hover:!text-white'
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {category}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-[#c4dcc1] mt-4" />
              </div>

              <div className="p-6 sm:p-8">
                {menus.length === 0 ? (
                  <div className="rounded-[1.9rem] border-2 border-dashed border-[#c4dcc1] !bg-[#fff8f7] px-6 py-14 text-center">
                    <p className="text-sm uppercase tracking-[0.32em] !text-[#2f6a34]">
                      Menu
                    </p>
                    <h3 className="mt-3 text-2xl font-bold !text-[#201a1a]">
                      Coming Soon
                    </h3>
                    <p className="mt-3 text-sm leading-7 !text-[#534342]">
                      This restaurant has not published its dishes yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-16">
                    {menus.map((menu, index) => (
                      <section
                        key={`${menu.category || 'menu'}-${index}`}
                        id={`menu-category-${(menu.category || 'menu').replace(/\s+/g, '-')}`}
                      >
                        <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#c4dcc1] pb-4">
                          <h3 className="text-3xl font-black uppercase tracking-tight !text-[#201a1a]">
                            {menu.category || 'Menu'}
                          </h3>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] !text-[#534342]">
                            {menu.items?.length || 0} dishes
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {(menu.items || []).map((item, itemIndex) => (
                            <MenuItemCard
                              key={`${menu._id}-${itemIndex}`}
                              item={item}
                              selectedAllergens={selectedAllergens}
                              selectedDiet={selectedDiet ? [selectedDiet] : []}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-[2rem] border border-[#c4dcc1] !bg-[#bf1e18] p-6 !text-white shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                  Culinary identity
                </p>
                <p className="mt-4 text-2xl font-black leading-tight">
                  Premium presentation that gives the restaurant real brand
                  presence.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#c4dcc1] !bg-white p-6 shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] !text-[#2f6a34]">
                  Atmosphere
                </p>
                <p className="mt-4 text-base leading-8 !text-[#534342]">
                  Hero banner, logo treatment, and layered content blocks work
                  together to make the page feel intentional and memorable.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#c4dcc1] !bg-[#fff8f7] p-6 shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] !text-[#2f6a34]">
                  Brand clarity
                </p>
                <p className="mt-4 text-base leading-8 !text-[#534342]">
                  Structured information and softer premium surfaces make the
                  restaurant easier to trust at first glance.
                </p>
              </div>
            </section>

            <section className="mt-16">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] !text-[#2f6a34]">
                    Guest Impressions
                  </p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight !text-[#201a1a]">
                    The Guest Journal
                  </h2>
                  <p className="mt-3 text-base !text-[#534342]">
                    Reviews displayed like editorial testimonials rather than
                    generic cards.
                  </p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="flex items-center gap-2 rounded-full !bg-[#bf1e18] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] !text-white transition hover:opacity-90"
                  >
                    <HiPlus className="h-4 w-4" />
                    Add Review
                  </button>
                )}
              </div>

              {reviewsLoading ? (
                <div className="grid gap-6 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-[2rem] border border-[#c4dcc1] !bg-[#fff8f7] p-7"
                    >
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <HiStar key={j} className="h-5 w-5 !text-[#d8c2c0]" />
                        ))}
                      </div>
                      <div className="mt-6 h-20 rounded-lg !bg-[#d8c2c0]" />
                      <div className="mt-7 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full !bg-[#d8c2c0]" />
                        <div className="h-8 w-24 rounded-lg !bg-[#d8c2c0]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-[#c4dcc1] !bg-[#fff8f7] px-6 py-12 text-center shadow-md">
                  {user ? (
                    <>
                      <p className="text-base !text-[#534342]">
                        Be the first to share your experience!
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowReviewModal(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full !bg-[#bf1e18] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] !text-white transition hover:opacity-90"
                      >
                        <HiPlus className="h-4 w-4" />
                        Write a review
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-base !text-[#534342]">
                        Join the community to share your dining experience and help others discover this restaurant.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                          to="/login"
                          className="inline-flex items-center justify-center gap-2 rounded-full !bg-[#bf1e18] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] !text-white transition hover:opacity-90"
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          className="inline-flex items-center justify-center gap-2 rounded-full !bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] !text-[#2f6a34] border border-[#c4dcc1] transition hover:!bg-[#fff1f0]"
                        >
                          Register
                        </Link>
                      </div>
                      <p className="text-xs !text-[#534342]">
                        Reviews will appear here once guests start sharing their experience.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-3">
                    {reviews.slice(0, 3).map((review, index) => {
                      const reviewImages = review.images || [];
                      const hasImages = reviewImages.length > 0;

                      return (
                        <article
                          key={`${review._id || index}-${index}`}
                          className="group cursor-pointer overflow-hidden rounded-[2rem] border !border-[#c4dcc1] bg-white p-7 shadow-[0_18px_45px_rgba(64,48,20,0.06)] transition hover:border-[#bf1e18]"
                          onClick={() => {
                            if (hasImages) {
                              const imageList = [];
                              reviews.forEach((r) => {
                                (r.images || []).forEach((img) => {
                                  imageList.push({
                                    url: img,
                                    source: 'review',
                                    sourceName: getReviewAuthor(r),
                                    restaurantName: restaurant?.name,
                                    rating: r.rating,
                                    restaurantSlug: restaurant?.slug,
                                    restaurantId: restaurant?._id
                                  });
                                });
                              });
                              const startIdx = imageList.findIndex(
                                (img) =>
                                  img.sourceName === getReviewAuthor(review) &&
                                  imageList.indexOf(img) < imageList.length
                              );
                              openLightbox(imageList, startIdx >= 0 ? startIdx : 0);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bf1e18] text-sm font-semibold text-white">
                              {getReviewAuthor(review).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold !text-[#201a1a]">
                                {getReviewAuthor(review)}
                              </p>
                              <p className="text-xs uppercase tracking-[0.18em] text-[#9d9284]">
                                {review.createdAt
                                  ? new Date(
                                      review.createdAt
                                    ).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  : 'Recent guest'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex gap-1 text-[#efb634]">
                            {[...Array(5)].map((_, starIndex) => (
                              <HiStar
                                key={starIndex}
                                className={`h-5 w-5 ${
                                  starIndex < (review.rating || 5)
                                    ? 'fill-current'
                                    : 'text-[#ddd1bc]'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {hasImages && (
                            <div className="mt-4 flex gap-2">
                              {reviewImages.slice(0, 3).map((img, idx) => {
                                const src = typeof img === 'string' ? img : img?.url || img;
                                return (
                                  <img
                                    key={idx}
                                    src={src}
                                    alt={`Review image ${idx + 1}`}
                                    className="h-16 w-16 object-cover"
                                  />
                                );
                              })}
                              {reviewImages.length > 3 && (
                                <div className="flex h-16 w-16 items-center justify-center !bg-[#fff8f7] text-xs font-semibold text-[#2f6a34]">
                                  +{reviewImages.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="mt-6 text-[15px] italic leading-8 text-[#4f473d]">
                            "{review.comment || 'Wonderful food and warm service.'}"
                          </p>
                        </article>
                      );
                    })}
                  </div>

                  {reviews.length > 3 && (
                    <div className="text-center">
                      <Link
                        to={`/reviews?restaurant=${restaurant.slug}&restaurantName=${encodeURIComponent(restaurant.name)}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold !text-[#2f6a34] hover:underline"
                      >
                        View all {reviews.length} reviews
                        <HiArrowSmRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:pt-8">
            <div className="overflow-hidden rounded-[2rem] border !border-[#c4dcc1] bg-white shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <div className="h-44 overflow-hidden">
                <img
                  src={
                    restaurant.bannerImage ||
                    pickImage(restaurant, 'thumb')
                  }
                  alt={restaurant.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6a34]">
                  <HiLocationMarker className="h-4 w-4" />
                  Location
                </p>
                <h3 className="mt-5 text-2xl font-black !text-[#201a1a]">
                  {restaurant.address?.areaLocality ||
                    restaurant.address?.city ||
                    'Visit us'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#6d6358]">
                  {address}
                </p>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full !bg-[#bf1e18] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:!bg-[#8a160f]"
                  >
                    Open map
                    <HiArrowSmRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border !border-[#c4dcc1] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6a34]">
                <HiLocationMarker className="h-4 w-4" />
                Quick facts
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                    Price range
                  </p>
                  <p className="mt-2 text-sm font-semibold !text-[#bf1e18]">
                    {restaurant.priceRange || 'Available on request'}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                    Cuisine
                  </p>
                  <p className="mt-2 text-sm font-semibold !text-[#201a1a]">
                    {restaurant.cuisineType || 'Signature specials'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border !border-[#c4dcc1] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6a34]">
                <HiClock className="h-4 w-4" />
                Opening Hours
              </p>
              {todayHours ? (
                <div className="mt-4 rounded-[1.5rem] bg-[#1f2e17] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    {todayHours.status}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {todayHours.hours}
                  </p>
                </div>
              ) : null}
              <div className="mt-5 space-y-4 text-sm">
                {openingHours.map(({ day, short, label, isClosed }) => (
                  <div
                    key={day}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="uppercase tracking-[0.18em] text-[#9d9284]">
                      {short}
                    </span>
                    <span
                      className={
                        isClosed
                          ? 'text-[#b62828]'
                          : 'font-medium !text-[#201a1a]'
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border !border-[#c4dcc1] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6a34]">
                <HiPhone className="h-4 w-4" />
                Inquiries
              </p>
              <div className="mt-5 space-y-5">
                {restaurant.contactNumber ? (
                  <a
                    href={`tel:${restaurant.contactNumber}`}
                    className="flex items-center gap-4 text-sm text-[#534342] transition hover:!text-[#2f6a34]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full !bg-[#fff8f7] !text-[#2f6a34]">
                      <HiPhone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">
                        Reservations
                      </p>
                      <p className="mt-1 font-medium">
                        {restaurant.contactNumber}
                      </p>
                    </div>
                  </a>
                ) : null}

                {restaurant.email ? (
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="flex items-center gap-4 text-sm text-[#534342] transition hover:!text-[#2f6a34]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full !bg-[#fff8f7] !text-[#2f6a34]">
                      <HiMail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">
                        Email
                      </p>
                      <p className="mt-1 font-medium break-all">
                        {restaurant.email}
                      </p>
                    </div>
                  </a>
                ) : null}

                {restaurant.website ? (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 text-sm text-[#534342] transition hover:!text-[#2f6a34]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full !bg-[#fff8f7] !text-[#2f6a34]">
                      <HiGlobe className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">
                        Website
                      </p>
                      <p className="mt-1 font-medium">
                        Visit restaurant website
                      </p>
                    </div>
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {(relatedRestaurants.length > 0 || nearbyRestaurants.length > 0) && (
        <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 xl:px-8">
          {nearbyRestaurants.length > 0 && (
            <div className="mb-16">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] !text-[#b62828]">
                  Explore
                </p>
                <h2 className="mt-3 text-2xl font-bold !text-[#201a1a] sm:text-3xl">
                  Nearby Restaurants
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  Discover more great dining options near {restaurant.name}
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {nearbyRestaurants.slice(0, 3).map((r) => (
                  <RestaurantSpotlightCard key={r._id} restaurant={r} />
                ))}
              </div>
            </div>
          )}

          {relatedRestaurants.length > 0 && (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] !text-[#b62828]">
                  You May Also Like
                </p>
                <h2 className="mt-3 text-2xl font-bold !text-[#201a1a] sm:text-3xl">
                  Related Restaurants
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  Similar cuisines and dining experiences
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedRestaurants.slice(0, 3).map((r) => (
                  <RestaurantSpotlightCard key={r._id} restaurant={r} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <AddReviewModal
        show={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        restaurant={restaurant}
        onSuccess={handleReviewSuccess}
      />

      <ImageLightbox
        images={lightboxImages}
        selectedIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <Modal show={showThankYou} onClose={handleThankYouClose} size="sm">
        <div className="text-center p-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full !bg-[#fff8f7]">
            <HiStar className="h-8 w-8 !fill-[#bf1e18] !text-[#2f6a34]" />
          </div>
          <Modal.Header className="justify-center text-center">
            Thank You!
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm leading-7 text-[#6d6358]">
              Your review helps other diners discover what makes{' '}
              <span className="font-semibold !text-[#201a1a]">{restaurant?.name}</span> special.
              <br />
              Thanks for sharing your experience!
            </p>
          </Modal.Body>
          <Modal.Footer className="justify-center">
            <Button
              onClick={handleThankYouClose}
              className="!bg-[#bf1e18] hover:!bg-[#8a160f]"
            >
              Got it
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
