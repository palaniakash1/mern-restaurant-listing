import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiArrowRight, HiLocationMarker, HiStar } from 'react-icons/hi';
import { elevatedCardClass, getRestaurantCategoryNames, pickRestaurantImage, secondaryButtonClass, joinClasses } from '../../utils/publicPage';

export function NearbyRestaurantCard({ restaurant, distance }) {
  const categoryNames = getRestaurantCategoryNames(restaurant);
  const selectedAllergens = useSelector((state) => state.allergen.selectedAllergens);
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);

  const formatDistance = (dist) => {
    if (!dist) return null;
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m away`;
    }
    return `${dist.toFixed(1)}km away`;
  };

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (selectedAllergens.length > 0) {
      params.set('allergens', selectedAllergens.join(','));
    }
    if (selectedDiet) {
      params.set('dietary', selectedDiet);
    }
    return params.toString();
  };

  const getRestaurantLink = () => {
    const filterParams = buildFilterParams();
    const baseUrl = `/restaurants/${restaurant.slug}`;
    return filterParams ? `${baseUrl}?${filterParams}` : baseUrl;
  };

  return (
    <article className={joinClasses(elevatedCardClass, 'group overflow-hidden')}>
      <div className="relative h-52 overflow-hidden">
        <img
          src={pickRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(10,14,8,0.75))]" />
        
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {restaurant?.isTrending && (
            <span className="rounded-full bg-[#b62828] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
              Trending
            </span>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
              {categoryNames[0] || 'Dining'}
            </p>
            <h3 className="mt-1 text-xl font-bold text-white truncate">{restaurant.name}</h3>
          </div>
          <div className="rounded-full bg-[#8fa31e]/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur flex items-center gap-1">
            <HiLocationMarker className="h-3 w-3" />
            {formatDistance(distance)}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-[#23411f]">
            <HiStar className="h-4 w-4 text-[#efb634]" />
            {Number(restaurant?.rating || 0).toFixed(1)}
          </span>
          <span className="text-gray-500">{restaurant?.reviewCount || 0} reviews</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">{restaurant?.priceRange || '$$'}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {categoryNames.slice(0, 2).map((category) => (
            <span
              key={category}
              className="rounded-full bg-[#f5faeb] px-2.5 py-1 text-[10px] font-semibold text-[#4f5e1d]"
            >
              {category}
            </span>
          ))}
        </div>

        <Link
          to={getRestaurantLink()}
          className={joinClasses(secondaryButtonClass, 'mt-4 w-full justify-center')}
        >
          View Details
          <HiArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default NearbyRestaurantCard;
