import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiSearch, HiLocationMarker } from 'react-icons/hi';
import { IoRestaurant } from 'react-icons/io5';

import {
  toggleAllergen,
  clearAllergens
} from '../../redux/allergen/allergenSlice';
import { ALLERGEN_FILTERS } from '../../utils/allergenConstants';
import { SearchableDropdown } from '../ui/SearchableDropdown';
import { joinClasses } from '../../utils/publicPage';
import { getCities, searchAll } from '../../services/restaurantService';

export function CinematicBanner() {
  const dispatch = useDispatch();
  const selectedAllergens = useSelector(
    (state) => state.allergen.selectedAllergens
  );
  const [location, setLocation] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [locations, setLocations] = useState([]);
  const [searchResults, setSearchResults] = useState({
    restaurants: [],
    categories: [],
    menus: [],
    menuItems: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const cities = await getCities();
        const formatted = cities.map((city) => ({
          value: city.toLowerCase().replace(/\s+/g, '-'),
          label: city
        }));
        setLocations(formatted);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length < 1) {
        setSearchResults({ restaurants: [], categories: [], menus: [], menuItems: [] });
        return;
      }
      try {
        const results = await searchAll({ q: searchQuery, city: location || '' });
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to fetch search results:', err);
      }
    };
    const debounce = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, location]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('city', location);
    if (selectedAllergens.length > 0)
      params.set('allergens', selectedAllergens.join(','));

    if (restaurant) {
      if (restaurant.startsWith('dish:')) {
        const dishName = decodeURIComponent(restaurant.replace('dish:', ''));
        params.set('q', dishName);
        window.location.href = `/restaurants?${params.toString()}`;
      } else if (restaurant.startsWith('category:')) {
        const categorySlug = decodeURIComponent(restaurant.replace('category:', ''));
        params.set('categories', categorySlug);
        window.location.href = `/restaurants?${params.toString()}`;
      } else if (restaurant.startsWith('menu:')) {
        const menuName = decodeURIComponent(restaurant.replace('menu:', ''));
        params.set('q', menuName);
        window.location.href = `/restaurants?${params.toString()}`;
      } else {
        window.location.href = `/restaurants/${restaurant}?${params.toString()}`;
      }
    } else if (searchQuery) {
      params.set('q', searchQuery);
      window.location.href = `/restaurants?${params.toString()}`;
    } else {
      window.location.href = `/restaurants?${params.toString()}`;
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover"
          alt="Luxurious botanical garden restaurant interior at sunset with lush exotic plants, soft ambient lighting, and elegant dining tables"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGCo82jVkrblaRmVu9iCC92jdO2L1WfwF8YXh2fKlH1IIIY9h93haWeupGTMp8a8h_m_zjksW__72BKJ8Vavh8iAKq97zDZYRRMPQfR5h7jwcYcADzh1lZhk7gQMccCbS2v5xouSy4eL0Jo2bzvWue27_jGe7WmTJcwfUjOtJI-mh0VfjOCzHfWLoI7WDXwiRhpTZa9BZDlXR5z-Lqoxsj_-VIX4G_YG6JnPKvxR09GWoDM3Dx_U3UP9633svUUGUBDYCBNO1WL6cm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#171d13]/70 via-[#171d13]/40 to-[#171d13]/80" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 text-center space-y-12">
        <div className="space-y-4">
          <span className="inline-block px-3 py-1 bg-[#b42627] text-white text-[0.6875rem] font-bold uppercase tracking-[0.2em] rounded-full">
            Curated Excellence
          </span>
          <h1 className="font-[Manrope] font-extrabold text-5xl md:text-7xl lg:text-8xl text-white tracking-tighter leading-tight text-shadow-sm">
            Explore on <span className="text-[#cc0001] font-black">Eat </span>
            <span className="text-[#8fa31e] font-black"> Wisely</span>
          </h1>
          <p className="max-w-2xl mx-auto text-white/80 text-xl font-['Inter'] leading-relaxed">
            Discover handpicked restaurants where every dish, ingredient, and
            ambience is thoughtfully crafted — bringing you closer to refined,
            memorable dining experiences.
          </p>
        </div>

        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl p-4 rounded-lg flex flex-col md:flex-row items-stretch md:items-center gap-3 border border-white/10 shadow-2xl shadow-[#23411f]/20 z-20 relative">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <SearchableDropdown
                options={locations.filter((loc) =>
                  loc.label.toLowerCase().includes(locationSearch.toLowerCase())
                )}
                value={location}
                onChange={setLocation}
                placeholder="Select location"
                searchPlaceholder="Search locations..."
                icon={HiLocationMarker}
                searchValue={locationSearch}
                onSearchChange={setLocationSearch}
                emptyMessage="Type to search locations..."
              />

              <SearchableDropdown
                options={(() => {
                  const dishOptions = (searchResults.menuItems || [])
                    .flatMap((menu) =>
                      (menu.items || []).map((item) => ({
                        value: `dish:${item.name}`,
                        label: item.name,
                        sublabel: `Dish • ${menu.name}`,
                        priority: 1
                      }))
                    );
                  const menuOptions = (searchResults.menus || []).map((m) => ({
                    value: `menu:${m.name}`,
                    label: m.name,
                    sublabel: 'Menu',
                    priority: 2
                  }));
                  const categoryOptions = (searchResults.categories || []).map((c) => ({
                    value: `category:${c.slug}`,
                    label: c.name,
                    sublabel: 'Category',
                    priority: 3
                  }));
                  const restaurantOptions = (searchResults.restaurants || []).map((r) => ({
                    value: r.slug,
                    label: r.name,
                    sublabel: r.address?.areaLocality ? `${r.address.areaLocality}, ${r.address.city}` : r.address?.city,
                    priority: 4
                  }));
                  return [...dishOptions, ...menuOptions, ...categoryOptions, ...restaurantOptions];
                })()}
                value={restaurant}
                onChange={setRestaurant}
                placeholder={searchQuery || "Search dishes, categories, restaurants"}
                searchPlaceholder="Search dishes, categories, restaurants..."
                icon={IoRestaurant}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                emptyMessage="Type to search restaurants, categories, or dishes..."
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#576500] to-[#8fa31e] text-white font-[Manrope] font-bold rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <HiSearch className="text-xl w-5 h-5" />
              Search
            </button>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto space-y-4 z-10 relative">
          <div className="flex items-center justify-center gap-4">
            <h3 className="text-white/60 font-['Inter'] text-xs uppercase tracking-widest font-bold">
              Dietary Sensitivities
            </h3>
            {selectedAllergens.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch(clearAllergens())}
                className="text-white/60 hover:text-white text-xs font-medium underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div
            className="flex flex-wrap justify-center gap-3"
            role="group"
            aria-label="Dietary sensitivities filter"
          >
            {ALLERGEN_FILTERS.map((allergen) => {
              const isSelected = selectedAllergens.includes(allergen.id);
              return (
                <button
                  key={allergen.id}
                  type="button"
                  onClick={() => dispatch(toggleAllergen(allergen.id))}
                  aria-pressed={isSelected}
                  className={joinClasses(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border',
                    isSelected
                      ? 'bg-gradient-to-r from-[#8fa31e] to-[#d7ee64] border-transparent text-white shadow-xl shadow-[#8fa31e]/40 scale-105 font-bold'
                      : 'bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-[#8fa31e] hover:border-transparent hover:scale-105'
                  )}
                >
                  <span className="text-base leading-none">
                    {allergen.emoji}
                  </span>
                  <span className="text-xs font-semibold">
                    {allergen.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CinematicBanner;
