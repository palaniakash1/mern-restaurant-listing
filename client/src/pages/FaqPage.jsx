import { useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { joinClasses, publicShellClass, sectionWrapClass, sectionEyebrowClass, surfaceCardClass, primaryButtonClass } from '../utils/publicPage';

const faqItems = [
  {
    question: 'How do I find restaurants near me?',
    answer: 'Simply allow location access when prompted, or enter your location in the search bar. We\'ll show you nearby restaurants sorted by distance.'
  },
  {
    question: 'How are restaurants featured on EatWisely?',
    answer: 'Restaurants are featured based on multiple factors including FSA ratings, customer reviews, and editorial selection. We highlight establishments that meet our quality standards.'
  },
  {
    question: 'What do the FSA ratings mean?',
    answer: 'The Food Standards Agency (FSA) rates restaurants on food hygiene. Ratings range from 0 to 5, with 5 being the highest standard of cleanliness and safety.'
  },
  {
    question: 'How do I leave a review?',
    answer: 'After dining at a restaurant, you can leave a review directly on the restaurant\'s page. We encourage honest feedback to help other diners make informed decisions.'
  },
  {
    question: 'Can I book a table through EatWisely?',
    answer: 'EatWisely displays contact information and links to booking platforms. Some restaurants may allow direct reservations through their page.'
  },
  {
    question: 'How do I save my favorite restaurants?',
    answer: 'Click the heart icon on any restaurant card to save it to your favorites. You\'ll need to be signed in to access your saved restaurants across devices.'
  },
  {
    question: 'Is EatWisely available on mobile?',
    answer: 'Yes! EatWisely is fully responsive and works great on desktop, tablet, and mobile devices.'
  },
  {
    question: 'How can restaurants list their business?',
    answer: 'Restaurant owners can contact us through the Contact page to request listing or claim their existing profile.'
  }
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Help</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Find answers to common questions about EatWisely
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className={joinClasses(surfaceCardClass, 'overflow-hidden')}
            >
              <button
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-[#23411f]">{item.question}</span>
                <HiChevronDown
                  className={joinClasses(
                    'h-5 w-5 shrink-0 text-gray-400 transition',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-600">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">Can\'t find what you\'re looking for?</p>
          <a href="/contact" className={primaryButtonClass + ' mt-4'}>
            Contact Us
          </a>
        </div>
      </section>
    </main>
  );
}