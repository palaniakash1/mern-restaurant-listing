import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
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
        const response = await getFeaturedRestaurants({ limit: 4 });
        setRestaurants(response.data?.restaurants || response.data || []);
      } catch {
        setError('Unable to fetch featured restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading) {
    return (
      <section className={sectionWrapClass}>
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
        </div>
      </section>
    );
  }

  if (error || restaurants.length === 0) {
    return null;
  }

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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {restaurants.slice(0, 4).map((restaurant) => (
          <RestaurantSpotlightCard
            key={restaurant._id || restaurant.id}
            restaurant={restaurant}
            badge="Featured"
          />
        ))}
      </div>
    </section>
  );
}

export default FeaturedRestaurants;