import { useState, useCallback } from 'react';
import { Modal, Button } from 'flowbite-react';
import StarRatingInput from './StarRatingInput';
import ReviewImageUpload from './ReviewImageUpload';
import { createReview } from '../../services/reviewService';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';

export default function AddReviewModal({
  show,
  onClose,
  restaurant,
  onSuccess
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = useCallback(() => {
    setRating(0);
    setComment('');
    setImages([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!comment.trim() || comment.trim().length < 10) {
      setError('Please write at least 10 characters in your review');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let photoUrls = [];

      if (images.length > 0) {
        photoUrls = await Promise.all(
          images.map(async (img) => {
            if (img.url || img.preview) {
              return img.url || img.preview;
            }

            const result = await uploadToCloudinary({
              file: img.file,
              folder: `reviews/${restaurant._id}`,
              resourceType: 'image',
              publicIdPrefix: 'review'
            });
            return result.url;
          })
        );
      }

      await createReview(restaurant._id, {
        rating,
        comment: comment.trim(),
        photos: photoUrls
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Create review error:', err);
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment, images, restaurant, onSuccess, onClose, resetForm]);

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <Modal.Header>Write a Review</Modal.Header>
      <Modal.Body>
        <form id="review-form" onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-[1rem] border border-[#dce6c1] bg-[#fff5f5] p-4 text-sm text-[#8e1d1d]">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-semibold tracking-wide text-[#23411f]">
              How would you rate your experience?
            </label>
            <StarRatingInput value={rating} onChange={setRating} size="lg" />
            <p className="text-xs font-medium text-[#9d9284]">
              {rating > 0
                ? rating === 5
                  ? 'Excellent!'
                  : rating === 4
                    ? 'Great!'
                    : rating === 3
                      ? 'Good'
                      : rating === 2
                        ? 'Fair'
                        : 'Poor'
                : 'Tap to rate'}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#23411f]">
              Share your experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your dining experience... What did you like? What stood out?"
              rows={5}
              maxLength={1000}
              className="w-full resize-none rounded-[1rem] border border-[#d9e2bc] bg-[#f8fbf1] px-4 py-3 text-sm text-[#23411f] placeholder-[#9d9284] focus:border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50 focus:outline-none"
            />
            <p className="text-right text-xs font-medium text-[#9d9284]">
              {comment.length}/1000
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#23411f]">
              Add photos (optional)
            </label>
            <ReviewImageUpload images={images} onChange={setImages} />
          </div>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="submit"
          form="review-form"
          disabled={submitting || rating === 0}
          className="!bg-[#8fa31e] hover:!bg-[#78871c]"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
        <Button
          color="gray"
          onClick={handleClose}
          disabled={submitting}
          className="!bg-[#f7faef] !text-[#23411f] !border-[#d8dfc0]"
        >
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}