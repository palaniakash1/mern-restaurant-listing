import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HiSearch,
  HiLocationMarker,
  HiStar,
  HiArrowRight,
  HiClock
} from 'react-icons/hi';
import { listRestaurants } from '../services/restaurantService';
import { SkeletonCard } from '../components/SkeletonCard';
import { publicShellClass } from '../utils/publicPage';

export default function Restaurants() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam =
    searchParams.get('categories') || searchParams.get('category') || '';
  const [searchTerm, setSearchTerm] = useState(query);
  const [category, setCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('rating');
  const [restaurants, setRestaurants] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const response = await listRestaurants({ limit: 100 });
        setAllRestaurants(response.data || []);
        setRestaurants(response.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const filtered = allRestaurants.filter((restaurant) => {
      const q = searchParams.get('q') || '';
      const categoryParam =
        searchParams.get('categories') || searchParams.get('category') || '';
      const cityParam = searchParams.get('city') || '';

      const matchesSearch =
        !q ||
        restaurant.name?.toLowerCase().includes(q.toLowerCase()) ||
        restaurant.tagline?.toLowerCase().includes(q.toLowerCase()) ||
        (restaurant.categories || []).some((c) =>
          c.toLowerCase().includes(q.toLowerCase())
        );

      const matchesCategory =
        !categoryParam ||
        (restaurant.categories || []).includes(categoryParam) ||
        restaurant.category === categoryParam;

      const matchesCity =
        !cityParam ||
        restaurant.address?.city?.toLowerCase() ===
          cityParam.toLowerCase().replace(/-/g, ' ');

      return matchesSearch && matchesCategory && matchesCity;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'reviews')
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    setRestaurants(sorted);
  }, [searchParams, allRestaurants, sortBy]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        allRestaurants
          .flatMap((r) => r.categories || [r.category])
          .filter(Boolean)
      )
    ];
  }, [allRestaurants]);

  const getOpeningStatus = (restaurant) => {
    if (!restaurant.openingHours || !restaurant.openingHours.length)
      return null;
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = restaurant.openingHours.find((h) => h.day === day);
    if (!todayHours || todayHours.closed)
      return { status: 'Closed', color: '!text-[#bf1e18]' };

    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const openTime = todayHours.open;
    const closeTime = todayHours.close;

    if (currentTime >= openTime && currentTime < closeTime) {
      if (
        closeTime &&
        new Date(`1970-01-01 ${closeTime}`).getTime() -
          new Date(`1970-01-01 ${currentTime}`).getTime() <
          3600000
      ) {
        return { status: 'Closes Soon', color: '!text-[#d97706]' };
      }
      return { status: 'Open Now', color: '!text-[#16a34a]' };
    }
    return { status: 'Closed', color: '!text-[#bf1e18]' };
  };

  if (loading) {
    return (
      <div className="!bg-[#fff8f7] min-h-screen">
        <header className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 !bg-gradient-to-br from-[#c31e18] to-[#df2921]">
            <div className="absolute -top-24 -right-24 w-96 h-96 !bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 !bg-black/10 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 text-center">
            <div className="h-16 w-96 mx-auto rounded-full !bg-white/20 animate-pulse mb-4" />
            <div className="h-6 w-80 mx-auto rounded-full !bg-white/20 animate-pulse" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
          <div className="!bg-white rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 !bg-[#fff1f0] rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} variant="restaurant" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="!bg-[#fff8f7] min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8 !bg-white rounded-2xl shadow-2xl">
          <div className="w-20 h-20 !bg-[#fff1f0] rounded-full flex items-center justify-center mx-auto mb-4">
            <HiSearch className="w-10 h-10 !text-[#bf1e18]" />
          </div>
          <h3 className="text-2xl font-bold !text-[#201a1a] mb-2 font-[Manrope]">
            Failed to Load Restaurants
          </h3>
          <p className="!text-[#534342]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 !bg-[#bf1e18] !text-white rounded-full font-bold hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={publicShellClass + ' pt-24'}>
      <div className="!bg-[#fff8f7] min-h-screen">
        {/* Hero Header */}
        <header className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 !bg-gradient-to-br from-[#c31e18] to-[#df2921]">
            <div className="absolute -top-24 -right-24 w-96 h-96 !bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 !bg-black/10 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h1 className="!text-white font-[Manrope] text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
              what&apos;s on your plate?
            </h1>
            <p className="!text-white/80 text-lg md:text-xl font-[Inter]">
              Discover handpicked restaurants where every dish is thoughtfully
              crafted
            </p>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
          <div className="!bg-white rounded-2xl shadow-2xl p-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="flex-1 w-full relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 !bg-[#bf1e18]/10 rounded-full z-10">
                  <HiSearch className="w-4 h-4 !text-[#bf1e18]" />
                </div>
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines, or dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full !pl-14 pr-4 py-4 !bg-[#fff8f7] rounded-full border border-[#d8c2c0] !text-[#201a1a] placeholder:!text-[#534342] focus:!border-[#bf1e18] focus:!outline-none transition-colors"
                />
              </div>
              <div className="w-full md:w-48">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-4 !bg-[#fff8f7] rounded-full border border-[#d8c2c0] !text-[#201a1a] appearance-none cursor-pointer focus:!border-[#bf1e18] focus:!outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-4 !bg-[#fff8f7] rounded-full border border-[#d8c2c0] !text-[#201a1a] appearance-none cursor-pointer focus:!border-[#bf1e18] focus:!outline-none"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviewed</option>
                  <option value="name">A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <main className="max-w-7xl mx-auto px-6 py-16">
          {/* <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold !text-[#201a1a] font-[Manrope]">
              {restaurants.length} {restaurants.length === 1 ? 'Restaurant' : 'Restaurants'}
            </h2>
            <p className="!text-[#534342] mt-1">Curated dining experiences</p>
          </div>
        </div> */}

          {/* Featured Restaurants */}
          {restaurants.length >= 2 &&
            (() => {
              const featured = restaurants.slice(0, 2);
              return (
                <div className="mb-16">
                  <div className="flex items-center gap-2 mb-8">
                    <HiStar
                      className="w-6 h-6 !text-[#bf1e18]"
                      fill="currentColor"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider !text-[#bf1e18]">
                      Featured Selection
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {featured.map((restaurant, idx) => {
                      const fhrsBadgeUrl =
                        restaurant.fsaRating?.value &&
                        restaurant.fsaRating.value !== 'Exempt'
                          ? `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${restaurant.fsaRating.value}.svg`
                          : null;
                      const openingStatus = getOpeningStatus(restaurant);

                      return (
                        <Link
                          key={restaurant._id}
                          to={`/restaurants/${restaurant.slug}`}
                          className="group relative block !bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
                        >
                          <div className="relative h-72 overflow-hidden">
                            <img
                              alt={restaurant.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              src={
                                restaurant.bannerImage || restaurant.imageLogo
                              }
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute top-4 left-4 flex gap-2">
                              <span className="!bg-[#bf1e18] !text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {idx === 0 ? "Editor's Pick" : 'Top Rated'}
                              </span>
                            </div>
                            {openingStatus && (
                              <div
                                className={`absolute top-4 right-4 px-3 py-1 rounded-full !bg-white/90 text-xs font-bold ${openingStatus.color}`}
                              >
                                {openingStatus.status}
                              </div>
                            )}
                            {fhrsBadgeUrl && (
                              <div className="absolute bottom-4 left-4 !bg-white rounded-full p-1.5 shadow-lg">
                                <img
                                  src={fhrsBadgeUrl}
                                  alt={`FSA Rating ${restaurant.fsaRating.value}`}
                                  className="h-10 w-auto"
                                />
                              </div>
                            )}
                            <div className="absolute bottom-4 right-4 !bg-white rounded-xl p-1 shadow-lg">
                              <img
                                src={restaurant.imageLogo}
                                alt={`${restaurant.name} logo`}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="px-3 py-1 rounded-full !bg-[#fff1f0] !text-[#bf1e18] text-[10px] font-bold uppercase tracking-wider">
                                {restaurant.categories?.[0] || 'Restaurant'}
                              </span>
                              {restaurant.isTrending && (
                                <span className="px-2 py-0.5 rounded-full !bg-[#bf1e18]/10 !text-[#bf1e18] text-[9px] font-bold uppercase">
                                  Trending
                                </span>
                              )}
                              <div className="flex items-center gap-1 ml-auto">
                                <HiStar
                                  className="w-4 h-4 !text-yellow-500"
                                  fill="currentColor"
                                />
                                <span className="font-bold !text-[#201a1a]">
                                  {restaurant.rating || 'New'}
                                </span>
                                <span className="!text-[#534342]/70 text-xs">
                                  ({restaurant.reviewCount || 0})
                                </span>
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold !text-[#201a1a] mb-2 group-hover:!text-[#bf1e18] transition-colors font-[Manrope]">
                              {restaurant.name}
                            </h3>
                            <p className="!text-[#534342] mb-4 line-clamp-2">
                              {restaurant.tagline}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-[#d8c2c0]/30">
                              <div className="flex items-center gap-2 !text-[#534342]">
                                <HiLocationMarker className="w-4 h-4" />
                                <span className="text-sm">
                                  {restaurant.address?.city},{' '}
                                  {restaurant.address?.country}
                                </span>
                              </div>
                              <span className="flex items-center gap-2 px-5 py-2.5 !bg-[#bf1e18] !text-white rounded-full font-bold transition-transform hover:scale-105">
                                View Details
                                <HiArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* Restaurant Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.slice(2).map((restaurant) => {
              const openingStatus = getOpeningStatus(restaurant);

              return (
                <Link
                  key={restaurant._id}
                  to={`/restaurants/${restaurant.slug}`}
                  className="group !bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <div className="h-52 overflow-hidden relative rounded-t-xl">
                    <img
                      alt={restaurant.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      src={
                        restaurant.bannerImage ||
                        restaurant.featuredImage ||
                        restaurant.imageLogo
                      }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {restaurant.isTrending && (
                      <div className="absolute top-3 right-3 !bg-[#bf1e18] !text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                        Trending
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 !bg-white rounded-lg p-0.5 shadow-lg">
                      <img
                        src={restaurant.imageLogo}
                        alt={`${restaurant.name} logo`}
                        className="w-10 h-10 rounded-md object-cover"
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full !bg-[#fff1f0] !text-[#bf1e18] text-[8px] font-bold uppercase tracking-wider">
                        {restaurant.categories?.[0] || 'Restaurant'}
                      </span>
                      {openingStatus && (
                        <span
                          className={`text-[10px] font-bold ${openingStatus.color}`}
                        >
                          {openingStatus.status}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg !text-[#201a1a] mb-1 group-hover:!text-[#bf1e18] transition-colors font-[Manrope]">
                      {restaurant.name}
                    </h3>
                    <p className="!text-[#534342] text-sm mb-3 line-clamp-1">
                      {restaurant.tagline}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 !text-[#534342] text-xs">
                        <HiStar
                          className="w-3.5 h-3.5 !text-yellow-500"
                          fill="currentColor"
                        />
                        <span className="font-bold">
                          {restaurant.rating || 'New'}
                        </span>
                        <span className="!text-[#534342]/70">
                          ({restaurant.reviewCount || 0})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 !text-[#534342] text-xs">
                        <HiLocationMarker className="w-3.5 h-3.5" />
                        <span>{restaurant.address?.city}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {restaurants.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 !bg-[#fff1f0] border-2 border-dashed border-[#d8c2c0] rounded-full flex items-center justify-center mx-auto mb-4">
                <HiSearch className="w-12 h-12 !text-[#bf1e18]" />
              </div>
              <h3 className="text-2xl font-bold !text-[#201a1a] mb-2 font-[Manrope]">
                No Restaurants Found
              </h3>
              <p className="!text-[#534342] max-w-md mx-auto">
                Try adjusting your search or filters to discover more dining
                options.
              </p>
            </div>
          )}
        </main>
      </div>
    </main>
  );
}
