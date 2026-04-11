import { useState } from 'react';
import { publicShellClass, sectionWrapClass, sectionEyebrowClass } from '../utils/publicPage';

const sampleImages = [
  { id: 1, src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', alt: 'Restaurant interior', restaurant: 'La Terra' },
  { id: 2, src: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80', alt: 'Fine dining', restaurant: 'The Prime Cut' },
  { id: 3, src: 'https://images.unsplash.com/photo-1559339352-11ffa8ff8579?auto=format&fit=crop&w=800&q=80', alt: 'Bar area', restaurant: 'Ocean Blue' },
  { id: 4, src: 'https://images.unsplash.com/photo-1514933651103-005e60baa596?auto=format&fit=crop&w=800&q=80', alt: 'Outdoor seating', restaurant: 'The Old Oak' },
  { id: 5, src: 'https://images.unsplash.com/photo-1424847651672-b39546f25208?auto=format&fit=crop&w=800&q=80', alt: 'Kitchen', restaurant: 'Sakura House' },
  { id: 6, src: 'https://images.unsplash.com/photo-1567521464027-f127ff000326?auto=format&fit=crop&w=800&q=80', alt: 'Dessert', restaurant: 'Burgers & Co' },
  { id: 7, src: 'https://images.unsplash.com/photo-1482049016-2ee3607f88e6?auto=format&fit=crop&w=800&q=80', alt: 'Brunch', restaurant: 'La Terra' },
  { id: 8, src: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80', alt: 'Dining room', restaurant: 'The Prime Cut' }
];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Gallery</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Our Photo Gallery
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Explore beautiful dining moments from our restaurants
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sampleImages.map((image) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className="group relative aspect-square overflow-hidden rounded-xl"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
              <div className="absolute bottom-3 left-3 right-3 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#23411f]">
                  {image.restaurant}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}