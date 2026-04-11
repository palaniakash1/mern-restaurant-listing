import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiArrowRight, HiSearch } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass,
  inputClass
} from '../utils/publicPage';
import { listRestaurants } from '../services/restaurantService';
import RestaurantSpotlightCard from '../components/public/RestaurantSpotlightCard';
import EmptyState from '../components/public/EmptyState';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 12 });

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';
  const categories = searchParams.get('categories') || '';
  const featured = searchParams.get('featured') === 'true';
  const trending = searchParams.get('trending') === 'true';
  const fsa = searchParams.get('fsa') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listRestaurants({
          q: query,
          city,
          categories,
          isFeatured: featured,
          isTrending: trending,
          page,
          limit: 12
        });
        let results = response.data?.restaurants || response.data || [];

        if (fsa === '5') {
          results = results.filter(
            (r) => r.fsaRating?.value === '5' || r.fsaRating?.value === 5
          );
        }

        setRestaurants(results);
        setPagination((prev) => ({
          ...prev,
          page,
          total: response.data?.total || results.length
        }));
      } catch {
        setError('Unable to search restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [query, city, categories, featured, trending, fsa, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const q = formData.get('q');
    if (q) {
      setSearchParams({ q });
    }
  };

  const getTitle = () => {
    if (query) return `Search results for "${query}"`;
    if (featured) return 'Featured Restaurants';
    if (trending) return 'Trending Restaurants';
    if (fsa === '5') return 'FSA 5-Star Rated Restaurants';
    if (categories) return `${categories} Restaurants`;
    return 'All Restaurants';
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-8">
          <p className={sectionEyebrowClass}>Search</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            {getTitle()}
          </h1>
        </div>

        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <HiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search restaurants, cuisines..."
              className={inputClass + ' pl-12'}
            />
          </div>
          <button type="submit" className={primaryButtonClass}>
            Search
          </button>
        </form>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          </div>
        ) : error ? (
          <EmptyState
            title="Search Failed"
            description={error}
            action={
              <button onClick={() => setSearchParams({})} className={primaryButtonClass}>
                Clear Filters
              </button>
            }
          />
        ) : restaurants.length === 0 ? (
          <EmptyState
            title="No Restaurants Found"
            description="Try adjusting your search or browse all restaurants"
            action={
              <Link to="/restaurants" className={primaryButtonClass}>
                Browse All
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-500">
              {pagination.total} restaurant{pagination.total !== 1 ? 's' : ''} found
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {restaurants.map((restaurant) => (
                <RestaurantSpotlightCard
                  key={restaurant._id || restaurant.id}
                  restaurant={restaurant}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}