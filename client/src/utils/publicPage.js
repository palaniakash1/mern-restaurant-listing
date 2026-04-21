export const joinClasses = (...values) => values.filter(Boolean).join(' ');

export const publicShellClass =
  'min-h-screen !bg-[#fff8f7] !text-[#201a1a]';

export const sectionWrapClass = 'max-w-7xl mx-auto px-6 py-16';

export const surfaceCardClass =
  '!rounded-2xl !border-[#d8c2c0]/30 !bg-white shadow-sm';

export const elevatedCardClass =
  '!rounded-xl !border-[#d8c2c0]/10 !bg-white shadow-lg hover:shadow-xl transition-shadow';

export const mutedPanelClass =
  'rounded-[1.5rem] !border-[#ebf0d7] !bg-[#fbfcf7] shadow-sm';

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full !bg-[#bf1e18] !px-6 !py-3 text-sm font-bold !text-white transition hover:opacity-90 hover:scale-105 active:scale-95';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full !border border-[#d8c2c0] !bg-white !px-6 !py-3 text-sm font-bold !text-[#bf1e18] transition hover:!bg-[#bf1e18] hover:!text-white';

export const ghostButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[1rem] !border-[#d9e2bc] !bg-[#f8fbf1] !px-4 !py-3 text-sm font-semibold !text-[#4f5f1d] transition hover:!border-[#8fa31e] hover:!bg-white';

export const inputClass =
  'w-full rounded-[1rem] !border-[#d9e2bc] !bg-[#f8fbf1] !px-4 !py-3 text-sm !text-[#23411f] placeholder:!text-[#6b7280] focus:!border-[#8fa31e] focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-[#dbe9ab]/50';

export const sectionEyebrowClass =
  'text-xs font-bold uppercase tracking-[0.2em] !text-[#bf1e18]';

export const getRestaurantCategoryNames = (restaurant) =>
  (restaurant?.categories || [])
    .map((category) => {
      if (typeof category === 'string') return category;
      if (category?.name) return category.name;
      return null;
    })
    .filter(Boolean);

export const formatRestaurantAddress = (address) =>
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

export const getRestaurantLocationLabel = (restaurant) =>
  [
    restaurant?.address?.areaLocality,
    restaurant?.address?.city,
    restaurant?.address?.country
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

export const pickRestaurantImage = (restaurant, fallbackIndex = 0) => {
  const image = [
    restaurant?.bannerImage,
    restaurant?.gallery?.[fallbackIndex],
    restaurant?.gallery?.[0],
    restaurant?.imageLogo
  ].find(Boolean);

  return (
    image ||
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  );
};

export const getFsaBadgeUrl = (value) =>
  value && value !== 'Exempt'
    ? `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${value}.svg`
    : null;

export const buildMapUrl = (restaurant) => {
  const coordinates = restaurant?.address?.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    return `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;
  }

  const address = formatRestaurantAddress(restaurant?.address);
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
};

export const getFavoriteStorageKey = (user) =>
  `eatwisely:favorites:${user?._id || user?.id || 'guest'}`;

export const readFavorites = (user) => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getFavoriteStorageKey(user));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeFavorites = (user, favorites) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getFavoriteStorageKey(user), JSON.stringify(favorites));
};