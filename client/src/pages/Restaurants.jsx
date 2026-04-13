import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listRestaurants } from '../services/restaurantService';
import { SkeletonCard } from '../components/SkeletonCard';

export default function Restaurants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
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
      const matchesSearch =
        restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.tagline?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !category ||
        (restaurant.categories || []).includes(category) ||
        restaurant.category === category;
      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    setRestaurants(sorted);
  }, [searchTerm, category, sortBy, allRestaurants]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        allRestaurants
          .flatMap((r) => r.categories || [r.category])
          .filter(Boolean)
      )
    ];
  }, [allRestaurants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)]">
        <header className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#23411f] via-[#3d5c33] to-[#8fa31e]"></div>
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            ></div>
          </div>
          <div className="relative z-10 text-center px-6">
            <div className="h-16 w-96 mx-auto rounded-xl bg-white/20 animate-pulse mb-4"></div>
            <div className="h-6 w-80 mx-auto rounded-xl bg-white/20 animate-pulse"></div>
          </div>
        </header>

        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 -mt-12 relative z-20">
          <div className="bg-white/80 backdrop-blur rounded-[2rem] shadow-[0_18px_60px_rgba(77,103,22,0.12)] border border-white/50 p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="h-14 bg-[#edf4dc] rounded-[1rem] animate-pulse"></div>
              </div>
              <div>
                <div className="h-14 bg-[#edf4dc] rounded-[1rem] animate-pulse"></div>
              </div>
              <div>
                <div className="h-14 bg-[#edf4dc] rounded-[1rem] animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)] flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-[2rem] shadow-[0_18px_60px_rgba(77,103,22,0.12)] border border-[#dce6c1]">
          <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#8e1d1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#23411f] mb-2">
            Failed to Load Restaurants
          </h3>
          <p className="text-[#4f5f1d]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)]">
      {/* Hero Header */}
      <header className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#23411f] via-[#3d5c33] to-[#8fa31e]"></div>
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-white font-bold text-6xl md:text-8xl tracking-tight mb-4 drop-shadow-lg">
            Discover
          </h1>
          <p className="text-white/90 text-lg md:text-xl tracking-[0.3em] uppercase mb-8 font-medium">
            Exquisite Dining Experiences
          </p>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 -mt-12 relative z-20">
        <div className="bg-white/80 backdrop-blur rounded-[2rem] shadow-[0_18px_60px_rgba(77,103,22,0.12)] border border-white/50 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4f5f1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search restaurants, cuisines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#f8fbf1] rounded-[1rem] border border-[#d9e2bc] text-[#23411f] placeholder-[#4f5f1d]/50 focus:border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-4 bg-[#f8fbf1] rounded-[1rem] border border-[#d9e2bc] text-[#23411f] appearance-none cursor-pointer focus:border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50 focus:outline-none transition-colors"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-4 bg-[#f8fbf1] rounded-[1rem] border border-[#d9e2bc] text-[#23411f] appearance-none cursor-pointer focus:border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50 focus:outline-none transition-colors"
              >
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviewed</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-16">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#23411f] tracking-tight">
              {restaurants.length} {restaurants.length === 1 ? 'Restaurant' : 'Restaurants'} Found
            </h2>
            <p className="text-sm text-[#4f5f1d] mt-1">
              Handpicked selections for discerning palates
            </p>
          </div>
        </div>

        {/* Featured Restaurants */}
        {restaurants.length >= 2 && (() => {
          const featured = restaurants.slice(0, 2);

          return (
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[#8fa31e]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                  Featured Selection
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featured.map((restaurant, idx) => {
                  const fhrsBadgeUrl = restaurant.fsaRating?.value && restaurant.fsaRating.value !== 'Exempt'
                    ? `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${restaurant.fsaRating.value}.svg`
                    : null;

                  return (
                    <Link
                      key={restaurant._id}
                      to={`/restaurants/${restaurant.slug}`}
                      className="group relative block bg-white rounded-[1.5rem] border border-[#dce6c1] shadow-sm hover:shadow-[0_25px_80px_rgba(60,79,25,0.12)] transition-all duration-500 overflow-hidden"
                    >
                      {/* Image Section */}
                      <div className="relative h-64 lg:h-72 overflow-hidden">
                        <img
                          alt={restaurant.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          src={restaurant.bannerImage || restaurant.featuredImage || restaurant.imageLogo}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        {/* Editor's Pick Badge */}
                        <div className="absolute top-4 left-4 bg-[#23411f] text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {idx === 0 ? "Editor's Pick" : 'Top Rated'}
                        </div>
                        {/* FSA Rating Badge */}
                        {fhrsBadgeUrl && (
                          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
                            <img src={fhrsBadgeUrl} alt={`FSA Rating ${restaurant.fsaRating.value}`} className="h-10 w-auto" />
                          </div>
                        )}
                        {/* Logo Badge */}
                        <div className="absolute bottom-4 right-4 bg-white rounded-xl p-1.5 shadow-xl border-2 border-white">
                          <img src={restaurant.imageLogo} alt={`${restaurant.name} logo`} className="w-14 h-14 rounded-lg object-cover" />
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-6 lg:p-7">
                        {/* Tags Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 rounded-full bg-[#f7faef] text-[#23411f] text-[10px] font-bold uppercase tracking-wider">
                            {restaurant.categories?.[0] || 'Restaurant'}
                          </span>
                          {restaurant.isTrending && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8fa31e]/10 text-[#8fa31e] text-[9px] font-bold uppercase tracking-wider">
                              Trending
                            </span>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="font-bold text-[#23411f] text-sm">
                              {restaurant.rating || 'New'}
                            </span>
                            <span className="text-[#4f5f1d]/70 text-xs">
                              ({restaurant.reviewCount || 0})
                            </span>
                          </div>
                        </div>

                        {/* Restaurant Name */}
                        <h3 className="text-xl lg:text-2xl font-bold text-[#23411f] mb-2 group-hover:text-[#8fa31e] transition-colors duration-300">
                          {restaurant.name}
                        </h3>

                        {/* Tagline */}
                        <p className="text-[#4f5f1d] text-sm mb-4 line-clamp-2 leading-relaxed">
                          {restaurant.tagline}
                        </p>

                        {/* Location & CTA */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#dce6c1]/50">
                          <div className="flex items-center gap-2 text-[#4f5f1d]/80 text-xs">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{restaurant.address?.city}, {restaurant.address?.country}</span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8fa31e] hover:bg-[#78871c] text-white rounded-[1rem] text-xs font-semibold transition-colors duration-300">
                            View
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
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
          {restaurants.slice(2).map((restaurant) => (
            <Link
              key={restaurant._id}
              to={`/restaurants/${restaurant.slug}`}
              className="group bg-white rounded-[1.5rem] border border-[#dce6c1] shadow-sm hover:shadow-[0_25px_80px_rgba(60,79,25,0.08)] transition-all duration-300"
            >
              <div className="h-56 overflow-hidden relative rounded-t-[1.5rem]">
                <img
                  alt={restaurant.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={restaurant.bannerImage || restaurant.featuredImage || restaurant.imageLogo}
                />
                {restaurant.isTrending && (
                  <div className="absolute top-4 right-4 bg-[#8fa31e] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Trending
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-white rounded-lg p-0.5 shadow-lg border-2 border-white">
                  <img src={restaurant.imageLogo} alt={`${restaurant.name} logo`} className="w-12 h-12 rounded-lg object-cover" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-[#f7faef] text-[#7e9128] text-[9px] font-bold uppercase tracking-wider">
                    {restaurant.categories?.[0] || 'Restaurant'}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-bold text-sm text-[#23411f]">
                      {restaurant.rating || 'New'}
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-[#23411f] mb-2 group-hover:text-[#8fa31e] transition-colors">
                  {restaurant.name}
                </h3>
                <p className="text-[#4f5f1d] text-sm mb-4 line-clamp-1">
                  {restaurant.tagline}
                </p>
                <div className="flex items-center gap-2 text-[#4f5f1d] text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {restaurant.address?.city}, {restaurant.address?.country}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[#fbfcf7] border-2 border-dashed border-[#dce6c1] rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#4f5f1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#23411f] mb-2">
              No Restaurants Found
            </h3>
            <p className="text-[#4f5f1d]">
              Try adjusting your search or filters to discover more dining options.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}