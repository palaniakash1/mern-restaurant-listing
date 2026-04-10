import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiLocationMarker, HiArrowRight, HiFilter } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, surfaceCardClass, sectionEyebrowClass, primaryButtonClass } from '../../utils/publicPage';
import { getNearbyRestaurants, listCategories } from '../../services/restaurantService';
import RestaurantSpotlightCard from './RestaurantSpotlightCard';

const RADIUS_OPTIONS = [
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
  { value: 50000, label: '50 km' }
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name' }
];

const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278, city: 'London' };

export function NearbyRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [fallbackCity, setFallbackCity] = useState(null);

  const [filters, setFilters] = useState({
    radius: 50000,
    sortBy: 'rating',
    categories: '',
    isOpenNow: false
  });

  const [location, setLocation] = useState(null);

  const fetchNearby = useCallback(async (lat, lng, filterOptions) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNearbyRestaurants({
        lng,
        lat,
        radius: filterOptions.radius,
        limit: 12,
        sortBy: filterOptions.sortBy,
        categories: filterOptions.categories || undefined,
        isOpenNow: filterOptions.isOpenNow || undefined
      });
      setRestaurants(response.data?.restaurants || response.data || []);
    } catch {
      setError('Unable to fetch nearby restaurants');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Location access is required to find restaurants near you. Please enable location services in your browser settings.');
      setLocationEnabled(false);
      const { lat, lng, city } = DEFAULT_LOCATION;
      setFallbackCity(city);
      fetchNearby(lat, lng, filters);
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationEnabled(true);
        fetchNearby(latitude, longitude, filters);
      },
      () => {
        setLocationError('Allow location access to find restaurants near you');
        setLocationEnabled(false);
        const { lat, lng, city } = DEFAULT_LOCATION;
        setFallbackCity(city);
        fetchNearby(lat, lng, { ...filters, sortBy: 'rating' });
      }
    );
  }, [fetchNearby, filters]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    listCategories().then((res) => {
      if (res.data?.categories) {
        setCategories(res.data.categories);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearby(location.lat, location.lng, filters);
    }
  }, [filters, location, fetchNearby]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <section className={sectionWrapClass}>
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          <p className="mt-4 text-sm text-gray-600">Finding restaurants near you...</p>
        </div>
      </section>
    );
  }

  if (locationError) {
    return (
      <section className={sectionWrapClass}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className={sectionEyebrowClass}>Discovery</p>
            <h2 className="mt-3 text-2xl font-bold text-[#b62828] sm:text-3xl">
              Enable location to view restaurants near you!
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
              Showing restaurants in {fallbackCity}. Enable location for personalized results.
            </p>
          </div>
          <Link to="/restaurants" className={primaryButtonClass}>
            View All
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className={joinClasses(surfaceCardClass, 'mb-6 relative overflow-hidden p-6')}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#b62828]/5 to-transparent" />
          <div className="relative flex flex-col items-center text-center">
            <HiLocationMarker className="h-10 w-10 text-[#b62828]" />
            <p className="mt-4 text-lg font-semibold text-[#23411f]">
              {locationError}
            </p>
            <button
              onClick={requestLocation}
              className={joinClasses(primaryButtonClass, 'mt-4')}
            >
              <HiLocationMarker className="h-5 w-5" />
              Enable Location
            </button>
          </div>
        </div>

        {restaurants.length > 0 && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.slice(0, 6).map((restaurant) => (
              <RestaurantSpotlightCard
                key={restaurant._id || restaurant.id}
                restaurant={restaurant}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Discovery</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            {!locationEnabled && locationError ? 'Enable location to view restaurants near you!' : 'Nearby Restaurants'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Discover exceptional dining right in your neighborhood
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={joinClasses(
              'flex items-center gap-2 rounded-lg border border-[#dce6c1] px-4 py-2 text-sm font-medium transition-colors',
              showFilters ? 'bg-[#23411f] text-white' : 'text-[#23411f] hover:bg-[#dce6c1]/30'
            )}
          >
            <HiFilter className="h-5 w-5" />
            Filters
          </button>
          <Link to="/restaurants" className={primaryButtonClass}>
            View All
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className={joinClasses(surfaceCardClass, 'mb-6 p-4')}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="radius" className="text-sm font-medium text-gray-700">Radius:</label>
              <select
                id="radius"
                value={filters.radius}
                onChange={(e) => handleFilterChange('radius', Number(e.target.value))}
                className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="category" className="text-sm font-medium text-gray-700">Category:</label>
                <select
                  id="category"
                  value={filters.categories}
                  onChange={(e) => handleFilterChange('categories', e.target.value)}
                  className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
                >
                  <option value="">All</option>
                  {categories.map((cat) => (
                    <option key={cat._id || cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.isOpenNow}
                onChange={(e) => handleFilterChange('isOpenNow', e.target.checked)}
                className="h-4 w-4 rounded border-[#dce6c1] text-[#8fa31e] focus:ring-[#8fa31e]"
              />
              <span className="text-sm font-medium text-gray-700">Open Now</span>
            </label>
          </div>
        </div>
      )}

      {error ? (
        <div className={joinClasses(surfaceCardClass, 'p-8 text-center')}>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      ) : restaurants.length === 0 ? (
        <div className={joinClasses(surfaceCardClass, 'p-8 text-center')}>
          <p className="text-sm text-gray-600">No restaurants found nearby</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.slice(0, 12).map((restaurant) => (
            <RestaurantSpotlightCard
              key={restaurant._id || restaurant.id}
              restaurant={restaurant}
            />
          ))}
        </div>
      )}

      {restaurants.length > 0 && (
        <div className="mt-8 text-center">
          <Link to="/restaurants" className={joinClasses(primaryButtonClass, 'inline-flex')}>
            View All Nearby Restaurants
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default NearbyRestaurants;