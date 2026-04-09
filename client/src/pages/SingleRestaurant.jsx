import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  HiArrowSmRight,
  HiClock,
  HiGlobe,
  HiLocationMarker,
  HiMail,
  HiPhone,
  HiStar
} from 'react-icons/hi';
import { getRestaurantBySlug, getRestaurantMenus } from '../services/restaurantService';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
});

const pickImage = (restaurant, type = 'hero') => {
  const common = [
    restaurant?.bannerImage,
    restaurant?.featuredImage,
    restaurant?.thumbnailImage,
    restaurant?.coverImage,
    restaurant?.gallery?.[0],
    restaurant?.imageLogo,
    FALLBACK_IMAGE
  ].filter(Boolean);

  if (type === 'thumb') {
    return (
      restaurant?.thumbnailImage ||
      restaurant?.featuredImage ||
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
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ];
  const value = hours[day];
  if (!value || value.isClosed) return { status: 'Closed Today', hours: 'Closed' };
  return { status: 'Open Today', hours: `${value.open} - ${value.close}` };
};

const getReviewAuthor = (review) =>
  typeof review?.user === 'string' && review.user.trim()
    ? review.user
    : review?.user?.userName || 'Guest diner';

const getItemBadges = (item) => {
  const list = [];
  if (item?.dietary?.vegan) list.push('Vegan');
  if (item?.dietary?.vegetarian && !item?.dietary?.vegan) list.push('Vegetarian');
  if (item?.isMeal) list.push('Meal');
  return list;
};

const getItemAllergens = (item) => {
  const values = new Set();
  (item?.ingredients || []).forEach((ingredient) => {
    (ingredient.allergens || []).forEach((allergen) => {
      values.add(ALLERGY_LABELS[allergen] || allergen);
    });
  });
  return [...values];
};

const jumpToCategory = (category) => {
  const element = document.getElementById(`menu-category-${category.replace(/\s+/g, '-')}`);
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
  if (restaurant?.featuredImage) return restaurant.featuredImage;

  for (const menu of menus || []) {
    for (const item of menu.items || []) {
      if (item?.image) return item.image;
    }
  }

  return pickImage(restaurant, 'hero');
};

const getItemImage = (item, restaurant) =>
  item?.image || item?.thumbnailImage || item?.featuredImage || pickImage(restaurant, 'thumb');

const Skeleton = () => (
  <div className="min-h-screen bg-[#f5f1e8]">
    <div className="h-[75vh] animate-pulse bg-[#d8ccb8]" />
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1.6fr)_390px]">
      <div className="h-[560px] rounded-[2rem] bg-[#eee5d7]" />
      <div className="space-y-6">
        <div className="h-72 rounded-[2rem] bg-[#eee5d7]" />
        <div className="h-72 rounded-[2rem] bg-[#eee5d7]" />
      </div>
    </div>
  </div>
);

export default function SingleRestaurant() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

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
      } else {
        setMenus([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setActiveCategory(menus.find((menu) => menu.category)?.category || null);
  }, [menus]);

  if (loading) return <Skeleton />;

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-4">
        <div className="max-w-md rounded-[2rem] border border-[#e9dfd0] bg-white p-8 text-center shadow-[0_18px_50px_rgba(64,48,20,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
            Restaurant
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#1c1917]">Not Found</h1>
          <p className="mt-3 text-sm leading-7 text-[#6d6358]">
            {error || 'This restaurant page is not available right now.'}
          </p>
          <Link
            to="/restaurants"
            className="mt-6 inline-flex rounded-full bg-[#1f2e17] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d4121]"
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
  const reviews = restaurant.reviews || [];
  const mapsUrl = buildMapsUrl(restaurant, address);

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1c1917]">
      {/* Hero Section */}
      <header className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img 
          alt={restaurant.name} 
          className="absolute inset-0 w-full h-full object-cover" 
          src={heroImage}
        />
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-white text-6xl md:text-9xl font-extrabold tracking-tighter mb-2">{restaurant.name}</h1>
          <p className="text-white/80 text-lg md:text-xl tracking-[0.3em] uppercase mb-6">{restaurant.tagline}</p>
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-white font-bold text-sm tracking-widest uppercase">
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg> 
              {restaurant.rating?.toFixed(1) || 'New'} Rating
            </span>
            <span className="opacity-40">|</span>
            <span>{restaurant.priceRange || '$$'}</span>
            <span className="opacity-40">|</span>
            <span>{restaurant.address?.city || restaurant.address?.areaLocality || 'UK'}</span>
          </div>
          {restaurant.fsaRating?.value && restaurant.fsaRating.value !== 'Exempt' && (
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
            <section className="overflow-hidden rounded-[2.2rem] border border-[#e9dfd0] bg-white shadow-[0_22px_70px_rgba(65,48,24,0.08)]">
              <div className="border-b border-[#f0e8db] bg-[linear-gradient(135deg,#fbf8f2_0%,#f8f4ec_100%)] p-6 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#8e5c2d]">
                      Curated Menu
                    </p>
                    <h2 className="mt-3 text-4xl font-black tracking-tight text-[#1c1917]">
                      Designed to feel like a destination, not a list
                    </h2>
                    <p className="mt-4 text-base leading-8 text-[#6d6358]">
                      Browse the standout dishes, signature sections, and high-intent menu story of{' '}
                      {restaurant.name}.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category);
                          jumpToCategory(category);
                        }}
                        className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                          activeCategory === category
                            ? 'bg-[#1f2e17] text-white shadow-[0_10px_30px_rgba(31,46,23,0.18)]'
                            : 'bg-[#f1eadd] text-[#675d52] hover:bg-[#e7ded0]'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {menus.length === 0 ? (
                  <div className="rounded-[1.9rem] border border-dashed border-[#dfd3c1] bg-[#faf6ef] px-6 py-14 text-center">
                    <p className="text-sm uppercase tracking-[0.32em] text-[#8e5c2d]">Menu</p>
                    <h3 className="mt-3 text-2xl font-bold text-[#1c1917]">Coming Soon</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6d6358]">
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
                        <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#f0e8db] pb-4">
                          <h3 className="text-3xl font-black uppercase tracking-tight text-[#1c1917]">
                            {menu.category || 'Menu'}
                          </h3>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9d9284]">
                            {menu.items?.length || 0} dishes
                          </span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          {(menu.items || []).map((item, itemIndex) => {
                            const itemBadges = getItemBadges(item);
                            const itemAllergens = getItemAllergens(item);

                            return (
                              <article
                                key={`${item.name || 'item'}-${itemIndex}`}
                                className="group overflow-hidden rounded-[1.9rem] border border-[#f0e8db] bg-[linear-gradient(135deg,#ffffff_0%,#fcfaf6_100%)] shadow-[0_18px_45px_rgba(64,48,20,0.06)]"
                              >
                                <div className="relative h-56 overflow-hidden bg-[#f4ede2]">
                                  <img
                                    src={getItemImage(item, restaurant)}
                                    alt={item.name}
                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(20,20,18,0.32)_100%)]" />
                                  {item.isAvailable === false ? (
                                    <span className="absolute right-4 top-4 rounded-full bg-[#b62828] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                                      Unavailable
                                    </span>
                                  ) : null}
                                  <div className="absolute bottom-4 left-4">
                                    <div className="inline-flex rounded-full bg-white/95 px-4 py-2 text-sm font-black text-[#2f6a34] shadow-sm">
                                      {priceFormatter.format(Number(item.price || 0))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex h-full flex-col p-6 sm:p-7">
                                  <div>
                                    <h4 className="text-2xl font-black tracking-tight text-[#1c1917]">
                                      {item.name}
                                    </h4>
                                    <p className="mt-3 max-w-2xl text-sm leading-8 text-[#6d6358]">
                                      {item.description || 'Signature details coming soon.'}
                                    </p>
                                  </div>

                                  <div className="mt-6 flex flex-wrap gap-2">
                                    {itemBadges.map((badge) => (
                                      <span
                                        key={badge}
                                        className="rounded-full bg-[#edf3e4] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#47692e]"
                                      >
                                        {badge}
                                      </span>
                                    ))}
                                    {itemAllergens.slice(0, 4).map((allergen) => (
                                      <span
                                        key={allergen}
                                        className="rounded-full bg-[#fff1f1] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b62828]"
                                      >
                                        {allergen}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="mt-auto pt-8">
                                    <div className="rounded-[1.5rem] bg-[#f8f3ea] px-5 py-4 text-sm leading-7 text-[#5f5549]">
                                      Rich imagery, stronger typography, and softer luxury surfaces turn each dish into a more memorable showcase block.
                                    </div>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-[2rem] border border-[#e9dfd0] bg-[#1f2e17] p-6 text-white shadow-[0_18px_50px_rgba(31,46,23,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Culinary identity
                </p>
                <p className="mt-4 text-2xl font-black leading-tight">
                  Premium presentation that gives the restaurant real brand presence.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_45px_rgba(64,48,20,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                  Atmosphere
                </p>
                <p className="mt-4 text-base leading-8 text-[#6d6358]">
                  Hero banner, logo treatment, and layered content blocks work together to make the page feel intentional and memorable.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#e9dfd0] bg-[linear-gradient(135deg,#fff7ea_0%,#fffdf8_100%)] p-6 shadow-[0_18px_45px_rgba(64,48,20,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                  Brand clarity
                </p>
                <p className="mt-4 text-base leading-8 text-[#6d6358]">
                  Structured information and softer premium surfaces make the restaurant easier to trust at first glance.
                </p>
              </div>
            </section>

            <section className="mt-16">
              <div className="mb-10">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#8e5c2d]">
                  Guest Impressions
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-[#1c1917]">
                  The Guest Journal
                </h2>
                <p className="mt-3 text-base text-[#6d6358]">
                  Reviews displayed like editorial testimonials rather than generic cards.
                </p>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-[#dfd3c1] bg-white px-6 py-12 text-center text-[#6d6358] shadow-[0_18px_45px_rgba(64,48,20,0.04)]">
                  Reviews will appear here once guests start sharing their experience.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {reviews.slice(0, 3).map((review, index) => (
                    <article
                      key={`${getReviewAuthor(review)}-${index}`}
                      className="rounded-[2rem] border border-[#e9dfd0] bg-white p-7 shadow-[0_18px_45px_rgba(64,48,20,0.06)]"
                    >
                      <div className="flex gap-1 text-[#efb634]">
                        {[...Array(5)].map((_, starIndex) => (
                          <HiStar
                            key={starIndex}
                            className={`h-5 w-5 ${starIndex < (review.rating || 5) ? 'fill-current' : 'text-[#ddd1bc]'}`}
                          />
                        ))}
                      </div>
                      <p className="mt-6 text-[15px] italic leading-8 text-[#4f473d]">
                        "{review.comment || 'Wonderful food and warm service.'}"
                      </p>
                      <div className="mt-7 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f2e17] text-sm font-semibold text-white">
                          {getReviewAuthor(review).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1c1917]">
                            {getReviewAuthor(review)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9d9284]">
                            {review.date || 'Recent guest'}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:pt-8">
            <div className="overflow-hidden rounded-[2rem] border border-[#e9dfd0] bg-white shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <div className="h-44 overflow-hidden">
                <img
                  src={restaurant.bannerImage || restaurant.featuredImage || pickImage(restaurant, 'thumb')}
                  alt={restaurant.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                  <HiLocationMarker className="h-4 w-4" />
                  Location
                </p>
                <h3 className="mt-5 text-2xl font-black text-[#1c1917]">
                  {restaurant.address?.areaLocality || restaurant.address?.city || 'Visit us'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#6d6358]">{address}</p>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1f2e17] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-[#2d4121]"
                  >
                    Open map
                    <HiArrowSmRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                <HiLocationMarker className="h-4 w-4" />
                Quick facts
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                    Price range
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#1c1917]">
                    {restaurant.priceRange || 'Available on request'}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                    Cuisine
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#1c1917]">
                    {restaurant.cuisineType || 'Signature specials'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                <HiClock className="h-4 w-4" />
                Opening Hours
              </p>
              {todayHours ? (
                <div className="mt-4 rounded-[1.5rem] bg-[#1f2e17] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    {todayHours.status}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{todayHours.hours}</p>
                </div>
              ) : null}
              <div className="mt-5 space-y-4 text-sm">
                {openingHours.map(({ day, short, label, isClosed }) => (
                  <div key={day} className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.18em] text-[#9d9284]">{short}</span>
                    <span className={isClosed ? 'text-[#b62828]' : 'font-medium text-[#1c1917]'}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                <HiPhone className="h-4 w-4" />
                Inquiries
              </p>
              <div className="mt-5 space-y-5">
                {restaurant.contactNumber ? (
                  <a href={`tel:${restaurant.contactNumber}`} className="flex items-center gap-4 text-sm text-[#5f5549] transition hover:text-[#1c1917]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf6ef] text-[#8e5c2d]">
                      <HiPhone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">Reservations</p>
                      <p className="mt-1 font-medium">{restaurant.contactNumber}</p>
                    </div>
                  </a>
                ) : null}

                {restaurant.email ? (
                  <a href={`mailto:${restaurant.email}`} className="flex items-center gap-4 text-sm text-[#5f5549] transition hover:text-[#1c1917]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf6ef] text-[#8e5c2d]">
                      <HiMail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">Email</p>
                      <p className="mt-1 font-medium break-all">{restaurant.email}</p>
                    </div>
                  </a>
                ) : null}

                {restaurant.website ? (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 text-sm text-[#5f5549] transition hover:text-[#1c1917]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf6ef] text-[#8e5c2d]">
                      <HiGlobe className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d9284]">Website</p>
                      <p className="mt-1 font-medium">Visit restaurant website</p>
                    </div>
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
