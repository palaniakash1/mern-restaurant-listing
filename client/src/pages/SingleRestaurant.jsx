import { useParams, Link } from 'react-router-dom'
import { Card, Breadcrumb, Button, Badge, Rating } from 'flowbite-react'
import { HiHome, HiLocationMarker, HiPhone, HiGlobe, HiClock, HiMenuAlt2, HiExternalLink } from 'react-icons/hi'
import restaurantsData from '../data/restaurants.json'
import RestaurantGallery from '../components/RestaurantGallery'
import RestaurantMenu from '../components/RestaurantMenu'
import RestaurantCard from '../components/RestaurantCard'

const formatAddress = (address) => {
  if (!address) return ''
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.areaLocality,
    address.city,
    address.postcode
  ].filter(Boolean)
  return parts.join(', ')
}

const formatOpeningHours = (hours) => {
  if (!hours) return []
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.map(day => {
    const dayHours = hours[day]
    if (!dayHours || dayHours.isClosed) {
      return { day, hours: 'Closed' }
    }
    return {
      day,
      hours: `${dayHours.open} - ${dayHours.close}`
    }
  })
}

export default function SingleRestaurant() {
  const { slug } = useParams()
  const restaurant = restaurantsData.find((r) => r.slug === slug) || restaurantsData[0]
  const similarRestaurants = restaurantsData.filter((r) => r._id !== restaurant._id).slice(0, 3)

  const formattedAddress = formatAddress(restaurant.address)
  const openingHoursList = formatOpeningHours(restaurant.openingHours)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb className="mb-6">
          <Breadcrumb.Item icon={HiHome}>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/restaurants">Restaurants</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{restaurant.name}</Breadcrumb.Item>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <img
                src={restaurant.coverImage}
                alt={restaurant.name}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Rating>
                    <Rating.Star filled={true} />
                  </Rating>
                  <span className="font-semibold">{restaurant.rating}</span>
                </div>
                <span className="text-gray-500">({restaurant.reviewCount} reviews)</span>
                <Badge color="gray">{restaurant.priceRange || '$$'}</Badge>
                <Badge color="success">{restaurant.country}</Badge>
              </div>

              <p className="text-gray-600 mb-4">{restaurant.tagline}</p>

              <div className="flex items-center gap-2 text-gray-600">
                <HiLocationMarker className="w-5 h-5" />
                <span>{formattedAddress}</span>
              </div>
            </Card>

            <RestaurantGallery images={restaurant.gallery} restaurantName={restaurant.name} />

            <RestaurantMenu menu={restaurant.menu} />

            <Card>
              <h2 className="text-xl font-bold mb-4">Visitor Reviews</h2>
              {restaurant.reviews && restaurant.reviews.length > 0 ? (
                <div className="space-y-4">
                  {restaurant.reviews.map((review, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#8fa31e] rounded-full flex items-center justify-center text-white font-semibold">
                            {review.user.charAt(0)}
                          </div>
                          <span className="font-medium">{review.user}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Rating>
                            {[...Array(5)].map((_, i) => (
                              <Rating.Star key={i} filled={i < review.rating} />
                            ))}
                          </Rating>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{review.comment}</p>
                      <p className="text-gray-400 text-xs mt-2">{review.date}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No reviews yet. Be the first to review!</p>
              )}
              <Button className="mt-4 bg-[#8fa31e]">Write a Review</Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-4">Contact Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HiPhone className="w-5 h-5 text-[#8fa31e]" />
                  <a href={`tel:${restaurant.contactNumber}`} className="text-gray-600 hover:text-[#8fa31e]">
                    {restaurant.contactNumber}
                  </a>
                </div>
                
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <HiGlobe className="w-5 h-5 text-[#8fa31e]" />
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-[#8fa31e] flex items-center gap-1"
                    >
                      Visit Website
                      <HiExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Location</h3>
              <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <HiLocationMarker className="w-8 h-8 mx-auto mb-2" />
                  <p>Map View</p>
                  <p className="text-xs">{formattedAddress}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Order Online</h3>
              <Button className="w-full bg-[#8fa31e] hover:bg-[#7a8c1a]">
                <HiMenuAlt2 className="mr-2" />
                Order Now
              </Button>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">
                <HiClock className="inline mr-2" />
                Opening Hours
              </h3>
              <div className="space-y-2 text-sm">
                {openingHoursList.map(({ day, hours }) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize text-gray-600">{day}</span>
                    <span className={hours === 'Closed' ? 'text-red-600' : 'text-gray-900'}>{hours}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {(restaurant.categories || []).map((category, index) => (
                  <Badge key={index} color="info" className="mb-2">
                    {category}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Similar Restaurants</h3>
              <div className="space-y-4">
                {similarRestaurants.map((rest) => (
                  <RestaurantCard key={rest._id} restaurant={rest} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
