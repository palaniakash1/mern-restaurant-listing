import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiShieldCheck } from 'react-icons/hi';
import { sectionWrapClass, sectionEyebrowClass, primaryButtonClass } from '../../utils/publicPage';
import { listRestaurants } from '../../services/restaurantService';
import RestaurantSpotlightCard from './RestaurantSpotlightCard';

export function FsaRatingSection() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFsaFive = async () => {
      try {
        const response = await listRestaurants({ limit: 4 });
        const fsaFive = (response.data?.restaurants || response.data || []).filter(
          (r) => r.fsaRating?.value === '5' || r.fsaRating?.value === 5
        );
        setRestaurants(fsaFive);
      } catch {
        setError('Unable to fetch restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchFsaFive();
  }, []);

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Food Safety First</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            FSA 5-Star Rated
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Exceeded the highest food safety standards awarded by the FSA
          </p>
        </div>
        <Link to="/restaurants?fsa=5" className={primaryButtonClass}>
          View All
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm">
              <div className="aspect-[4/3] rounded-xl bg-[#edf4dc] animate-pulse" />
              <div className="mt-4 h-4 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
            </div>
          ))}
        </div>
      ) : error || restaurants.length === 0 ? null : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.slice(0, 4).map((restaurant) => (
            <RestaurantSpotlightCard
              key={restaurant._id || restaurant.id}
              restaurant={restaurant}
              badge={
                <span className="inline-flex items-center gap-1">
                  <HiShieldCheck className="h-3 w-3" />
                  FSA 5-Star
                </span>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default FsaRatingSection;
