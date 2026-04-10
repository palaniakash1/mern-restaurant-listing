import { Link } from 'react-router-dom';
import { HiArrowRight, HiMenu, HiStar } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, sectionEyebrowClass, primaryButtonClass, elevatedCardClass } from '../../utils/publicPage';

const menus = [
  {
    id: 1,
    name: 'Sunday Roast',
    description: 'Traditional British roast with all the trimmings',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    price: '£24',
    category: 'British',
    restaurant: 'The Old Oak'
  },
  {
    id: 2,
    name: 'Sushi Platter',
    description: 'Assorted fresh sashimi and nigiri selection',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
    price: '£38',
    category: 'Japanese',
    restaurant: 'Sakura House'
  },
  {
    id: 3,
    name: 'Beef Burger Deluxe',
    description: 'Premium beef patty with truffle mayo and aged cheddar',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    price: '£18',
    category: 'American',
    restaurant: 'Burgers & Co'
  }
];

export function FeaturedByMenu() {
  return (
    <section className={sectionWrapClass}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className={sectionEyebrowClass}>Chef&apos;s Specials</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Featured Menus
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Signature dishes and chef&apos;s specials from top restaurants
          </p>
        </div>
        <Link to="/menu" className={primaryButtonClass}>
          View All Menus
          <HiArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => (
          <article key={menu.id} className={joinClasses(elevatedCardClass, 'group overflow-hidden')}>
            <div className="relative h-48 overflow-hidden">
              <img
                src={menu.image}
                alt={menu.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.6))]" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#23411f]">
                  {menu.category}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#23411f]">{menu.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{menu.description}</p>
                </div>
                <span className="shrink-0 text-lg font-bold text-[#8fa31e]">{menu.price}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <HiMenu className="h-4 w-4" />
                <span>{menu.restaurant}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FeaturedByMenu;