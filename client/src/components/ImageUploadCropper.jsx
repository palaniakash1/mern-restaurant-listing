import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'flowbite-react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createCroppedFile = async ({
  image,
  aspectRatio,
  zoom,
  offsetX,
  offsetY,
  fileName
}) => {
  const displayWidth = image.clientWidth || image.width;
  const displayHeight = image.clientHeight || image.height;
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;

  const cropDisplayWidth = displayWidth / zoom;
  const cropDisplayHeight = cropDisplayWidth / aspectRatio;

  const maxX = Math.max(0, displayWidth - cropDisplayWidth);
  const maxY = Math.max(0, displayHeight - cropDisplayHeight);
  const cropX = clamp((displayWidth - cropDisplayWidth) / 2 + offsetX * maxX, 0, maxX);
  const cropY = clamp((displayHeight - cropDisplayHeight) / 2 + offsetY * maxY, 0, maxY);

  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;

  const sourceX = cropX * scaleX;
  const sourceY = cropY * scaleY;
  const sourceWidth = cropDisplayWidth * scaleX;
  const sourceHeight = cropDisplayHeight * scaleY;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);

  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create cropped image.'));
          return;
        }

        resolve(
          new File([blob], fileName, {
            type: blob.type || 'image/jpeg'
          })
        );
      },
      'image/jpeg',
      0.92
    );
  });
};

export default function ImageUploadCropper({
  aspectRatio = 1,
  modalTitle = 'Crop image',
  trigger,
  onCropComplete,
  onError,
  maxFileSizeMB = 8,
  accept = 'image/*'
}) {
  const inputRef = useRef(null);
  const imageRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1.15);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [openRequestCount, setOpenRequestCount] = useState(0);

  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  useEffect(() => {
    if (openRequestCount > 0) {
      inputRef.current?.click();
    }
  }, [openRequestCount]);

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setZoom(1.15);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const message = 'Please choose a valid image file.';
      setError(message);
      onError?.(message);
      return;
    }

    if (file.size > maxFileSizeMB * 1024 * 1024) {
      const message = `Please choose an image smaller than ${maxFileSizeMB}MB.`;
      setError(message);
      onError?.(message);
      return;
    }

    if (imageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
    }

    setImageSrc(URL.createObjectURL(file));
    setZoom(1.15);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);
    setIsOpen(true);
  };

  const handleApplyCrop = async () => {
    if (!imageRef.current) {
      const message = 'Image is not ready for cropping yet.';
      setError(message);
      onError?.(message);
      return;
    }

    try {
      const croppedFile = await createCroppedFile({
        image: imageRef.current,
        aspectRatio,
        zoom,
        offsetX,
        offsetY,
        fileName: `crop-${Date.now()}.jpg`
      });
      await onCropComplete?.(croppedFile);
      closeModal();
    } catch (cropError) {
      const message = cropError.message || 'Failed to crop image.';
      setError(message);
      onError?.(message);
    }
  };

  return (
    <>
      <div className="contents">
        {trigger({
          open: () => setOpenRequestCount((current) => current + 1)
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={handleFileSelect}
      />

      <Modal show={isOpen} onClose={closeModal} size="4xl">
        <Modal.Header>{modalTitle}</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#dce6c1] bg-[#f7faef] p-4">
              <div
                className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[1.25rem] bg-black"
                style={{ aspectRatio }}
              >
                {imageSrc ? (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop source"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${zoom}) translate(${offsetX * 20}%, ${offsetY * 20}%)`,
                      transformOrigin: 'center center'
                    }}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 border border-white/70 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.28)]" />
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.25rem] border border-[#e8eecf] bg-[#fbfcf7] px-4 py-4 text-sm text-gray-600 md:grid-cols-3">
              <label className="space-y-2">
                <span className="font-semibold text-[#23411f]">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-2">
                <span className="font-semibold text-[#23411f]">Horizontal</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-2">
                <span className="font-semibold text-[#23411f]">Vertical</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="rounded-[1.25rem] border border-[#e8eecf] bg-[#fbfcf7] px-4 py-3 text-sm text-gray-600">
              Frame the strongest part of the image, then apply the crop. The output keeps a {aspectRatio.toFixed(2).replace('.00', '')}:1 ratio.
            </div>

            {error && (
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button className="bg-[#8fa31e] hover:bg-[#78871c]" onClick={handleApplyCrop}>
            Apply crop
          </Button>
          <Button color="gray" onClick={closeModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
