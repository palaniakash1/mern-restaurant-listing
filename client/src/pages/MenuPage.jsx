import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass
} from '../utils/publicPage';
import { listRestaurants } from '../services/restaurantService';
import RestaurantSpotlightCard from '../components/public/RestaurantSpotlightCard';
import EmptyState from '../components/public/EmptyState';

const popularCategories = [
  'Italian',
  'Japanese',
  'Indian',
  'Chinese',
  'Thai',
  'British',
  'French',
  'Mexican'
];

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const category = searchParams.get('category') || '';

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listRestaurants({
          categories: category,
          limit: 20
        });
        setRestaurants(response.data?.restaurants || response.data || []);
      } catch {
        setError('Unable to fetch restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [category]);

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    if (cat) {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-8">
          <p className={sectionEyebrowClass}>Menus</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Browse Menus
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Explore menus from restaurants near you
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              !selectedCategory
                ? 'bg-[#8fa31e] text-white'
                : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
            }`}
          >
            All
          </button>
          {popularCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-[#8fa31e] text-white'
                  : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          </div>
        ) : error ? (
          <EmptyState
            title="Error"
            description={error}
            action={
              <button onClick={() => handleCategoryClick(null)} className={primaryButtonClass}>
                Clear
              </button>
            }
          />
        ) : restaurants.length === 0 ? (
          <EmptyState
            title="No Restaurants Found"
            description="No restaurants available in this category"
            action={
              <Link to="/restaurants" className={primaryButtonClass}>
                Browse All
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantSpotlightCard
                key={restaurant._id || restaurant.id}
                restaurant={restaurant}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}