import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiArrowRight, HiMenu, HiStar } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, sectionEyebrowClass, primaryButtonClass, elevatedCardClass } from '../../utils/publicPage';
import { searchAll } from '../../services/restaurantService';

export function FeaturedByMenu() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedAllergens = useSelector((state) => state.allergen.selectedAllergens);
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);

  useEffect(() => {
    const fetchPopularDishes = async () => {
      try {
        const results = await searchAll({ q: '', city: '' });
        const menuItems = results.menuItems || [];
        const flatDishes = [];
        menuItems.forEach((menuDoc) => {
          if (menuDoc.items && menuDoc.items.length > 0) {
            menuDoc.items.slice(0, 2).forEach((item) => {
              flatDishes.push({
                ...item,
                restaurantName: menuDoc.restaurantName,
                restaurantSlug: menuDoc.restaurantSlug,
                categoryName: menuDoc.categoryName
              });
            });
          }
        });
        setDishes(flatDishes.slice(0, 8));
      } catch (err) {
        console.error('Failed to fetch popular dishes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPopularDishes();
  }, []);

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

  const getDishLink = (dish) => {
    const filterParams = buildFilterParams();
    const baseUrl = `/restaurants/${dish.restaurantSlug}`;
    return filterParams ? `${baseUrl}?${filterParams}` : baseUrl;
  };

  return (
    <section className={joinClasses(sectionWrapClass, 'bg-[#fff1f0] rounded-xl')}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Top Rated Picks</p>
          <h2 className="mt-3 text-2xl font-bold text-[#201a1a] sm:text-3xl font-[Manrope]">
            Popular dishes in your area
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#534342] sm:text-base">
            Signature dishes and chef&apos;s specials from top restaurants
          </p>
        </div>
        <Link to="/search" className={primaryButtonClass}>
          View all
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={joinClasses(elevatedCardClass, 'overflow-hidden')}>
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-5">
                <div className="h-4 bg-gray-200 animate-pulse w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : dishes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dishes.map((dish, idx) => (
            <Link
              key={dish._id || `${dish.name}-${idx}`}
              to={getDishLink(dish)}
              className={joinClasses(elevatedCardClass, 'group overflow-hidden bg-white')}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={dish.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'}
                  alt={dish.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.6))]" />
                {dish.categoryName && (
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#23411f]">
                      {dish.categoryName}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-[#201a1a] line-clamp-1 font-[Manrope]">{dish.name}</h3>
                  <div className="flex items-center gap-1 bg-[#bf1e18]/10 px-2 py-0.5 rounded text-[#bf1e18] font-bold text-sm">
                    <span>{dish.rating?.toFixed(1) || '4.5'}</span>
                    <HiStar className="text-xs" style={{ fill: 'currentColor' }} />
                  </div>
                </div>
                <p className="text-sm text-[#534342] line-clamp-2 mb-3">{dish.description || 'Delicious dish from our featured restaurants.'}</p>
                <div className="flex items-center gap-2 text-sm text-[#534342]">
                  <HiMenu className="h-4 w-4" />
                  <span>{dish.restaurantName}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#534342]">
          <p>No popular dishes found</p>
        </div>
      )}
    </section>
  );
}

export default FeaturedByMenu;