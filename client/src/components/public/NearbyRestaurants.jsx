import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiLocationMarker, HiArrowRight, HiFilter } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, surfaceCardClass, sectionEyebrowClass, primaryButtonClass } from '../../utils/publicPage';
import { getNearbyRestaurants, listCategories } from '../../services/restaurantService';
import { NearbyRestaurantCard } from './NearbyRestaurantCard';

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
  const [distances, setDistances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [, setFallbackCity] = useState(null);

  const [filters, setFilters] = useState({
    radius: 50000,
    sortBy: 'rating',
    categories: '',
    isOpenNow: false
  });

  const [location, setLocation] = useState(null);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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

      let data = response.data?.restaurants || response.data || [];

      const distanceMap = {};
      data.forEach((restaurant) => {
        if (restaurant.address?.location?.coordinates) {
          const [restLng, restLat] = restaurant.address.location.coordinates;
          distanceMap[restaurant._id] = calculateDistance(lat, lng, restLat, restLng);
        }
      });

      if (filterOptions.sortBy === 'distance') {
        data.sort((a, b) => (distanceMap[a._id] || Infinity) - (distanceMap[b._id] || Infinity));
      } else if (filterOptions.sortBy === 'rating') {
        data.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (filterOptions.sortBy === 'name') {
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      setRestaurants(data);
      setDistances(distanceMap);
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

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Discovery</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            {!locationEnabled && locationError
              ? 'Enable location to view restaurants near you!'
              : 'Nearby Restaurants'}
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
              showFilters
                ? 'bg-[#23411f] text-white'
                : 'text-[#23411f] hover:bg-[#dce6c1]/30'
            )}
          >
            <HiFilter className="h-5 w-5" />
            Filters
          </button>
          <Link to="/near-me" className={primaryButtonClass}>
            View All
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className={joinClasses(surfaceCardClass, 'mb-6 p-4')}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="radius"
                className="text-sm font-medium text-gray-700"
              >
                Radius:
              </label>
              <select
                id="radius"
                value={filters.radius}
                onChange={(e) =>
                  handleFilterChange('radius', Number(e.target.value))
                }
                className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="sortBy"
                className="text-sm font-medium text-gray-700"
              >
                Sort by:
              </label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="category"
                  className="text-sm font-medium text-gray-700"
                >
                  Category:
                </label>
                <select
                  id="category"
                  value={filters.categories}
                  onChange={(e) =>
                    handleFilterChange('categories', e.target.value)
                  }
                  className="rounded-lg border border-[#dce6c1] px-3 py-2 text-sm focus:border-[#8fa31e] focus:outline-none focus:ring-1 focus:ring-[#8fa31e]"
                >
                  <option value="">All</option>
                  {categories.map((cat) => (
                    <option key={cat._id || cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.isOpenNow}
                onChange={(e) =>
                  handleFilterChange('isOpenNow', e.target.checked)
                }
                className="h-4 w-4 rounded border-[#dce6c1] text-[#8fa31e] focus:ring-[#8fa31e]"
              />
              <span className="text-sm font-medium text-gray-700">
                Open Now
              </span>
            </label>
          </div>
        </div>
      )}

      {locationError && (
        <div
          className={joinClasses(
            surfaceCardClass,
            'mb-6 relative overflow-hidden p-6'
          )}
        >
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
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm"
            >
              <div className="aspect-[4/3] rounded-xl bg-[#edf4dc] animate-pulse" />
              <div className="mt-4 h-4 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={joinClasses(surfaceCardClass, 'p-8 text-center')}>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      ) : restaurants.length === 0 ? (
        <div className={joinClasses(surfaceCardClass, 'p-8 text-center')}>
          <p className="text-sm text-gray-600">No restaurants found nearby</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.slice(0, 6).map((restaurant) => (
              <NearbyRestaurantCard
                key={restaurant._id || restaurant.id}
                restaurant={restaurant}
                distance={distances[restaurant._id]}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/near-me"
              className={joinClasses(primaryButtonClass, 'inline-flex')}
            >
              View All Nearby Restaurants
              <HiArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export default NearbyRestaurants;
