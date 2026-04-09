import { useState } from 'react';
import { Badge } from 'flowbite-react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';

const ALLERGY_LABELS = {
  gluten: 'Gluten',
  egg: 'Egg',
  fish: 'Fish',
  crustaceans: 'Crustaceans',
  molluscs: 'Molluscs',
  milk: 'Milk',
  peanut: 'Peanut',
  tree_nuts: 'Tree Nuts',
  sesame: 'Sesame',
  soya: 'Soya',
  celery: 'Celery',
  mustard: 'Mustard',
  sulphites: 'Sulphites',
  lupin: 'Lupin'
};

const getNutritionClass = (level) => {
  switch (level) {
    case 'green':
      return 'bg-green-100 text-green-800';
    case 'amber':
      return 'bg-yellow-100 text-yellow-800';
    case 'red':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RestaurantMenu({ menus = [] }) {
  const [expandedCategories, setExpandedCategories] = useState([0]);

  const toggleCategory = (index) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(expandedCategories.filter((i) => i !== index));
    } else {
      setExpandedCategories([...expandedCategories, index]);
    }
  };

  if (!menus || menus.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No menu items available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {menus.map((menu, index) => {
        const categoryName = menu.category || 'Menu';
        const categoryId = `menu-category-${(menu.categorySlug || categoryName).replace(/\s+/g, '-')}`;

        return (
          <div
            key={index}
            id={categoryId}
            className="border border-gray-100 rounded-xl overflow-hidden bg-white"
          >
            <button
              className="w-full flex items-center justify-between p-4 bg-[#faf9f6] hover:bg-[#f5faeb] transition-colors"
              onClick={() => toggleCategory(index)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg text-[#23411f]">{categoryName}</span>
                <Badge className="!bg-[#e7f0d3] !text-[#23411f]">
                  {menu.items?.length || 0} items
                </Badge>
              </div>
              {expandedCategories.includes(index) ? (
                <HiChevronUp className="w-5 h-5 text-[#8fa31e]" />
              ) : (
                <HiChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedCategories.includes(index) && (
              <div className="divide-y divide-gray-50">
                {(menu.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} className="p-4 hover:bg-[#faf9f6] transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-medium text-[#23411f]">{item.name}</h4>
                          {item.isMeal && (
                            <Badge color="info" size="xs" className="!bg-blue-100 !text-blue-800">
                              Meal
                            </Badge>
                          )}
                          {item.dietary?.vegan && (
                            <Badge color="success" size="xs" className="!bg-green-100 !text-green-800">
                              VG
                            </Badge>
                          )}
                          {item.dietary?.vegetarian && !item.dietary?.vegan && (
                            <Badge color="success" size="xs" className="!bg-green-100 !text-green-800">
                              V
                            </Badge>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {item.ingredients && item.ingredients.length > 0 && (
                          <div className="mt-2">
                            {item.ingredients.some((i) => i.allergens?.length > 0) && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.ingredients.flatMap((ing, ingIdx) =>
                                  (ing.allergens || []).map((allergen, aIdx) => (
                                    <span
                                      key={`${ingIdx}-${aIdx}`}
                                      className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100"
                                      title={ALLERGY_LABELS[allergen] || allergen}
                                    >
                                      {ALLERGY_LABELS[allergen]?.slice(0, 3) || allergen.slice(0, 3)}
                                    </span>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {item.nutrition && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.nutrition.calories && (
                              <span
                                className={`text-xs px-2 py-1 rounded-md ${getNutritionClass(item.nutrition.calories.level)}`}
                              >
                                {item.nutrition.calories.value} cal
                              </span>
                            )}
                            {item.nutrition.fat && (
                              <span
                                className={`text-xs px-2 py-1 rounded-md ${getNutritionClass(item.nutrition.fat.level)}`}
                              >
                                {item.nutrition.fat.value}g fat
                              </span>
                            )}
                            {item.nutrition.sugar && (
                              <span
                                className={`text-xs px-2 py-1 rounded-md ${getNutritionClass(item.nutrition.sugar.level)}`}
                              >
                                {item.nutrition.sugar.value}g sugar
                              </span>
                            )}
                          </div>
                        )}

                        {item.upsells && item.upsells.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.upsells.map((upsell, uIdx) => (
                              <span
                                key={uIdx}
                                className="text-xs px-3 py-1.5 bg-[#f5faeb] text-[#23411f] rounded-full border border-[#dce6c1]"
                              >
                                + {upsell.label} (£{Number(upsell.price || 0).toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 min-w-[80px]">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg shadow-sm"
                          />
                        )}
                        <span className="font-bold text-[#8fa31e] text-lg">
                          £{Number(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {!item.isAvailable && (
                      <div className="mt-2">
                        <Badge color="failure" size="sm">Currently Unavailable</Badge>
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
  );
}