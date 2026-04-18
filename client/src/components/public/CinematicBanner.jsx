import { useState } from 'react';
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

const LOCATIONS = [
  { value: 'london-west-wickham', label: 'West Wickham, London' },
  { value: 'london-croydon', label: 'Croydon, London' },
  { value: 'london-bromley', label: 'Bromley, London' },
  { value: 'london-beckenham', label: 'Beckenham, London' },
  { value: 'london-petts-wood', label: 'Petts Wood, London' },
  { value: 'london-orpington', label: 'Orpington, London' },
  { value: 'london-kensington', label: 'Kensington, London' },
  { value: 'london-westminster', label: 'Westminster, London' },
  { value: 'london-camden', label: 'Camden, London' },
  { value: 'london-shoreditch', label: 'Shoreditch, London' },
  { value: 'paris-marais', label: 'Marais, Paris' },
  { value: 'paris-latin', label: 'Latin Quarter, Paris' },
  { value: 'paris-champs', label: 'Champs-Élysées, Paris' },
  { value: 'tokyo-shibuya', label: 'Shibuya, Tokyo' },
  { value: 'tokyo-ginza', label: 'Ginza, Tokyo' },
  { value: 'tokyo-shinjuku', label: 'Shinjuku, Tokyo' },
  { value: 'new-york-manhattan', label: 'Manhattan, New York' },
  { value: 'new-york-brooklyn', label: 'Brooklyn, New York' },
  { value: 'new-york-queens', label: 'Queens, New York' },
  { value: 'dubai-marina', label: 'Marina, Dubai' },
  { value: 'dubai-downtown', label: 'Downtown, Dubai' },
  { value: 'sydney-cbd', label: 'CBD, Sydney' },
  { value: 'sydney-bondi', label: 'Bondi, Sydney' },
  { value: 'singapore-marina-bay', label: 'Marina Bay, Singapore' },
  { value: 'singapore-orchard', label: 'Orchard, Singapore' }
];

const RESTAURANTS = [
  {
    value: 'kfc-west-wickham',
    label: 'KFC - West Wickham',
    sublabel: 'Fast Food • Chicken'
  },
  {
    value: 'kfc-croydon',
    label: 'KFC - Croydon',
    sublabel: 'Fast Food • Chicken'
  },
  {
    value: 'kfc-bromley',
    label: 'KFC - Bromley',
    sublabel: 'Fast Food • Chicken'
  },
  {
    value: 'mcdonalds-west-wickham',
    label: "McDonald's - West Wickham",
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'mcdonalds-croydon',
    label: "McDonald's - Croydon",
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'mcdonalds-orpington',
    label: "McDonald's - Orpington",
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'burger-king-bromley',
    label: 'Burger King - Bromley',
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'burger-king-shoreditch',
    label: 'Burger King - Shoreditch',
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'subway-west-wickham',
    label: 'Subway - West Wickham',
    sublabel: 'Fast Food • Sandwiches'
  },
  {
    value: 'subway-croydon',
    label: 'Subway - Croydon',
    sublabel: 'Fast Food • Sandwiches'
  },
  {
    value: 'greggs-croydon',
    label: 'Greggs - Croydon',
    sublabel: 'Bakery • Pastries'
  },
  {
    value: 'greggs-bromley',
    label: 'Greggs - Bromley',
    sublabel: 'Bakery • Pastries'
  },
  {
    value: 'starbucks-west-wickham',
    label: 'Starbucks - West Wickham',
    sublabel: 'Coffee Shop'
  },
  {
    value: 'starbucks-croydon',
    label: 'Starbucks - Croydon',
    sublabel: 'Coffee Shop'
  },
  {
    value: 'starbucks-kensington',
    label: 'Starbucks - Kensington',
    sublabel: 'Coffee Shop'
  },
  {
    value: 'costa-croydon',
    label: 'Costa Coffee - Croydon',
    sublabel: 'Coffee Shop'
  },
  {
    value: 'costa-bromley',
    label: 'Costa Coffee - Bromley',
    sublabel: 'Coffee Shop'
  },
  {
    value: 'nando-s-kensington',
    label: "Nando's - Kensington",
    sublabel: 'Restaurant • Peri-Peri Chicken'
  },
  {
    value: 'nando-s-camden',
    label: "Nando's - Camden",
    sublabel: 'Restaurant • Peri-Peri Chicken'
  },
  {
    value: 'frankie-bennie-s-camden',
    label: "Frankie & Benny's - Camden",
    sublabel: 'Restaurant • Italian'
  },
  {
    value: 'frankie-bennie-s-westminster',
    label: "Frankie & Benny's - Westminster",
    sublabel: 'Restaurant • Italian'
  },
  {
    value: 'five-guys-shoreditch',
    label: 'Five Guys - Shoreditch',
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'five-guys-kensington',
    label: 'Five Guys - Kensington',
    sublabel: 'Fast Food • Burgers'
  },
  {
    value: 'pizza-express-marais',
    label: 'Pizza Express - Marais',
    sublabel: 'Restaurant • Italian'
  },
  {
    value: 'pizza-express-champs',
    label: 'Pizza Express - Champs-Élysées',
    sublabel: 'Restaurant • Italian'
  },
  {
    value: 'wagamama-shibuya',
    label: 'Wagamama - Shibuya',
    sublabel: 'Restaurant • Japanese'
  },
  {
    value: 'wagamama-ginza',
    label: 'Wagamama - Ginza',
    sublabel: 'Restaurant • Japanese'
  },
  {
    value: 'itsu-shibuya',
    label: 'itsu - Shibuya',
    sublabel: 'Restaurant • Japanese'
  },
  {
    value: 'itsu-camden',
    label: 'itsu - Camden',
    sublabel: 'Restaurant • Japanese'
  },
  {
    value: 'the-wolseley-marais',
    label: 'The Wolseley - Marais',
    sublabel: 'Restaurant • European'
  },
  {
    value: 'le-drupa-latin',
    label: 'Le Durga - Latin Quarter',
    sublabel: 'Restaurant • French'
  },
  {
    value: 'michelin-star-manhattan',
    label: 'Le Jardin - Manhattan',
    sublabel: 'Michelin Star • Fine Dining'
  },
  {
    value: 'masa-manhattan',
    label: 'Masa - Manhattan',
    sublabel: 'Michelin Star • Japanese'
  },
  {
    value: 'per-se-brooklyn',
    label: 'Per Se - Brooklyn',
    sublabel: 'Michelin Star • American'
  },
  {
    value: 'botanical-garden-marina',
    label: 'The Botanical Garden - Marina Bay',
    sublabel: 'Restaurant • Botanical Dining'
  },
  {
    value: 'greenhouse-dubai',
    label: 'The Greenhouse - Downtown Dubai',
    sublabel: 'Restaurant • Middle Eastern'
  },
  {
    value: 'orchid-marina-bay',
    label: 'Orchid - Marina Bay',
    sublabel: 'Restaurant • Asian Fusion'
  },
  {
    value: 'seaforth-bondi',
    label: 'Seaforth - Bondi',
    sublabel: 'Restaurant • Seafood'
  }
];

export function CinematicBanner() {
  const dispatch = useDispatch();
  const selectedAllergens = useSelector(
    (state) => state.allergen.selectedAllergens
  );
  const [location, setLocation] = useState('');
  const [restaurant, setRestaurant] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (restaurant) params.set('restaurant', restaurant);
    if (selectedAllergens.length > 0)
      params.set('allergens', selectedAllergens.join(','));
    window.location.href = `/restaurants?${params.toString()}`;
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
                options={LOCATIONS}
                value={location}
                onChange={setLocation}
                placeholder="Select location"
                searchPlaceholder="Search location..."
                icon={HiLocationMarker}
              />

              <SearchableDropdown
                options={RESTAURANTS}
                value={restaurant}
                onChange={setRestaurant}
                placeholder="Search restaurant"
                searchPlaceholder="Type restaurant name..."
                icon={IoRestaurant}
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
