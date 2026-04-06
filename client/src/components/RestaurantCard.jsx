import { Link } from 'react-router-dom'
import { Card } from 'flowbite-react'
import { HiStar, HiLocationMarker } from 'react-icons/hi'

const formatAddress = (address) => {
  if (!address) return ''
  if (typeof address === 'string') return address.split(',').slice(1).join(',').trim()
  const parts = [address.areaLocality, address.city].filter(Boolean)
  return parts.join(', ')
}

export default function RestaurantCard({ restaurant }) {
  const displayAddress = formatAddress(restaurant.address)
  const displayCategory = restaurant.categories?.[0] || restaurant.category || ''
  return (
    <Link to={`/restaurant/${restaurant.slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative">
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          {restaurant.priceRange && (
            <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-md shadow">
              <span className="text-sm font-semibold text-[#8fa31e]">{restaurant.priceRange}</span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">{restaurant.name}</h3>
            <div className="flex items-center gap-1">
              <HiStar className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{restaurant.rating}</span>
              <span className="text-xs text-gray-500">({restaurant.reviewCount})</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-1">{restaurant.tagline}</p>
          
          <div className="flex items-center gap-1 text-gray-500">
            <HiLocationMarker className="w-4 h-4" />
            <span className="text-xs truncate">{displayAddress}</span>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs bg-[#f1f8eb] text-[#8fa31e] px-2 py-1 rounded-full">
              {displayCategory}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
