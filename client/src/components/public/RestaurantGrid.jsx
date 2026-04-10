import { HiHeart } from 'react-icons/hi';
import { joinClasses } from '../../utils/publicPage';
import RestaurantSpotlightCard from './RestaurantSpotlightCard';
import EmptyState from './EmptyState';

export function RestaurantGrid({
  restaurants = [],
  badgeResolver,
  emptyTitle,
  emptyDescription,
  favoriteLookup,
  onToggleFavorite
}) {
  if (!restaurants.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {restaurants.map((restaurant) => {
        const isFavorite = favoriteLookup?.(restaurant);

        return (
          <RestaurantSpotlightCard
            key={restaurant._id || restaurant.slug}
            restaurant={restaurant}
            badge={badgeResolver?.(restaurant)}
            favoriteAction={
              onToggleFavorite ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    onToggleFavorite(restaurant);
                  }}
                  className={joinClasses(
                    'rounded-full border p-3 backdrop-blur transition',
                    isFavorite
                      ? 'border-transparent bg-[#b62828] text-white'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  )}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <HiHeart className="h-5 w-5" />
                </button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}

export default RestaurantGrid;
