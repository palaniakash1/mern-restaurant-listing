import { Link } from 'react-router-dom';
import { HiArrowRight, HiTag } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, sectionEyebrowClass, primaryButtonClass, surfaceCardClass } from '../../utils/publicPage';

const sampleCategories = [
  {
    id: 1,
    name: 'Italian',
    description: 'Pasta, pizza, and authentic Italian cuisine',
    image: 'https://images.unsplash.com/photo-1498579150354-977fffb85898?auto=format&fit=crop&w=600&q=80',
    count: 24
  },
  {
    id: 2,
    name: 'Japanese',
    description: 'Sushi, ramen, and Japanese delicacies',
    image: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=600&q=80',
    count: 18
  },
  {
    id: 3,
    name: 'Indian',
    description: 'Curries, tandoor, and aromatic spices',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    count: 15
  },
  {
    id: 4,
    name: 'British',
    description: 'Traditional British fare and pub classics',
    image: 'https://images.unsplash.com/photo-1599619351208-3e6f839e60b8?auto=format&fit=crop&w=600&q=80',
    count: 12
  }
];

const categoryImages = {
  Italian: 'https://images.unsplash.com/photo-1498579150354-977fffb85898?auto=format&fit=crop&w=600&q=80',
  Japanese: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=600&q=80',
  Indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  British: 'https://images.unsplash.com/photo-1599619351208-3e6f839e60b8?auto=format&fit=crop&w=600&q=80',
  Chinese: 'https://images.unsplash.com/photo-1563245372-f21724e3856b?auto=format&fit=crop&w=600&q=80',
  French: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80',
  Thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80',
  Mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
};

const categories = sampleCategories;

export function FeaturedByCategory() {

  const getCategoryImage = (name) => categoryImages[name] || categoryImages.Italian;

  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Explore by Cuisine</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Featured Categories
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/restaurants?categories=${encodeURIComponent(category.name)}`}
            className={joinClasses(
              surfaceCardClass,
              'group relative overflow-hidden p-0 transition hover:shadow-md'
            )}
          >
            <div className="relative h-40 overflow-hidden">
              <img
                src={getCategoryImage(category.name)}
                alt={category.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.7))]" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white">{category.name}</h3>
                <p className="text-sm text-white/70">{category.count} restaurants</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default FeaturedByCategory;