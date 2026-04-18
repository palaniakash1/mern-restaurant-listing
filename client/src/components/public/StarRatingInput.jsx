import { HiStar } from 'react-icons/hi';

export default function StarRatingInput({ value = 0, onChange, size = 'md', disabled = false }) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const handleClick = (rating) => {
    if (!disabled && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key >= '1' && e.key <= '5') {
      onChange(parseInt(e.key));
    }
  };

  const renderStar = (star) => {
    const isSelected = star <= value;
    const sizeClass = sizes[size];

    if (isSelected) {
      return (
        <HiStar
          key={star}
          className={`${sizeClass} fill-[#efb634] text-[#efb634]`}
        />
      );
    }

    return (
      <svg
        key={star}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className={sizeClass}
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          stroke="#dce6c1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className="flex gap-1"
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Rate from 1 to 5 stars"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => handleClick(star)}
          className={`transition-transform focus:outline-none ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:scale-110 focus:ring-2 focus:ring-[#8fa31e] focus:ring-offset-2 focus:rounded-sm'
          }`}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          {renderStar(star)}
        </button>
      ))}
    </div>
  );
}