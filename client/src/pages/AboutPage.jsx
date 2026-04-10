import { Link } from 'react-router-dom';
import { HiStar, HiShieldCheck, HiUserGroup, HiGlobe } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass
} from '../utils/publicPage';

export default function AboutPage() {
  const stats = [
    { label: 'Restaurants', value: '500+', icon: HiGlobe },
    { label: 'Active Users', value: '50K+', icon: HiUserGroup },
    { label: 'Reviews', value: '10K+', icon: HiStar },
    { label: 'FSA Ratings', value: '200+', icon: HiShieldCheck }
  ];

  const values = [
    {
      title: 'Quality First',
      description: 'We only feature restaurants that meet our high standards for food safety and customer experience.'
    },
    {
      title: 'Transparency',
      description: 'Honest reviews and ratings from real diners to help you make informed decisions.'
    },
    {
      title: 'Community',
      description: 'Building connections between diners and exceptional culinary experiences.'
    },
    {
      title: 'Innovation',
      description: ' continuously improving our platform to enhance your dining journey.'
    }
  ];

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={sectionEyebrowClass}>Our Story</p>
            <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
              About EatWisely
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              EatWisely was founded with a simple mission: to help diners discover
              exceptional restaurants and make informed dining decisions. We believe that
              great food brings people together, and everyone deserves access to quality
              dining experiences.
            </p>
            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              Our platform features trusted FSA ratings, authentic reviews, and
              comprehensive restaurant information to help you find the perfect
              dining destination for any occasion.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/restaurants" className={primaryButtonClass}>
                Explore Restaurants
              </Link>
              <Link to="/contact" className={secondaryButtonClass}>
                Contact Us
              </Link>
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem]">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
              alt="Restaurant dining"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className={sectionWrapClass}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={surfaceCardClass + ' p-6 text-center'}>
              <stat.icon className="mx-auto h-8 w-8 text-[#8fa31e]" />
              <p className="mt-3 text-3xl font-bold text-[#23411f]">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionWrapClass}>
        <div className="mb-8 text-center">
          <p className={sectionEyebrowClass}>What We Stand For</p>
          <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Our Values
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {values.map((value, index) => (
            <div key={index} className={surfaceCardClass + ' p-6'}>
              <h3 className="text-lg font-semibold text-[#23411f]">{value.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionWrapClass}>
        <div className={joinClasses(surfaceCardClass, 'p-8 text-center')}>
          <h2 className="text-2xl font-bold text-[#23411f]">
            Join the EatWisely Community
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600">
            Discover amazing restaurants, share your experiences, and connect with fellow food enthusiasts.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/sign-up" className={primaryButtonClass}>
              Get Started
            </Link>
            <Link to="/restaurants" className={secondaryButtonClass}>
              Browse Restaurants
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import { joinClasses } from '../utils/publicPage';