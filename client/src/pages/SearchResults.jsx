import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiArrowRight, HiSearch, HiLocationMarker } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import {
  publicShellClass,
  sectionWrapClass,
  primaryButtonClass
} from '../utils/publicPage';
import { listRestaurants, searchAll, getCities } from '../services/restaurantService';
import RestaurantSpotlightCard from '../components/public/RestaurantSpotlightCard';
import EmptyState from '../components/public/EmptyState';
import { toggleAllergen } from '../redux/allergen/allergenSlice';
import { setDietary } from '../redux/dietary/dietarySlice';
import { ALLERGEN_FILTERS } from '../utils/allergenConstants';

const DIETARY_OPTIONS = [
  { id: 'halal', label: 'Halal', icon: '✓' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' }
];

export default function SearchResults() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef(null);

  const selectedAllergens = useSelector((state) => state.allergen.selectedAllergens);
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';
  const categories = searchParams.get('categories') || '';
  const featured = searchParams.get('featured') === 'true';
  const trending = searchParams.get('trending') === 'true';
  const fsa = searchParams.get('fsa') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const cities = await getCities();
        const seen = new Set();
        const uniqueCities = cities.filter((c) => {
          const normalized = c.toLowerCase();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
        setLocationOptions(uniqueCities);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        if (query) {
          const searchData = await searchAll({ q: query, city });
          setMenuItems(searchData.menuItems || []);
          setRestaurants(searchData.restaurants || []);
        } else {
          const response = await listRestaurants({
            q: query,
            city,
            categories,
            isFeatured: featured,
            isTrending: trending,
            page,
            limit: 12
          });
          let results = response.data?.restaurants || response.data || [];

          if (fsa === '5') {
            results = results.filter(
              (r) => r.fsaRating?.value === '5' || r.fsaRating?.value === 5
            );
          }

          setRestaurants(results);
        }
      } catch {
        setError('Unable to search restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query, city, categories, featured, trending, fsa, page]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLocations = locationOptions.filter((c) =>
    c.toLowerCase().includes(locationInput.toLowerCase())
  );

  const handleLocationSelect = (city) => {
    setLocationInput(city);
    setShowLocationDropdown(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) params.set('q', searchInput);
    if (locationInput) params.set('city', locationInput.toLowerCase().replace(/\s+/g, '-'));
    if (selectedAllergens.length > 0) params.set('allergens', selectedAllergens.join(','));
    if (selectedDiet) params.set('dietary', selectedDiet);
    setSearchParams(params);
    setSearchInput('');
  };

  const getTitle = () => {
    if (query) return `Search results for "${query}"`;
    if (featured) return 'Featured Restaurants';
    if (trending) return 'Trending Restaurants';
    if (fsa === '5') return 'FSA 5-Star Rated Restaurants';
    if (categories) return `${categories} Restaurants`;
    return 'All Restaurants';
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className="relative overflow-hidden">
        <div className="w-full mx-auto !bg-gradient-to-br from-[#c31e18] to-[#df2921] p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 !bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 !bg-black/10 rounded-full blur-2xl" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            <p className="!text-white/90 text-xs font-bold uppercase tracking-widest mb-2">Discover</p>
            <h1 className="font-[Manrope] text-3xl lg:text-5xl font-extrabold !text-white mb-6">
              {getTitle()}
            </h1>
            <form onSubmit={handleSearch} className="w-full max-w-3xl !bg-white p-2 rounded-full flex flex-col sm:flex-row items-center gap-2 shadow-2xl relative">
              <div className="flex items-center flex-1 w-full px-4 gap-3 border-b sm:border-b-0 sm:border-r border-gray-200/30 py-2 relative" ref={locationRef}>
                <HiLocationMarker className="!text-[#bf1e18] text-xl flex-shrink-0" />
                <input
                  className="bg-transparent border-none focus:ring-0 w-full font-medium !text-[#201a1a] placeholder:!text-[#534342]"
                  placeholder="Location"
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setShowLocationDropdown(true);
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                />
                {showLocationDropdown && filteredLocations.length > 0 && locationInput && (
                  <div className="absolute top-full left-0 right-0 mt-1 !bg-white rounded-lg shadow-xl z-50 max-h-60 overflow-auto">
                    {filteredLocations.slice(0, 6).map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleLocationSelect(city)}
                        className="w-full px-4 py-2 text-left hover:!bg-gray-100 !text-[#201a1a]"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center flex-[2] w-full px-4 gap-3 py-2">
                <HiSearch className="!text-[#bf1e18] text-xl flex-shrink-0" />
                <input
                  className="bg-transparent border-none focus:ring-0 w-full font-medium !text-[#201a1a] placeholder:!text-[#534342]"
                  placeholder="Search restaurants, dishes, categories..."
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="!bg-[#bf1e18] !text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg w-full sm:w-auto flex-shrink-0"
              >
                Search
              </button>
            </form>
            {selectedAllergens.length > 0 || selectedDiet ? (
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                {selectedAllergens.length > 0 && (
                  <div className="flex gap-2">
                    {selectedAllergens.map((allergenId) => {
                      const allergen = ALLERGEN_FILTERS.find((a) => a.id === allergenId);
                      return allergen ? (
                        <span key={allergenId} className="!bg-white/20 !text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          {allergen.emoji} {allergen.label}
                          <button onClick={() => dispatch(toggleAllergen(allergenId))} className="ml-1 hover:opacity-70">×</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {selectedDiet && (
                  <div className="flex gap-2">
                    {DIETARY_OPTIONS.filter((d) => d.id === selectedDiet).map((diet) => (
                      <span key={diet.id} className="!bg-white/20 !text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        {diet.icon} {diet.label}
                        <button onClick={() => dispatch(setDietary(null))} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={sectionWrapClass}>
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#d8c2c0] border-t-[#bf1e18]" />
          </div>
        ) : error ? (
          <EmptyState
            title="Search Failed"
            description={error}
            action={
              <button onClick={() => setSearchParams({})} className={primaryButtonClass}>
                Clear Filters
              </button>
            }
          />
        ) : (
          <>
            {query && (menuItems.length > 0 || restaurants.length > 0) && (
              <>
                {menuItems.length > 0 && (
                  <div className="mb-12">
                    <h2 className="!text-[#201a1a] font-[Manrope] text-xl sm:text-2xl font-bold mb-6">
                      Menu Items
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {menuItems.map((menuDoc) =>
                        (menuDoc.items || []).map((item, itemIdx) => {
                          const slug = menuDoc.restaurant?.slug;
                          return (
                            <Link
                              key={`${menuDoc._id}-${itemIdx}`}
                              to={slug ? `/restaurants/${slug}?menuItem=${encodeURIComponent(item.name)}` : `/restaurants?q=${encodeURIComponent(item.name)}`}
                              className="group block !bg-white rounded-xl p-4 border border-[#d8c2c0]/30 hover:border-[#bf1e18] hover:shadow-lg transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium !text-[#201a1a] group-hover:!text-[#bf1e18] transition-colors">{item.name}</p>
                                  <p className="text-sm !text-[#534342] mt-1">{menuDoc.restaurant?.name || 'Restaurant'}</p>
                                </div>
                                <p className="text-sm font-semibold !text-[#bf1e18] flex-shrink-0">£{item.price}</p>
                              </div>
                              <div className="mt-3 flex items-center justify-end">
                                <HiArrowRight className="!text-[#bf1e18] h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {restaurants.length > 0 && (
                  <div>
                    <h2 className="!text-[#201a1a] font-[Manrope] text-xl sm:text-2xl font-bold mb-6">
                      Restaurants
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {restaurants.map((restaurant) => (
                        <RestaurantSpotlightCard
                          key={restaurant._id || restaurant.id}
                          restaurant={restaurant}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {restaurants.length === 0 && query ? (
              <EmptyState
                title="No Results Found"
                description={`We couldn't find any restaurants or dishes matching "${query}"`}
                action={
                  <Link to="/restaurants" className={primaryButtonClass}>
                    Browse All
                  </Link>
                }
              />
            ) : restaurants.length === 0 ? (
              <EmptyState
                title="No Restaurants Found"
                description="Try adjusting your search or browse all restaurants"
                action={
                  <Link to="/restaurants" className={primaryButtonClass}>
                    Browse All
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {restaurants.map((restaurant) => (
                  <RestaurantSpotlightCard
                    key={restaurant._id || restaurant.id}
                    restaurant={restaurant}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}