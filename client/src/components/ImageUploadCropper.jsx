import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from 'flowbite-react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, max));

const compressImage = (file, maxSizeMB = 3, initialQuality = 0.9) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let quality = initialQuality;
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 2048;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const checkSize = (q) => {
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size <= maxSizeMB * 1024 * 1024) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else if (q > 0.1) {
                checkSize(q - 0.15);
              } else {
                canvas.toBlob(
                  (finalBlob) => {
                    resolve(new File([finalBlob], file.name, { type: 'image/jpeg' }));
                  },
                  'image/jpeg',
                  0.1
                );
              }
            },
            'image/jpeg',
            q
          );
        };
        
        checkSize(quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

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

  const closeModal = () => {
    if (imageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageSrc('');
    setIsOpen(false);
    setError(null);
    setZoom(1.15);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleFileSelect = async (event) => {
    let file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const message = 'Please choose a valid image file.';
      setError(message);
      onError?.(message);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      try {
        file = await compressImage(file, 3);
      } catch {
        const message = 'Failed to compress image. Please choose a smaller image.';
        setError(message);
        onError?.(message);
        return;
      }
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
      
      closeModal();
      
      setTimeout(() => {
        onCropComplete?.(croppedFile);
      }, 100);
    } catch (cropError) {
      const message = cropError.message || 'Failed to crop image.';
      setError(message);
      onError?.(message);
    }
  };

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    inputRef.current?.click();
  }, []);

  const triggerElement = typeof trigger === 'function'
    ? trigger({ open: handleClick, close: closeModal })
    : trigger;

  return (
    <>
      {triggerElement && typeof triggerElement === 'object' ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const originalOnClick = triggerElement.props?.onClick;
            if (originalOnClick) {
              originalOnClick(e);
            }
            handleClick(e);
          }}
        >
          {triggerElement}
        </div>
      ) : (
        triggerElement
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
        key={imageSrc ? 'file-with-src' : 'file-empty'}
      />

      {isOpen &&
        createPortal(
          <Modal
            show={isOpen}
            onClose={closeModal}
            dismissible={true}
            size="4xl"
          >
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
                    <span className="font-semibold text-[#23411f]">
                      Horizontal
                    </span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={offsetX}
                      onChange={(event) =>
                        setOffsetX(Number(event.target.value))
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="font-semibold text-[#23411f]">
                      Vertical
                    </span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={offsetY}
                      onChange={(event) =>
                        setOffsetY(Number(event.target.value))
                      }
                      className="w-full"
                    />
                  </label>
                </div>

                <div className="rounded-[1.25rem] border border-[#e8eecf] bg-[#fbfcf7] px-4 py-3 text-sm text-gray-600">
                  Frame the strongest part of the image, then apply the crop.
                  The output keeps a {aspectRatio.toFixed(2).replace('.00', '')}
                  :1 ratio.
                </div>

                {error && (
                  <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                onClick={handleApplyCrop}
              >
                Apply crop
              </Button>
              <Button
                className="!bg-[#B42627] hover:!bg-[#910712]"
                onClick={closeModal}
              >
                Cancel
              </Button>
            </Modal.Footer>
          </Modal>,
          document.body
        )}
    </>
  );
}