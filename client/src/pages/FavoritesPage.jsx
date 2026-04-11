import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiTrash, HiArrowRight } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass
} from '../utils/publicPage';
import { readFavorites, writeFavorites } from '../utils/publicPage';
import { useAuth } from '../context/AuthContext';
import RestaurantSpotlightCard from '../components/public/RestaurantSpotlightCard';
import EmptyState from '../components/public/EmptyState';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initialFavorites = user ? readFavorites(user) : [];
  const [favorites, setFavorites] = useState(initialFavorites);

  const removeFavorite = (restaurant) => {
    const updated = favorites.filter(
      (f) => f._id !== restaurant._id && f.id !== restaurant.id
    );
    setFavorites(updated);
    writeFavorites(user, updated);
  };

  if (!user) {
    return (
      <main className={publicShellClass + ' pt-24'}>
        <section className={sectionWrapClass}>
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#dce6c1] border-t-[#8fa31e]" />
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={publicShellClass + ' pt-24'}>
        <section className={sectionWrapClass}>
          <EmptyState
            title="Sign In Required"
            description="Please sign in to view your favorites"
            action={
              <button
                onClick={() => navigate('/sign-in')}
                className={primaryButtonClass}
              >
                Sign In
                <HiArrowRight className="h-5 w-5" />
              </button>
            }
          />
        </section>
      </main>
    );
  }

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-8">
          <p className={sectionEyebrowClass}>Your Collection</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Favorite Restaurants
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Your saved restaurants for future dining experiences
          </p>
        </div>

        {favorites.length === 0 ? (
          <EmptyState
            title="No Favorites Yet"
            description="Start exploring and save your favorite restaurants"
            action={
              <Link to="/restaurants" className={primaryButtonClass}>
                Explore Restaurants
                <HiArrowRight className="h-5 w-5" />
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((restaurant) => (
              <div key={restaurant._id || restaurant.id} className="relative">
                <RestaurantSpotlightCard restaurant={restaurant} />
                <button
                  onClick={() => removeFavorite(restaurant)}
                  className="absolute right-4 top-4 rounded-full bg-white/90 p-2.5 shadow-md transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove from favorites"
                >
                  <HiTrash className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}