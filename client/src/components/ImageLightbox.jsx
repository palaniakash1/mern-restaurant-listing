import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

export function ImageLightbox({ images, selectedIndex, onClose, onIndexChange }) {
  const currentIndex = selectedIndex;

  const handlePrev = useCallback((e) => {
    e?.stopPropagation();
    if (onIndexChange) {
      onIndexChange(Math.max(0, currentIndex - 1));
    }
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback((e) => {
    e?.stopPropagation();
    if (onIndexChange) {
      onIndexChange(Math.min(images.length - 1, currentIndex + 1));
    }
  }, [currentIndex, onIndexChange, images.length]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      if (onIndexChange) {
        onIndexChange(Math.max(0, currentIndex - 1));
      }
    } else if (e.key === 'ArrowRight') {
      if (onIndexChange) {
        onIndexChange(Math.min(images.length - 1, currentIndex + 1));
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [currentIndex, onIndexChange, images.length, onClose]);

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex !== undefined && images && images.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, handleKeyDown, images]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (selectedIndex === null || selectedIndex === undefined || !images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 pb-28"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
        onClick={onClose}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:p-4"
      >
        <HiOutlineChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:p-4"
      >
        <HiOutlineChevronRight className="h-6 w-6 md:h-8 md:w-8" />
      </button>

      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={currentImage.url}
          alt={currentImage.sourceName || currentImage.source || 'Gallery image'}
          className="max-h-[65vh] max-w-[85vw] rounded-lg object-contain"
        />

        <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div>
              {currentImage.sourceName && (
                <p className="font-semibold">{currentImage.sourceName}</p>
              )}
              {currentImage.restaurantName && (
                <Link
                  to={`/restaurants/${currentImage.restaurantSlug || currentImage.restaurantId}`}
                  className="text-sm text-white/80 hover:text-white"
                  onClick={onClose}
                >
                  {currentImage.restaurantName}
                </Link>
              )}
              {currentImage.menuName && (
                <p className="text-xs text-white/70">{currentImage.menuName}</p>
              )}
              {currentImage.userName && (
                <p className="text-sm text-white/80">
                  by {currentImage.userName}
                  {currentImage.rating && (
                    <span className="ml-2 text-yellow-400">
                      {' '}{'★'.repeat(currentImage.rating)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">
                {currentIndex + 1} / {images.length}
              </span>
              {currentImage.source === 'restaurant' && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  Restaurant
                </span>
              )}
              {currentImage.source === 'menu' && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  Menu Item
                </span>
              )}
              {currentImage.source === 'review' && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  Review
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-10 flex max-w-[95vw] -translate-x-1/2 gap-2 overflow-x-auto pb-2">
        {images.map((image, idx) => (
          <button
            key={`thumb-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onIndexChange) {
                onIndexChange(idx);
              }
            }}
            className={`relative flex-shrink-0 overflow-hidden rounded-lg transition-all ${
              idx === currentIndex
                ? 'ring-2 ring-[#8fa31e] ring-offset-2'
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            <img
              src={image.url}
              alt=""
              className="h-14 w-14 object-cover md:h-16 md:w-16"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default ImageLightbox;
