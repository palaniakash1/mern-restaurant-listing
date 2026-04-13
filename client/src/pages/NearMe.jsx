import { useState, useEffect, useCallback } from 'react';
import { HiLocationMarker } from 'react-icons/hi';
import { getNearbyRestaurants, listCategories } from '../services/restaurantService';
import { NearbyRestaurantCard } from '../components/public/NearbyRestaurantCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { elevatedCardClass, joinClasses } from '../utils/publicPage';

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviewed' }
];

const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278, city: 'London' };

export default function NearMe() {
  const [restaurants, setRestaurants] = useState([]);
  const [distances, setDistances] = useState({});
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [categories, setCategories] = useState([]);

  const [filters, setFilters] = useState({
    radius: 10000,
    sortBy: 'distance'
  });

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
        limit: 50,
        sortBy: filterOptions.sortBy === 'distance' ? 'distance' : filterOptions.sortBy
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
      } else if (filterOptions.sortBy === 'reviews') {
        data.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
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
      setLocationError('Location is not supported by your browser');
      setLocationLoading(false);
      const { lat, lng } = DEFAULT_LOCATION;
      setUserLocation({ lat, lng });
      fetchNearby(lat, lng, filters);
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLoading(false);
        fetchNearby(latitude, longitude, filters);
      },
      () => {
        setLocationError('Unable to get your location');
        setLocationLoading(false);
        const { lat, lng } = DEFAULT_LOCATION;
        setUserLocation({ lat, lng });
        fetchNearby(lat, lng, filters);
      }
    );
  }, [fetchNearby, filters]);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listCategories()
      .then((res) => {
        if (res.data?.categories) {
          setCategories(res.data.categories);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearby(userLocation.lat, userLocation.lng, filters);
    }
  }, [filters, userLocation, fetchNearby]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)]">
      <div className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#23411f] via-[#3d5c33] to-[#8fa31e]">
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="relative z-10 px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur">
            <HiLocationMarker className="h-5 w-5" />
            {locationLoading ? (
              <span className="animate-pulse">Getting your location...</span>
            ) : locationError ? (
              <span className="text-yellow-200">Showing restaurants in London</span>
            ) : (
              <span>Restaurants near you</span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Near Me
          </h1>
          <p className="mt-4 max-w-lg mx-auto text-lg text-white/80">
            Discover the best dining spots in your vicinity
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-6 pb-16">
        <div className={joinClasses(elevatedCardClass, 'p-5 mb-6')}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Sort by:</span>
                <div className="flex gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleFilterChange('sortBy', opt.value)}
                      className={joinClasses(
                        'rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200',
                        filters.sortBy === opt.value
                          ? 'bg-gradient-to-r from-[#576500] to-[#8fa31e] text-white shadow-md shadow-[#8fa31e]/30'
                          : 'bg-[#f5faeb] text-[#4f5e1d] hover:bg-[#dbe9ab]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={requestLocation}
                className={joinClasses(
                  'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200',
                  locationError
                    ? 'border-[#b62828] text-[#b62828] hover:bg-[#fff5f5]'
                    : 'border-[#8fa31e] text-[#576500] hover:bg-[#8fa31e]/10'
                )}
              >
                <HiLocationMarker className="h-4 w-4" />
                {locationLoading ? 'Locating...' : locationError ? 'Retry Location' : 'Refresh Location'}
              </button>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-sm font-medium text-gray-500 shrink-0">Cuisine:</span>
                <div className="flex gap-2">
                  {categories.slice(0, 6).map((cat) => (
                    <button
                      key={cat._id || cat.id}
                      className="shrink-0 rounded-full border border-[#dce6c1] bg-white px-4 py-2 text-sm font-medium text-[#4f5e1d] transition hover:border-[#8fa31e] hover:bg-[#f5faef]"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonCard key={i} variant="restaurant" />
            ))}
          </div>
        ) : error ? (
          <div className={joinClasses(elevatedCardClass, 'p-12 text-center')}>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className={joinClasses(elevatedCardClass, 'p-12 text-center')}>
            <HiLocationMarker className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-[#23411f]">
              No restaurants found
            </h3>
            <p className="mt-2 text-gray-500">
              No restaurants found in your area
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Found <span className="font-semibold text-[#23411f]">{restaurants.length}</span> restaurants nearby
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {restaurants.map((restaurant) => (
                <NearbyRestaurantCard
                  key={restaurant._id || restaurant.id}
                  restaurant={restaurant}
                  distance={distances[restaurant._id]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
