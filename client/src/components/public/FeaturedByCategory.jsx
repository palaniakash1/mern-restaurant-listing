import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiArrowRight, HiTag } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, sectionEyebrowClass, primaryButtonClass, surfaceCardClass } from '../../utils/publicPage';
import { listCategories } from '../../services/restaurantService';

const categoryImages = {
  Italian: 'https://images.unsplash.com/photo-1498579150354-977fffb85898?auto=format&fit=crop&w=600&q=80',
  Japanese: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=600&q=80',
  Indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  British: 'https://images.unsplash.com/photo-1599619351208-3e6f839e60b8?auto=format&fit=crop&w=600&q=80',
  Chinese: 'https://images.unsplash.com/photo-1563245372-f21724e3856b?auto=format&fit=crop&w=600&q=80',
  French: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80',
  Thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80',
  Mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
  Biryani: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
  Cakes: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  Idli: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  Coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  Parotta: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  Dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  Juice: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80',
  Homely: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80'
};

export function FeaturedByCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedAllergens = useSelector((state) => state.allergen.selectedAllergens);
  const selectedDiet = useSelector((state) => state.dietary.selectedDiet);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await listCategories({ limit: 20 });
        const cats = response.data?.data || response.data || [];
        setCategories(cats.slice(0, 8));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
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
    return categoryImages.Italian;
  };

  const getCategoryLink = (category) => {
    const filterParams = buildFilterParams();
    const baseUrl = `/restaurants?categories=${encodeURIComponent(category.slug || category.name)}`;
    return filterParams ? `${baseUrl}&${filterParams}` : baseUrl;
  };

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Explore by Cuisine</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            What&apos;s on your mind?
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Discover restaurants by your favorite cuisine types
          </p>
        </div>
        <Link to="/restaurants" className={primaryButtonClass}>
          View All
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={joinClasses(surfaceCardClass, 'overflow-hidden')}>
              <div className="h-40 bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide [-webkit-overflow-scrolling:touch]">
          {categories.map((category) => (
            <Link
              key={category._id || category.id}
              to={getCategoryLink(category)}
              className="flex-shrink-0 flex flex-col items-center gap-4 group cursor-pointer"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-transparent group-hover:border-[#bf1e18] transition-all duration-300">
                <img
                  src={category.image || getCategoryImage(category)}
                  alt={category.name}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>
              <span className="font-bold text-[#534342] group-hover:text-[#bf1e18] transition-colors">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default FeaturedByCategory;