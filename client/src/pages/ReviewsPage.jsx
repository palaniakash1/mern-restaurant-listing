import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiStar, HiUserCircle } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  surfaceCardClass
} from '../utils/publicPage';

const sampleReviews = [
  {
    id: 1,
    restaurant: 'La Terra',
    user: 'James M.',
    rating: 5,
    date: '2024-03-15',
    comment: 'Absolutely stunning experience! The truffle risotto was divine and the service was impeccable. Will definitely be returning.',
    avatar: null
  },
  {
    id: 2,
    restaurant: 'The Prime Cut',
    user: 'Sarah L.',
    rating: 5,
    date: '2024-03-10',
    comment: 'Best steak I have ever had. The Wagyu was cooked to perfection. A bit pricey but totally worth it for a special occasion.',
    avatar: null
  },
  {
    id: 3,
    restaurant: 'Ocean Blue',
    user: 'Michael T.',
    rating: 4,
    date: '2024-03-08',
    comment: 'Fresh seafood and beautiful presentation. The lobster thermidor was excellent. Would recommend booking in advance.',
    avatar: null
  },
  {
    id: 4,
    restaurant: 'Sakura House',
    user: 'Emma W.',
    rating: 5,
    date: '2024-03-05',
    comment: 'Authentic Japanese cuisine. The sushi platter was incredibly fresh and the sake selection was great.',
    avatar: null
  },
  {
    id: 5,
    restaurant: 'The Old Oak',
    user: 'David R.',
    rating: 4,
    date: '2024-03-01',
    comment: 'Lovely traditional British pub. The Sunday roast was fantastic and the atmosphere was cozy.',
    avatar: null
  },
  {
    id: 6,
    restaurant: 'Burgers & Co',
    user: 'Lisa K.',
    rating: 5,
    date: '2024-02-28',
    comment: 'Best burgers in town! The truffle mayo adds such a nice touch. Fast service and great value.',
    avatar: null
  }
];

export default function ReviewsPage() {
  const [reviews] = useState(sampleReviews);
  const [filterRating, setFilterRating] = useState(null);

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Testimonials</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Reviews & Testimonials
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            See what our guests are saying about their dining experiences
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setFilterRating(null)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              !filterRating
                ? 'bg-[#8fa31e] text-white'
                : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setFilterRating(rating)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                filterRating === rating
                  ? 'bg-[#8fa31e] text-white'
                  : 'bg-[#f5faeb] text-[#23411f] hover:bg-[#dce6c1]'
              }`}
            >
              <HiStar className="mr-1 inline h-4 w-4" />
              {rating} ({reviews.filter((r) => r.rating === rating).length})
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className={joinClasses(surfaceCardClass, 'p-6')}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5faeb]">
                  <HiUserCircle className="h-8 w-8 text-[#8fa31e]" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#23411f]">
                      {review.user}
                    </h3>
                    <Link
                      to={`/restaurants/${review.restaurant.toLowerCase().replace(' ', '-')}`}
                      className="text-sm text-[#8fa31e] hover:underline"
                    >
                      {review.restaurant}
                    </Link>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <HiStar
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'text-[#efb634]'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {review.comment}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className={joinClasses(surfaceCardClass, 'py-12 text-center')}>
            <p className="text-gray-600">No reviews found for this rating</p>
          </div>
        )}
      </section>
    </main>
  );
}

import { joinClasses } from '../utils/publicPage';