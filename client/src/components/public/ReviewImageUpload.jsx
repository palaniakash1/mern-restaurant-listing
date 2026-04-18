import { useCallback, useState } from 'react';
import { HiCloudUpload, HiX } from 'react-icons/hi';
import imageCompression from 'browser-image-compression';

const MAX_IMAGES = 3;
const MAX_SIZE_MB = 2;
const MAX_WIDTH_HEIGHT = 1920;

export default function ReviewImageUpload({ images = [], onChange, disabled = false }) {
  const [uploading, setUploading] = useState(false);

  const compressImage = useCallback(async (file) => {
    const options = {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_HEIGHT,
      useWebWorker: true
    };
    return imageCompression(file, options);
  }, []);

  const handleFileSelect = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) return;

      const filesToProcess = files.slice(0, remaining);
      setUploading(true);

      try {
        const newImages = await Promise.all(
          filesToProcess.map(async (file) => {
            if (!file.type.startsWith('image/')) {
              throw new Error('Please select an image file');
            }

            const compressed = file.size > MAX_SIZE_MB * 1024 * 1024
              ? await compressImage(file)
              : file;

            const preview = URL.createObjectURL(compressed);
            return {
              file: compressed,
              preview,
              name: file.name
            };
          })
        );

        onChange([...images, ...newImages]);
      } catch (err) {
        console.error('Image processing error:', err);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [images, onChange, compressImage]
  );

  const removeImage = useCallback(
    (index) => {
      const newImages = [...images];
      if (newImages[index]?.preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      onChange(newImages);
    },
    [images, onChange]
  );

  const canAddMore = images.length < MAX_IMAGES && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div
            key={index}
            className="relative group rounded-[1.25rem] overflow-hidden border border-[#dce6c1] bg-[#f5faeb] shadow-inner"
          >
            <img
              src={img.preview || img}
              alt={`Upload ${index + 1}`}
              className="h-20 w-20 object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute inset-0 flex items-center justify-center bg-[#23411f]/60 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <HiX className="h-8 w-8 text-white" />
              </button>
            )}
          </div>
        ))}

        {canAddMore && (
          <label
            className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed transition-all ${
              uploading
                ? 'cursor-wait border-[#dce6c1] bg-[#f5faeb]'
                : 'border-[#dce6c1] hover:border-[#8fa31e] hover:bg-[#f6fdeb]'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8fa31e] border-t-transparent" />
            ) : (
              <>
                <HiCloudUpload className="h-6 w-6 text-[#8e5c2d]" />
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#9d9284]">
                  Add
                </span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="text-xs font-medium text-[#9d9284]">
        {images.length}/{MAX_IMAGES} images • Max {MAX_SIZE_MB}MB each • Auto compressed
      </p>
    </div>
  );
}