import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass
} from '../utils/publicPage';
import { listRestaurants, listCategories, getRestaurantMenus } from '../services/restaurantService';
import EmptyState from '../components/public/EmptyState';

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
});

const getItemBadges = (item) => {
  const badges = [];
  if (item.isMeal) badges.push('Meal Deal');
  if (item.dietary?.vegetarian) badges.push('Vegetarian');
  if (item.dietary?.vegan) badges.push('Vegan');
  return badges;
};

const getItemAllergens = (item) => {
  const labels = {
    gluten: 'Gluten',
    egg: 'Egg',
    fish: 'Fish',
    crustaceans: 'Crustaceans',
    molluscs: 'Molluscs',
    milk: 'Milk',
    peanut: 'Peanut',
    tree_nuts: 'Tree Nuts',
    sesame: 'Sesame',
    soya: 'Soya',
    celery: 'Celery',
    mustard: 'Mustard',
    sulphites: 'Sulphites',
    lupin: 'Lupin'
  };
  return (item.allergens || []).map((a) => labels[a] || a);
};

const MenuItemCard = ({ item, restaurant }) => {
  const badges = getItemBadges(item);
  const allergens = getItemAllergens(item);

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-[#ebf0d7] bg-[linear-gradient(135deg,#ffffff_0%,#fbfcf7_100%)] shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-48 overflow-hidden bg-[#f4ede2]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-[#d8dfc0]">
              {item.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(20,20,18,0.32)_100%)]" />
        {item.isAvailable === false ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#b62828] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            Unavailable
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3">
          <div className="inline-flex rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-[#2f6a34] shadow-sm">
            {priceFormatter.format(Number(item.price || 0))}
          </div>
        </div>
      </div>

      <div className="flex flex-col p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-lg font-bold tracking-tight text-[#23411f]">
              {item.name}
            </h4>
            {restaurant && (
              <Link
                to={`/restaurant/${restaurant.slug || restaurant._id}`}
                className="text-xs font-medium text-[#8fa31e] hover:underline whitespace-nowrap"
              >
                {restaurant.name}
              </Link>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6d6358]">
            {item.description || 'Delicious dish with quality ingredients.'}
          </p>
        </div>

        {(badges.length > 0 || allergens.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-[#edf3e4] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#47692e]"
              >
                {badge}
              </span>
            ))}
            {allergens.slice(0, 3).map((allergen) => (
              <span
                key={allergen}
                className="rounded-full bg-[#fff1f1] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#b62828]"
              >
                {allergen}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

const MenuSection = ({ menu, restaurant }) => {
  const items = (menu.items || []).filter((item) => item.isActive !== false);

  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-[#ebf0d7] pb-3">
        <div>
          <h3 className="text-xl font-bold text-[#23411f]">
            {menu.category || 'Menu'}
          </h3>
          {restaurant && (
            <Link
              to={`/restaurant/${restaurant.slug || restaurant._id}`}
              className="text-xs text-[#8fa31e] hover:underline"
            >
              {restaurant.name}
            </Link>
          )}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9d9284]">
          {items.length} {items.length === 1 ? 'dish' : 'dishes'}
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => (
          <MenuItemCard key={`${item._id || item.name}-${index}`} item={item} restaurant={restaurant} />
        ))}
      </div>
    </section>
  );
};

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menusByRestaurant, setMenusByRestaurant] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const category = searchParams.get('category') || '';

  useEffect(() => {
    listCategories()
      .then((res) => {
        if (res.data?.categories) {
          setCategories(res.data.categories);
        }
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    const fetchMenusForRestaurants = async () => {
      if (restaurants.length === 0) {
        setMenusByRestaurant({});
        return;
      }

      setLoadingMenus(true);
      try {
        const menuPromises = restaurants.map(async (restaurant) => {
          try {
            const res = await getRestaurantMenus(restaurant._id, { limit: 50 });
            return { restaurantId: restaurant._id, menus: res.data || [] };
          } catch {
            return { restaurantId: restaurant._id, menus: [] };
          }
        });

        const results = await Promise.all(menuPromises);
        const menuMap = {};
        results.forEach(({ restaurantId, menus }) => {
          menuMap[restaurantId] = menus;
        });
        setMenusByRestaurant(menuMap);
      } catch (err) {
        console.error('Error fetching menus:', err);
      } finally {
        setLoadingMenus(false);
      }
    };

    fetchMenusForRestaurants();
  }, [restaurants]);

  const allMenuItems = useMemo(() => {
    const items = [];
    restaurants.forEach((restaurant) => {
      const menus = menusByRestaurant[restaurant._id] || [];
      menus.forEach((menu) => {
        (menu.items || []).forEach((item) => {
          if (item.isActive !== false) {
            items.push({ ...item, restaurant, menu });
          }
        });
      });
    });
    return items;
  }, [restaurants, menusByRestaurant]);

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    if (cat) {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
  };

  const isLoading = loading || loadingMenus;

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-8">
          <p className={sectionEyebrowClass}>Menus</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Browse Menu Items
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Explore dishes from restaurants near you
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
          {categories.map((cat) => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            return (
              <button
                key={cat._id || cat}
                onClick={() => handleCategoryClick(catName)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  selectedCategory === catName
                    ? 'bg-[#8fa31e] text-white'
                    : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>

        {isLoading ? (
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
        ) : allMenuItems.length === 0 ? (
          <EmptyState
            title="No Menu Items Found"
            description={
              restaurants.length === 0
                ? 'No restaurants available in this category'
                : 'No menu items available from restaurants in this category'
            }
            action={
              <Link to="/restaurants" className={primaryButtonClass}>
                Browse Restaurants
              </Link>
            }
          />
        ) : (
          <>
            {loadingMenus && allMenuItems.length > 0 && (
              <p className="mb-6 text-sm text-gray-500">
                Loading menus...
              </p>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allMenuItems.map((item, index) => (
                <MenuItemCard
                  key={`${item._id || item.name}-${index}`}
                  item={item}
                  restaurant={item.restaurant}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
