import { useState } from 'react';
import { Card, Badge } from 'flowbite-react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';

export default function RestaurantMenu({ menu }) {
  const [expandedCategories, setExpandedCategories] = useState([0]);
  const [activeCategory, setActiveCategory] = useState(null);

  const scrollToCategory = (categoryName) => {
    setActiveCategory(categoryName);
    const element = document.getElementById(`category-${categoryName}`);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const getUniqueCategories = () => {
    if (!menu || menu.length === 0) return [];
    return menu
      .map((cat) => cat.category || cat.name || 'Unknown')
      .filter(Boolean);
  };

  const categories = getUniqueCategories();

  if (!menu || menu.length === 0) {
    return (
      <Card className="mt-6">
        <div className="text-center py-8 text-gray-500">
          <p>No menu available for this restaurant.</p>
        </div>
      </Card>
    );
  }

  const toggleCategory = (index) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(expandedCategories.filter((i) => i !== index));
    } else {
      setExpandedCategories([...expandedCategories, index]);
    }
  };

  const getCategoryName = (category) => {
    return category.category || category.name || 'Unknown';
  };

  return (
    <Card className="mt-6">
      <h2 className="text-2xl font-bold mb-4">Full Menu</h2>

      {categories.length > 0 && (
        <div className="sticky top-0 bg-white z-10 py-3 -mx-4 px-4 -mt-4 mb-4 border-b">
          <div className="flex flex-wrap gap-2">
            {menu.map((cat, idx) => {
              const categoryName = getCategoryName(cat);
              const itemCount = cat.items?.length || 0;
              return (
                <button
                  key={idx}
                  onClick={() => scrollToCategory(categoryName)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 
                    ${
                      activeCategory === categoryName
                        ? 'bg-[#8fa31e] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {categoryName} ({itemCount})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {menu.map((category, index) => {
          const categoryName = getCategoryName(category);
          return (
            <div
              key={index}
              id={`category-${categoryName}`}
              className="border rounded-lg overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleCategory(index)}
              >
                <span className="font-semibold text-lg">{categoryName}</span>
                <span className="text-gray-500 text-sm">
                  {category.items?.length || 0} items
                </span>
                {expandedCategories.includes(index) ? (
                  <HiChevronUp className="w-5 h-5" />
                ) : (
                  <HiChevronDown className="w-5 h-5" />
                )}
              </button>

              {expandedCategories.includes(index) && (
                <div className="divide-y">
                  {(category.items || []).map((item, itemIndex) => (
                    <div key={itemIndex} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {item.name}
                            </h4>
                            {item.isMeal && (
                              <Badge color="info" size="xs">
                                Meal
                              </Badge>
                            )}
                            {item.dietary?.vegetarian && (
                              <Badge color="success" size="xs">
                                V
                              </Badge>
                            )}
                            {item.dietary?.vegan && (
                              <Badge color="success" size="xs">
                                VG
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded mt-2"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="font-semibold text-[#8fa31e]">
                            £
                            {typeof item.price === 'number'
                              ? item.price.toFixed(2)
                              : item.price}
                          </span>
                        </div>
                      </div>

                      {item.ingredients && item.ingredients.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Ingredients:</span>{' '}
                            {item.ingredients
                              .map((i) => i.name || i)
                              .join(', ')}
                          </p>
                          {item.ingredients.some(
                            (i) => i.allergens?.length > 0
                          ) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.ingredients.flatMap((i, idx) =>
                                (i.allergens || []).map((allergen, aIdx) => (
                                  <Badge
                                    key={`${idx}-${aIdx}`}
                                    color="warning"
                                    size="xs"
                                  >
                                    {allergen}
                                  </Badge>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {item.nutrition && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {item.nutrition.calories && (
                            <span
                              className={`px-2 py-1 rounded ${
                                item.nutrition.calories.level === 'green'
                                  ? 'bg-green-100 text-green-800'
                                  : item.nutrition.calories.level === 'amber'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              Cal: {item.nutrition.calories.value}
                            </span>
                          )}
                          {item.nutrition.fat && (
                            <span
                              className={`px-2 py-1 rounded ${
                                item.nutrition.fat.level === 'green'
                                  ? 'bg-green-100 text-green-800'
                                  : item.nutrition.fat.level === 'amber'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              Fat: {item.nutrition.fat.value}g
                            </span>
                          )}
                        </div>
                      )}

                      {item.upsells && item.upsells.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.upsells.map((upsell, uIdx) => (
                            <span
                              key={uIdx}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              + {upsell.label} (£{upsell.price?.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
