import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiSearch, HiLocationMarker } from 'react-icons/hi';

import { toggleAllergen } from '../../redux/allergen/allergenSlice';
import { setDietary } from '../../redux/dietary/dietarySlice';
import { ALLERGEN_FILTERS } from '../../utils/allergenConstants';
import { joinClasses } from '../../utils/publicPage';
import { getCities } from '../../services/restaurantService';

const DIETARY_OPTIONS = [
  { id: 'halal', label: 'Halal', icon: '✓' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' }
];

export function CinematicBanner() {
  const dispatch = useDispatch();
  const selectedAllergens = useSelector(
    (state) => state.allergen.selectedAllergens
  );
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);
  const [locationInput, setLocationInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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
      window.location.href = `/search?${params.toString()}`;
    } else {
      window.location.href = `/restaurants?${params.toString()}`;
    }
  };

  const handleLocationSelect = (city) => {
    setLocationInput(city);
    setShowLocationDropdown(false);
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
            <div className="flex items-center flex-[2] px-6 gap-3 w-full py-2">
              <HiSearch className="text-[#bf1e18] text-xl" />
              <input 
                className="!bg-transparent border-none focus:ring-0 w-full font-medium text-gray-800" 
                placeholder="Search for restaurant, cuisine or a dish" 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button 
              type="button"
              onClick={handleSearch}
              className="!bg-[#bf1e18] text-white px-10 py-4 rounded-full font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95 w-full md:w-auto shadow-lg"
            >
              Search
            </button>
          </div>

          <div className="flex flex-col gap-12 w-full justify-center items-center">
            <div className="relative group w-full flex flex-col items-center">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 !bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg border border-[#bf1e18]/10 text-sm font-bold text-[#bf1e18] animate-bounce z-20">
                I am allergic to
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 !bg-white rotate-45 border-r border-b border-[#bf1e18]/5"></div>
              </div>
              <div className="flex flex-col items-center gap-4 w-full">
                <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Click to remove</span>
                <div className="flex pb-4 max-w-full flex-wrap justify-center gap-6">
                  {ALLERGEN_FILTERS.slice(0, 12).map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen.id);
                    return (
                      <button
                        key={allergen.id}
                        type="button"
                        onClick={() => dispatch(toggleAllergen(allergen.id))}
                        className={joinClasses(
                          'flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group/icon p-2',
                          isSelected
                            ? '!bg-[#bf1e18] text-white border-transparent'
                            : '!bg-white/10 border border-white/30 text-white hover:!bg-white hover:!text-[#bf1e18]'
                        )}
                        title={allergen.label}
                      >
                        <span className="text-3xl group-hover/icon:scale-110 transition-transform">{allergen.emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">{allergen.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mt-8 w-full">
              <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Filter by:</span>
              <div className="flex gap-6">
                {DIETARY_OPTIONS.map((diet) => {
                  const isSelected = selectedDiet === diet.id;
                  return (
                    <div key={diet.id} className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => dispatch(setDietary(isSelected ? null : diet.id))}
                        className={joinClasses(
                          'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110',
                          isSelected ? '!bg-[#bf1e18] text-white' : '!bg-white text-[#bf1e18]'
                        )}
                      >
                        <span className="text-xl">{diet.icon}</span>
                      </button>
                      <span className="text-white text-xs font-bold">{diet.label}</span>
                    </div>
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
