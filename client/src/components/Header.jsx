import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiMenu, HiX, HiSearch, HiHeart, HiStar, HiLocationMarker, HiMenuAlt1, HiViewGrid } from 'react-icons/hi';
import logo from '../assets/eatwisely.ico';
import { useAuth } from '../context/AuthContext';
import { joinClasses, primaryButtonClass, secondaryButtonClass } from '../utils/publicPage';
import { listRestaurants } from '../services/restaurantService';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/restaurants', label: 'Restaurants' },
  { to: '/menu', label: 'Menus' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' }
];

const popularCategories = [
  'Italian',
  'Japanese',
  'Indian',
  'Chinese',
  'Thai',
  'British',
  'French',
  'Mexican'
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ restaurants: [], categories: [], locations: [] });
  const [loading, setLoading] = useState(false);
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery('');
        setSearchResults({ restaurants: [], categories: [], locations: [] });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchAll = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ restaurants: [], categories: [], locations: [] });
        return;
      }
      setLoading(true);
      try {
        const query = searchQuery.toLowerCase();
        
        const response = await listRestaurants({ q: searchQuery, limit: 20 });
        const allRestaurants = response.data?.restaurants || response.data || [];

        const filteredRestaurants = allRestaurants.filter(
          (r) => r.name?.toLowerCase().includes(query) ||
                 r.categories?.some((c) => (typeof c === 'string' ? c : c?.name)?.toLowerCase().includes(query)) ||
                 r.address?.city?.toLowerCase().includes(query) ||
                 r.address?.areaLocality?.toLowerCase().includes(query)
        );

        const matchedCategories = popularCategories.filter(
          (c) => c.toLowerCase().includes(query)
        );
        
        const allLocations = [...new Set(
          allRestaurants
            .filter((r) => r.address?.city || r.address?.areaLocality)
            .map((r) => r.address?.city || r.address?.areaLocality)
            .filter(Boolean)
        )];
        
        const matchedLocations = allLocations
          .filter((loc) => loc.toLowerCase().includes(query))
          .slice(0, 3);

        setSearchResults({
          restaurants: filteredRestaurants.slice(0, 3),
          categories: matchedCategories.slice(0, 2),
          locations: matchedLocations
        });
      } catch {
        setSearchResults({ restaurants: [], categories: [], locations: [] });
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSearch = () => {
    if (searchQuery) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults({ restaurants: [], categories: [], locations: [] });
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/restaurants?categories=${encodeURIComponent(category)}`);
    setSearchQuery('');
    setSearchResults({ restaurants: [], categories: [], locations: [] });
  };

  const handleLocationClick = (location) => {
    navigate(`/restaurants?city=${encodeURIComponent(location)}`);
    setSearchQuery('');
    setSearchResults({ restaurants: [], categories: [], locations: [] });
  };

  const handleResultClick = (slug) => {
    navigate(`/restaurants/${slug}`);
    setSearchQuery('');
    setSearchResults({ restaurants: [], categories: [], locations: [] });
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch {
      // Silent handleSignOut
    }
  };

  const hasResults = searchResults.restaurants.length > 0 || 
                  searchResults.categories.length > 0 || 
                  searchResults.locations.length > 0;

  return (
    <header
      className={joinClasses(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? '!bg-white/95 !shadow-[0_8px_40px_rgba(191,30,24,0.12)]'
          : '!bg-white/80 !backdrop-blur-sm'
      )}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8">
        <div
          className={joinClasses(
            'flex items-center justify-between py-4 transition-all duration-300',
            scrolled ? 'py-3' : 'py-5'
          )}
        >
          <Link to="/" className="shrink-0">
            <img
              src={logo}
              alt="EatWisely"
              className={joinClasses(
                'h-auto object-contain transition-all duration-300',
                scrolled ? 'w-32' : 'w-40'
              )}
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-[1rem] px-4 py-2.5 text-sm font-semibold !text-[#201a1a] transition hover:!bg-[#fff1f0] hover:!text-[#bf1e18]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative" ref={searchRef}>
              <div className="relative flex items-center">
                <div className="relative">
                  <HiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 !text-[#534342]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search restaurants, cuisines..."
                    className="w-48 rounded-full border !border-[#d8c2c0] !bg-[#fff8f7] py-2 pl-10 pr-3 text-sm !text-[#201a1a] placeholder:!text-[#534342] transition-all duration-300 focus:w-64 focus:!border-[#bf1e18] focus:!bg-white focus:outline-none focus:!ring-2 focus:!ring-[#bf1e18]/20 lg:w-56 lg:focus:w-72"
                  />
                </div>
              </div>

              {searchQuery.length === 1 && (
                <div className="absolute right-0 top-full mt-2 w-[360px] rounded-[1.5rem] border !border-[#d8c2c0] !bg-white py-4 !shadow-[0_25px_80px_rgba(191,30,24,0.08)]">
                  <p className="text-center text-sm !text-[#534342]">
                    Type at least <span className="font-semibold !text-[#bf1e18]">2 characters</span> to search
                  </p>
                </div>
              )}

              {searchQuery.length >= 2 && (
                <div className="absolute right-0 top-full my-2 w-[360px] rounded-[1.5rem] border !border-[#d8c2c0] !bg-white py-2 !shadow-[0_25px_80px_rgba(191,30,24,0.08)] ">
                  {loading ? (
                    <div className="px-4 py-6 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 !border-[#d8c2c0] border-t-[#bf1e18]" />
                    </div>
                  ) : hasResults ? (
                    <>
                      {searchResults.categories.length > 0 && (
                        <div className="border-b !border-[#d8c2c0]">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold uppercase tracking-wider !text-[#534342]">
                              Categories
                            </p>
                          </div>
                          {searchResults.categories.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => handleCategoryClick(category)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium !text-[#201a1a] transition hover:!bg-[#fff1f0]"
                            >
                              <HiViewGrid className="h-4 w-4 !text-[#bf1e18]" />
                              {category}
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.locations.length > 0 && (
                        <div className="border-b !border-[#d8c2c0]">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold uppercase tracking-wider !text-[#534342]">
                              Locations
                            </p>
                          </div>
                          {searchResults.locations.map((location) => (
                            <button
                              key={location}
                              type="button"
                              onClick={() => handleLocationClick(location)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium !text-[#201a1a] transition hover:!bg-[#fff1f0]"
                            >
                              <HiLocationMarker className="h-4 w-4 !text-[#bf1e18]" />
                              {location}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="border-b !border-[#d8c2c0]">
                        <div className="px-4 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wider !text-[#534342]">
                            Restaurants
                          </p>
                        </div>
                        {searchResults.restaurants.map((restaurant) => (
                          <button
                            key={restaurant._id || restaurant.id}
                            type="button"
                            onClick={() => handleResultClick(restaurant.slug)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:!bg-[#fff1f0]"
                          >
                            <img
                              src={restaurant.bannerImage || restaurant.gallery?.[0] || restaurant.imageLogo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=100&q=80'}
                              alt={restaurant.name}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold !text-[#201a1a]">
                                {restaurant.name}
                              </p>
                              <p className="truncate text-xs !text-[#534342]">
                                {restaurant.categories?.[0]?.name || restaurant.categories?.[0] || 'Restaurant'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium !text-[#bf1e18]">
                              <HiStar className="h-3 w-3" />
                              {restaurant.rating?.toFixed(1) || '4.5'}
                            </div>
                          </button>
                        ))}
                        {searchResults.restaurants.length >= 3 && (
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="flex w-full items-center justify-center gap-2 border-t !border-[#d8c2c0] px-4 py-2.5 text-sm font-semibold !text-[#bf1e18] transition hover:!bg-[#fff1f0]"
                          >
                            View More Restaurants
                            <HiSearch className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm !text-[#534342]">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/favorites"
              className="rounded-full border !border-[#d8c2c0] !bg-[#fff8f7] p-2.5 !text-[#201a1a] transition hover:!border-[#bf1e18] hover:!bg-[#fff1f0]"
              aria-label="Favorites"
            >
              <HiHeart className="h-5 w-5" />
            </Link>

            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-2 rounded-full border !border-[#d8c2c0] !bg-white p-1 pr-3 transition hover:!border-[#bf1e18]"
                >
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.userName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <span className="hidden text-sm font-semibold !text-[#201a1a] sm:block">
                    {currentUser.userName}
                  </span>
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-[1.5rem] border !border-[#d8c2c0] !bg-white py-2 !shadow-[0_25px_80px_rgba(191,30,24,0.08)]">
                    <div className="border-b !border-[#d8c2c0] px-4 py-3">
                      <p className="font-semibold !text-[#201a1a]">
                        @{currentUser.userName}
                      </p>
                      <p className="truncate text-sm !text-[#534342]">
                        {currentUser.email}
                      </p>
                    </div>
                    <Link
                      to="/dashboard?tab=profile"
                      className="block px-4 py-2.5 text-sm font-medium !text-[#201a1a] hover:!bg-[#fff1f0]"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/favorites"
                      className="block px-4 py-2.5 text-sm font-medium !text-[#201a1a] hover:!bg-[#fff1f0]"
                    >
                      My Favorites
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium !text-[#bf1e18] hover:!bg-[#fff1f0]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/sign-in" className={secondaryButtonClass}>
                  Sign In
                </Link>
                <Link to="/sign-up" className={primaryButtonClass}>
                  Join Now
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-full border !border-[#d8c2c0] !bg-[#fff8f7] p-3 !text-[#201a1a] lg:hidden"
              aria-label="Menu"
            >
              {isOpen ? (
                <HiX className="h-5 w-5" />
              ) : (
                <HiMenu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t !border-[#d8c2c0] !bg-white/95 px-4 py-4 backdrop-blur lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="rounded-[1rem] px-4 py-3 text-sm font-semibold !text-[#201a1a] transition hover:!bg-[#fff1f0] hover:!text-[#bf1e18]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!currentUser && (
            <div className="mt-4 flex flex-col gap-2 border-t !border-[#d8c2c0] pt-4">
              <Link
                to="/sign-in"
                onClick={() => setIsOpen(false)}
                className={secondaryButtonClass + ' w-full justify-center'}
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                onClick={() => setIsOpen(false)}
                className={primaryButtonClass + ' w-full justify-center'}
              >
                Join Now
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}