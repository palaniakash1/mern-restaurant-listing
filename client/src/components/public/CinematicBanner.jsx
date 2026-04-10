import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiLocationMarker, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { joinClasses, sectionWrapClass, primaryButtonClass } from '../../utils/publicPage';

const dishes = [
  {
    id: 1,
    name: 'Truffle Risotto',
    description:
      'Creamy Arborio rice with black truffle and Parmigiano-Reggiano',
    image:
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=800&q=80',
    restaurant: 'La Terra',
    price: '£32'
  },
  {
    id: 2,
    name: 'Wagyu Steak',
    description:
      'A5 Japanese Wagyu beef with seasonal vegetables and red wine reduction',
    image:
      'https://belizeanrecipe.com/wp-content/uploads/2026/02/Wagyu-Sirloin-Steak-Recipe-2.webp',
    restaurant: 'The Prime Cut',
    price: '£85'
  },
  {
    id: 3,
    name: 'Lobster Thermidor',
    description: 'Whole Maine lobster with cognac cream sauce and herb crust',
    image:
      'https://plus.unsplash.com/premium_photo-1717345994192-f5bc10b61c09?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    restaurant: 'Ocean Blue',
    price: '£48'
  }
];

export function CinematicBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHovered) {
        setCurrentSlide((prev) => (prev + 1) % dishes.length);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const goToSlide = (index) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % dishes.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + dishes.length) % dishes.length);

  return (
    <section className={sectionWrapClass}>
      <div 
        className="relative h-[85vh] min-h-[600px] overflow-hidden rounded-[2rem]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dishes.map((dish, index) => (
          <div
            key={dish.id}
            className={joinClasses(
              'absolute inset-0 transition-opacity duration-700',
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.3),rgba(0,0,0,0.8))]" />
            <img
              src={dish.image}
              alt={dish.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.7)_100%)]" />
            <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-20 lg:pb-24">
              <div className="mx-auto w-full max-w-5xl px-6 md:px-10">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                    Featured Dish
                  </p>
                  <h1 className="mt-3 text-4xl font-bold leading-tight text-white drop-shadow-xl sm:text-5xl lg:text-6xl">
                    {dish.name}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-white/80">
                    {dish.description}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4 gap-y-4">
                    <span className="inline-flex items-center gap-2 text-white">
                      <HiLocationMarker className="h-5 w-5" />
                      <span className="font-medium">{dish.restaurant}</span>
                    </span>
                    <span className="rounded-full bg-white/20 !px-5 !py-2.5 text-lg font-bold text-white backdrop-blur">
                      {dish.price}
                    </span>
                    <Link to="/restaurants" className={primaryButtonClass}>
                      Explore Restaurants
                      <HiArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={prevSlide}
          className="group absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full !bg-white/20 backdrop-blur-md transition-all duration-300 hover:!bg-white/30 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#8fa31e]/50"
          aria-label="Previous slide"
        >
          <HiChevronLeft className="h-6 w-6 text-white transition-transform group-hover:-translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="group absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full !bg-white/20 backdrop-blur-md transition-all duration-300 hover:!bg-white/30 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#8fa31e]/50"
          aria-label="Next slide"
        >
          <HiChevronRight className="h-6 w-6 text-white transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="absolute left-1/2 bottom-6 -translate-x-1/2 flex gap-3 z-10">
          {dishes.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={joinClasses(
                'h-2 rounded-full transition-all duration-300 shadow-md',
                index === currentSlide
                  ? 'w-12 !bg-[#fff]'
                  : 'w-3 !bg-white/60 hover:!bg-white'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CinematicBanner;