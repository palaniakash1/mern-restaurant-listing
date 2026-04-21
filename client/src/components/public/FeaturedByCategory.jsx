import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiArrowRight } from 'react-icons/hi';
import {
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass
} from '../../utils/publicPage';
import { listCategories } from '../../services/restaurantService';

const categoryImages = {
  Italian:
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80',
  Japanese:
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=400&q=80',
  Indian:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80',
  British:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
  Chinese:
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80',
  French:
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80',
  Thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=400&q=80',
  Mexican:
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
  Korean:
    'https://images.unsplash.com/photo-1553163147-622ab57fa1df?auto=format&fit=crop&w=400&q=80',
  Vietnamese:
    'https://images.unsplash.com/photo-1503764654157-1046482b771c?auto=format&fit=crop&w=400&q=80',
  American:
    'https://images.unsplash.com/photo-1567620905732-2d1ec7c74447?auto=format&fit=crop&w=400&q=80',
  Mediterranean:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80'
};

export function FeaturedByCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedAllergens = useSelector(
    (state) => state.allergen.selectedAllergens
  );
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await listCategories({ limit: 50 });
        let cats = response.data?.data || response.data || [];
        if (!Array.isArray(cats) || cats.length === 0) {
          cats = response || [];
        }
        setCategories(cats.slice(0, 12));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
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

  const getCategoryImage = (category) => {
    const name = category.name || '';
    if (categoryImages[name]) return categoryImages[name];
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(categoryImages)) {
      if (lowerName.includes(key.toLowerCase())) return value;
    }
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';
  };

  const getCategoryLink = (category) => {
    const filterParams = buildFilterParams();
    const baseUrl = `/restaurants?categories=${encodeURIComponent(category.slug || category.name)}`;
    return filterParams ? `${baseUrl}&${filterParams}` : baseUrl;
  };

  return (
    <section className={sectionWrapClass}>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Explore by Cuisine</p>
          <h2 className="mt-3 font-[Manrope] text-2xl font-bold !text-[#201a1a] sm:text-3xl">
            What&apos;s on your mind?
          </h2>
          <p className="mt-3 text-sm leading-7 !text-[#534342] sm:text-base">
            Discover restaurants by your favorite cuisine types
          </p>
        </div>
        <Link to="/restaurants" className={primaryButtonClass}>
          View All
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-28 rounded-full bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide [-webkit-overflow-scrolling:touch]">
          {categories.slice(0, 12).map((category) => (
            <Link
              key={category._id || category.id || category.slug}
              to={getCategoryLink(category)}
              className="flex-shrink-0 flex flex-col items-center gap-3 group cursor-pointer"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-transparent group-hover:border-[#bf1e18] transition-all duration-300">
                <img
                  src={category.image || getCategoryImage(category)}
                  alt={category.name}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>
              <span className="font-bold !text-[#534342] group-hover:text-[#bf1e18] transition-colors">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center !text-[#534342] py-8">
          No categories found. Check backend database for generic categories.
        </p>
      )}
    </section>
  );
}

export default FeaturedByCategory;
