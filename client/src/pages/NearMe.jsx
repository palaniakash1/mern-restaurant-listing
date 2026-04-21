import { useState, useEffect, useCallback } from 'react';
import { HiLocationMarker, HiStar } from 'react-icons/hi';
import { getNearbyRestaurants, listCategories } from '../services/restaurantService';
import { NearbyRestaurantCard } from '../components/public/NearbyRestaurantCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { joinClasses } from '../utils/publicPage';

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'A-Z' }
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
    <main className="!bg-[#fff8f7] min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 !bg-gradient-to-br from-[#c31e18] to-[#df2921]">
          <div className="absolute -top-24 -right-24 w-96 h-96 !bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 !bg-black/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 px-6 text-center max-w-3xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full !bg-white/10 px-5 py-2.5 text-sm font-medium !text-white backdrop-blur">
            <HiLocationMarker className="h-5 w-5" />
            {locationLoading ? (
              <span className="animate-pulse">Getting your location...</span>
            ) : locationError ? (
              <span className="!text-white/70">Showing restaurants in London</span>
            ) : (
              <span>Restaurants near you</span>
            )}
          </div>

          <h1 className="text-4xl font-bold !text-white md:text-5xl lg:text-6xl font-[Manrope]">
            Near Me
          </h1>
          <p className="mt-4 max-w-lg mx-auto text-lg !text-white/80">
            Discover the best dining spots in your vicinity
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mx-auto max-w-7xl px-6 -mt-8 relative z-10">
        <div className="!bg-white rounded-2xl shadow-2xl p-5 mb-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium !text-[#534342]">Sort by:</span>
                <div className="flex gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleFilterChange('sortBy', opt.value)}
                      className={joinClasses(
                        'rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200',
                        filters.sortBy === opt.value
                          ? '!bg-[#bf1e18] !text-white shadow-lg shadow-[#bf1e18]/30'
                          : '!bg-[#fff1f0] !text-[#bf1e18] hover:!bg-[#bf1e18] hover:!text-white'
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
                  'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-200',
                  locationError
                    ? 'border-[#bf1e18] !text-[#bf1e18] hover:!bg-[#fff1f0]'
                    : 'border-[#d8c2c0] !text-[#534342] hover:!bg-[#fff1f0]'
                )}
              >
                <HiLocationMarker className="h-4 w-4" />
                {locationLoading ? 'Locating...' : locationError ? 'Retry' : 'Refresh'}
              </button>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-sm font-medium !text-[#534342] shrink-0">Cuisine:</span>
                <div className="flex gap-2">
                  {categories.slice(0, 8).map((cat) => (
                    <button
                      key={cat._id || cat.id}
                      className="shrink-0 rounded-full border border-[#d8c2c0] !bg-white px-4 py-2 text-sm font-bold !text-[#534342] transition hover:border-[#bf1e18] hover:!text-[#bf1e18]"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} variant="restaurant" />
            ))}
          </div>
        ) : error ? (
          <div className="!bg-white rounded-2xl shadow-lg p-12 text-center">
            <HiLocationMarker className="mx-auto h-12 w-12 !text-[#bf1e18]" />
            <h3 className="mt-4 text-lg font-bold !text-[#201a1a] font-[Manrope]">
              Unable to Load Restaurants
            </h3>
            <p className="mt-2 !text-[#534342]">{error}</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="!bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 !bg-[#fff1f0] rounded-full flex items-center justify-center mx-auto mb-4">
              <HiLocationMarker className="h-10 w-10 !text-[#bf1e18]" />
            </div>
            <h3 className="text-xl font-bold !text-[#201a1a] font-[Manrope]">
              No Restaurants Found
            </h3>
            <p className="mt-2 !text-[#534342]">
              No restaurants found in your area
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm !text-[#534342]">
              Found <span className="font-bold !text-[#bf1e18]">{restaurants.length}</span> restaurants nearby
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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