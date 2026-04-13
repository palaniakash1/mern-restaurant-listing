import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiSparkles } from 'react-icons/hi';
import { sectionWrapClass, sectionEyebrowClass, primaryButtonClass } from '../../utils/publicPage';
import { getFeaturedRestaurants } from '../../services/restaurantService';
import RestaurantSpotlightCard from './RestaurantSpotlightCard';

export function FeaturedRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await getFeaturedRestaurants({ limit: 6 });
        setRestaurants(response.data?.restaurants || response.data || []);
      } catch {
        setError('Unable to fetch featured restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Curated Excellence</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Featured Restaurants
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Handpicked establishments offering exceptional dining experiences
          </p>
        </div>
        <Link to="/restaurants?featured=true" className={primaryButtonClass}>
          View More
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm">
              <div className="aspect-[4/3] rounded-xl bg-[#edf4dc] animate-pulse" />
              <div className="mt-4 h-4 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-center text-gray-500 py-8">{error}</p>
      ) : restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c8d9a4] bg-[#f7faf3] py-12 text-center">
          <HiSparkles className="h-12 w-12 text-[#8fa31e]" />
          <p className="mt-4 font-medium text-[#23411f]">Featured Restaurants Coming Soon</p>
          <p className="mt-2 text-sm text-gray-500">We're curating the best dining experiences for you</p>
          <Link to="/restaurants" className={`${primaryButtonClass} mt-6`}>
            Explore All Restaurants
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {restaurants.slice(0, 6).map((restaurant) => (
            <RestaurantSpotlightCard
              key={restaurant._id || restaurant.id}
              restaurant={restaurant}
              badge="Featured"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default FeaturedRestaurants;
