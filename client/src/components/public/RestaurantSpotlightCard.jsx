import { Link } from 'react-router-dom';
import {
  HiArrowRight,
  HiHeart,
  HiLocationMarker,
  HiStar
} from 'react-icons/hi';
import {
  elevatedCardClass,
  getFsaBadgeUrl,
  getRestaurantCategoryNames,
  getRestaurantLocationLabel,
  ghostButtonClass,
  joinClasses,
  pickRestaurantImage,
  secondaryButtonClass
} from '../../utils/publicPage';

export function RestaurantSpotlightCard({
  restaurant,
  badge,
  href = `/restaurants/${restaurant.slug}`,
  favoriteAction
}) {
  const categoryNames = getRestaurantCategoryNames(restaurant);
  const badgeUrl = getFsaBadgeUrl(restaurant?.fsaRating?.value);

  return (
    <article className={joinClasses(elevatedCardClass, 'group overflow-hidden')}>
      <div className="relative h-64 overflow-hidden">
        <img
          src={pickRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(10,14,8,0.68))]" />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {badge ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#23411f]">
              {badge}
            </span>
          ) : null}
          {restaurant?.isTrending ? (
            <span className="rounded-full bg-[#b62828] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
              Trending
            </span>
          ) : null}
        </div>
        <div className="absolute right-5 top-5 flex items-center gap-2">
          {favoriteAction ? favoriteAction : null}
          {badgeUrl ? (
            <span className="rounded-[0.35rem] border border-[#dce6c1] bg-white/95 p-1 shadow-md">
              <img src={badgeUrl} alt={`FSA ${restaurant?.fsaRating?.value}`} className="h-9 w-auto" />
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">
              {categoryNames[0] || 'Signature dining'}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">{restaurant.name}</h3>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            {restaurant?.priceRange || '$$'}
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#23411f]">
            <HiStar className="h-4 w-4 text-[#efb634]" />
            {Number(restaurant?.rating || 0).toFixed(1)}
          </span>
          <span>{restaurant?.reviewCount || 0} guest reviews</span>
          <span className="inline-flex items-center gap-1.5">
            <HiLocationMarker className="h-4 w-4 text-[#8fa31e]" />
            {getRestaurantLocationLabel(restaurant) || 'Location coming soon'}
          </span>
        </div>
        <p className="mt-4 text-sm leading-7 text-gray-600">
          {restaurant?.tagline || 'A polished dining destination shaped for memorable occasions.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {categoryNames.slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full bg-[#f5faeb] px-3 py-1.5 text-[11px] font-semibold text-[#4f5f1d]"
            >
              {category}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Link to={href} className={secondaryButtonClass}>
            Explore restaurant
            <HiArrowRight className="h-4 w-4" />
          </Link>
          {restaurant?.contactNumber ? (
            <a href={`tel:${restaurant.contactNumber}`} className={ghostButtonClass}>
              Reserve now
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default RestaurantSpotlightCard;
