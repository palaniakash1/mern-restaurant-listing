import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiSearch, HiLocationMarker, HiArrowRight } from 'react-icons/hi';

import { toggleAllergen } from '../../redux/allergen/allergenSlice';
import { setDietary } from '../../redux/dietary/dietarySlice';
import { ALLERGEN_FILTERS } from '../../utils/allergenConstants';
import { joinClasses } from '../../utils/publicPage';
import { getCities, searchAll } from '../../services/restaurantService';
import cloudAllergyImg from '../../assets/cloud-allergy.png';

const DIETARY_OPTIONS = [
  { id: 'halal', label: 'Halal', icon: '✓' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' }
];

export function CinematicBanner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedAllergens = useSelector(
    (state) => state.allergen.selectedAllergens
  );
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);
  const [locationInput, setLocationInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState({
    restaurants: [],
    categories: [],
    menus: [],
    menuItems: []
  });
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const cities = await getCities();
        const seen = new Set();
        const uniqueCities = cities.filter((city) => {
          const normalized = city.toLowerCase();
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
      if (searchInput.length < 1) {
        setSearchResults({ restaurants: [], categories: [], menus: [], menuItems: [] });
        return;
      }
      try {
        const results = await searchAll({ q: searchInput, city: locationInput || '' });
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Failed to fetch search results:', err);
      }
    };
    const debounce = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounce);
  }, [searchInput, locationInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLocations = locationOptions.filter((city) =>
    city.toLowerCase().includes(locationInput.toLowerCase())
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (locationInput) params.set('city', locationInput.toLowerCase().replace(/\s+/g, '-'));
    if (selectedAllergens.length > 0)
      params.set('allergens', selectedAllergens.join(','));
    if (selectedDiet)
      params.set('dietary', selectedDiet);

    if (searchInput) {
      params.set('q', searchInput);
      navigate(`/search?${params.toString()}`);
    } else {
      navigate(`/restaurants?${params.toString()}`);
    }
  };

  const handleLocationSelect = (city) => {
    setLocationInput(city);
    setShowLocationDropdown(false);
  };

  const getAllSuggestions = () => {
    const suggestions = [];
    const seen = new Set();

    searchResults.menuItems?.forEach((menuDoc) => {
      menuDoc.items?.slice(0, 2).forEach((item) => {
        const key = `dish-${item.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({ type: 'dish', label: item.name, sublabel: 'Dish', data: item, restaurantSlug: menuDoc.restaurantSlug });
        }
      });
    });

    searchResults.menus?.forEach((menu) => {
      const key = `menu-${menu.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({ type: 'menu', label: menu.name, sublabel: 'Menu', data: menu });
      }
    });

    searchResults.categories?.forEach((cat) => {
      const key = `category-${cat.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({ type: 'category', label: cat.name, sublabel: 'Category', data: cat });
      }
    });

    searchResults.restaurants?.forEach((rest) => {
      const key = `restaurant-${rest.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({ type: 'restaurant', label: rest.name, sublabel: rest.address?.city || 'Restaurant', data: rest });
      }
    });

    return suggestions.slice(0, 8);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'restaurant') {
      const params = new URLSearchParams();
      if (selectedAllergens.length > 0) params.set('allergens', selectedAllergens.join(','));
      if (selectedDiet) params.set('dietary', selectedDiet);
      navigate(`/restaurants/${suggestion.data.slug}?${params.toString()}`);
    } else if (suggestion.type === 'category') {
      setSearchInput(suggestion.label);
      setShowSearchDropdown(false);
    } else {
      setSearchInput(suggestion.label);
      setShowSearchDropdown(false);
    }
  };

  return (
    <section className="relative pt-0 pb-0 px-1 overflow-hidden">
      <div className="w-full  mx-auto rounded-xl !bg-gradient-to-br from-[#c31e18] to-[#df2921] p-12 lg:p-24 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 !bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 !bg-black/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="font-[Manrope] text-5xl lg:text-7xl font-extrabold text-white mb-12 tracking-tight drop-shadow-sm">
            what&apos;s on your plate?
          </h1>
          
          <div className="w-full max-w-4xl !bg-white p-2 rounded-full flex flex-col md:flex-row items-center gap-2 shadow-2xl mb-12 relative">
            <div className="flex items-center flex-1 px-6 gap-3 w-full border-b md:border-b-0 md:border-r border-gray-200/30 py-2 relative">
              <HiLocationMarker className="text-[#bf1e18] text-xl" />
              <input 
                className="bg-transparent border-none focus:ring-0 w-full font-medium text-gray-800" 
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
                      className="w-full px-4 py-2 text-left hover:!bg-gray-100 text-gray-800"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center flex-[2] px-6 gap-3 w-full py-2 relative" ref={searchRef}>
              <HiSearch className="text-[#bf1e18] text-xl" />
              <input 
                className="!bg-transparent border-none focus:ring-0 w-full font-medium text-gray-800" 
                placeholder="Search for restaurant, cuisine or a dish" 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => searchInput && setShowSearchDropdown(true)}
              />
              {showSearchDropdown && getAllSuggestions().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 !bg-white rounded-xl shadow-2xl z-50 max-h-80 overflow-auto">
                  {getAllSuggestions().map((suggestion, idx) => (
                    <button
                      key={`${suggestion.type}-${suggestion.label}-${idx}`}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:!bg-[#fff1f0] flex items-center justify-between border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <span className="font-medium text-gray-800">{suggestion.label}</span>
                        <span className="text-xs text-gray-500 ml-2">{suggestion.sublabel}</span>
                      </div>
                      <HiArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={handleSearch}
              className="!bg-[#bf1e18] text-white px-10 py-4 rounded-full font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95 w-full md:w-auto shadow-lg"
            >
              Search
            </button>
          </div>

          <div className="flex flex-col w-full justify-center items-center">
            <div className="relative group w-full flex flex-col items-center">
              <div className="absolute -top-10 left-[80px] !-rotate-6 z-20">
                <img
                  src={cloudAllergyImg}
                  alt="I am allergic to"
                  className="h-20 w-auto"
                />
              </div>
              <div className="flex flex-col items-center gap-4 w-full mt-4">
                <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Click icons to toggle</span>
                <div className="flex pb-4 max-w-full flex-wrap justify-center gap-3">
                  {ALLERGEN_FILTERS.map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen.id);
                    return (
                      <button
                        key={allergen.id}
                        type="button"
                        onClick={() => dispatch(toggleAllergen(allergen.id))}
                        className={joinClasses(
                          'flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 group',
                          isSelected
                            ? '!bg-white !text-[#bf1e18] shadow-lg shadow-[#bf1e18]/30 scale-105'
                            : '!bg-white/10 border-2 border-white/20 !text-white hover:!bg-white hover:!text-[#bf1e18] hover:scale-105 hover:shadow-xl'
                        )}
                        title={allergen.label}
                      >
                        <span className="text-xl group-hover/icon:scale-110 transition-transform">
                          {allergen.emoji}
                        </span>
                        <span
                          className={joinClasses(
                            'text-[6px] font-bold uppercase tracking-wider',
                            isSelected ? '!text-[#bf1e18]' : '!text-white/90 group-hover/btn:!text-[#bf1e18]'
                          )}
                        >
                          {allergen.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mt-2 w-full">
              <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Filter by:</span>
              <div className="flex gap-4">
                {DIETARY_OPTIONS.map((diet) => {
                  const isSelected = selectedDiet === diet.id;
                  return (
                    <button
                      key={diet.id}
                      type="button"
                      onClick={() => dispatch(setDietary(isSelected ? null : diet.id))}
                      className={joinClasses(
                        'flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300',
                        isSelected
                          ? '!bg-white !text-[#bf1e18] shadow-lg shadow-[#bf1e18]/30 scale-105'
                          : '!bg-white/10 border-2 border-white/20 !text-white hover:!bg-white hover:!text-[#bf1e18] hover:scale-105 hover:shadow-xl'
                      )}
                    >
                      <span className="text-xl">{diet.icon}</span>
                      <span className={joinClasses(
                        'text-[6px] font-bold uppercase tracking-wider',
                        isSelected ? '!text-[#bf1e18]' : '!text-white/90'
                      )}>{diet.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CinematicBanner;
