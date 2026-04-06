import { useState } from 'react'
import { Modal, Carousel } from 'flowbite-react'
import { HiPhotograph } from 'react-icons/hi'

export default function RestaurantGallery({ images, restaurantName }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
        <div className="text-center text-gray-400">
          <HiPhotograph className="w-12 h-12 mx-auto mb-2" />
          <p>No images available</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {images.slice(0, 4).map((image, index) => (
          <div
            key={index}
            className={`relative ${index === 0 ? 'col-span-2 row-span-2' : ''} cursor-pointer`}
            onClick={() => {
              setSelectedIndex(index)
              setIsOpen(true)
            }}
          >
            <img
              src={image}
              alt={`${restaurantName} - ${index + 1}`}
              className={`w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity ${
                index === 0 ? 'h-64' : 'h-32'
              }`}
            />
            {index === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-lg">+{images.length - 4} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal show={isOpen} onClose={() => setIsOpen(false)} size="4xl">
        <Modal.Header>{restaurantName} - Gallery</Modal.Header>
        <Modal.Body>
          <div className="h-96">
            <Carousel slide={selectedIndex}>
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${restaurantName} - ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              ))}
            </Carousel>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  )
}
