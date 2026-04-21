import { useState } from 'react';
import { HiChevronDown, HiChevronUp, HiPlus } from 'react-icons/hi';

const isItemUnsuitable = (item, allergens = [], dietary = []) => {
  const itemAllergens = item?.allergens || [];
  (item?.ingredients || []).forEach((ingredient) => {
    (ingredient.allergens || []).forEach((allergen) => {
      itemAllergens.push(allergen);
    });
  });

  for (const allergen of allergens) {
    if (itemAllergens.includes(allergen)) return true;
  }

  const itemDietary = item?.dietary || {};
  for (const diet of dietary) {
    if (diet === 'vegan' && !itemDietary.vegan) return true;
    if (diet === 'vegetarian' && !itemDietary.vegetarian && !itemDietary.vegan) return true;
    if (diet === 'gf' && !itemDietary.gf) return true;
    if (diet === 'halal' && !itemDietary.halal) return true;
    if (diet === 'kosher' && !itemDietary.kosher) return true;
  }

  return false;
};

const getItemBadges = (item) => {
  const badges = [];
  const dietary = item?.dietary || {};
  if (dietary.vegan) badges.push('Vegan');
  else if (dietary.vegetarian) badges.push('Vegetarian');
  if (dietary.gf) badges.push('GF');
  if (dietary.halal) badges.push('Halal');
  if (dietary.kosher) badges.push('Kosher');
  return badges;
};

const getItemAllergens = (item) => {
  const allergens = new Set(item?.allergens || []);
  (item?.ingredients || []).forEach((ingredient) => {
    (ingredient.allergens || []).forEach((allergen) => {
      allergens.add(allergen);
    });
  });
  return Array.from(allergens);
};

const getItemNutrition = (item) => {
  return item?.nutrition || {};
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(Number(price || 0));
};

export function MenuItemCard({
  item,
  selectedAllergens = [],
  selectedDiet = [],
  onAddToCart
}) {
  const [expandedAllergens, setExpandedAllergens] = useState(false);
  const [expandedNutrition, setExpandedNutrition] = useState(false);

  const isUnsuitable = isItemUnsuitable(item, selectedAllergens, selectedDiet);
  const itemBadges = getItemBadges(item);
  const itemAllergens = getItemAllergens(item);
  const itemNutrition = getItemNutrition(item);

  return (
    <article
      className={`group overflow-hidden rounded-[1.2rem] border shadow-[0_4px_16px_rgba(64,48,20,0.04)] ${
        isUnsuitable
          ? 'border-[#d0ccc8] bg-[#f7f5f4]'
          : 'border-[#ebf0d7] bg-[linear-gradient(135deg,#ffffff_0%,#fbfcf7_100%)]'
      }`}
    >
      <div className="relative h-32 overflow-hidden bg-[#f4ede2]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${isUnsuitable ? 'grayscale' : ''}`}
          />
        ) : (
          <div
            className={`h-full w-full flex items-center justify-center ${isUnsuitable ? 'grayscale' : ''}`}
          >
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {item.isAvailable === false && (
          <span className="absolute left-2 top-2 rounded-full bg-[#b62828] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
            Unavailable
          </span>
        )}
        {isUnsuitable && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rotate-12 rounded-full !bg-[#bf1e18] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] !text-white">
              Not Suitable
            </span>
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4
              className={`text-base font-black tracking-tight truncate ${isUnsuitable ? 'grayscale' : '!text-[#201a1a]'}`}
            >
              {item.name}
            </h4>
            <p
              className={`mt-1 text-xs leading-5 line-clamp-2 ${isUnsuitable ? 'grayscale text-[#534342]' : 'text-[#6d6358]'}`}
            >
              {item.description || 'Signature details coming soon.'}
            </p>
          </div>
          <div
            className={`text-lg font-black shrink-0 ${isUnsuitable ? 'grayscale text-[#534342]' : '!text-[#bf1e18]'}`}
          >
            {formatPrice(item.price)}
          </div>
        </div>

        <div
          className={`mt-2 flex flex-wrap gap-1 ${isUnsuitable ? 'grayscale' : ''}`}
        >
          {itemBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-[#edf3e4] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#47692e]"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={itemAllergens.length === 0}
            onClick={() => setExpandedAllergens(!expandedAllergens)}
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
              itemAllergens.length === 0
                ? 'text-[#ccc] cursor-not-allowed'
                : expandedAllergens
                  ? 'text-[#bf1e18]'
                  : 'text-[#bf1e18] hover:text-[#8e1d1d]'
            }`}
          >
            <span>
              {expandedAllergens ? (
                <HiChevronUp className="h-3 w-3" />
              ) : (
                <HiChevronDown className="h-3 w-3" />
              )}
            </span>
            <span>Allergens</span>
          </button>

          <button
            type="button"
            disabled={Object.keys(itemNutrition).length === 0}
            onClick={() => setExpandedNutrition(!expandedNutrition)}
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
              Object.keys(itemNutrition).length === 0
                ? 'text-[#ccc] cursor-not-allowed'
                : expandedNutrition
                  ? 'text-[#bf1e18]'
                  : 'text-[#bf1e18] hover:text-[#8e1d1d]'
            }`}
          >
            <span>
              {expandedNutrition ? (
                <HiChevronUp className="h-3 w-3" />
              ) : (
                <HiChevronDown className="h-3 w-3" />
              )}
            </span>
            <span>Nutrition</span>
          </button>

          {onAddToCart && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              disabled={item.isAvailable === false}
              className="flex h-8 w-8 items-center justify-center rounded-full transition !bg-[#1f2e17] text-white hover:!bg-[#2d4121] disabled:!bg-gray-400 disabled:cursor-not-allowed"
            >
              <HiPlus className="h-4 w-4" />
            </button>
          )}
        </div>

        {expandedAllergens && itemAllergens.length > 0 && (
          <div className="mt-2 rounded-lg border border-[#bf1e18] bg-[#fff8f7] p-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] !text-[#bf1e18] mb-2">
              Contains allergens
            </p>
            <div className="grid grid-cols-3 gap-1">
              {itemAllergens.map((allergen) => (
                <div
                  key={allergen}
                  className="rounded-md px-2 py-2 text-center bg-[#fee2e2]"
                >
                  <p className="text-[10px] font-semibold text-[#000] uppercase ">
                    {allergen}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {expandedNutrition && Object.keys(itemNutrition).length > 0 && (
          <div className="mt-2 rounded-lg border border-[#ebf0d7] bg-[#faf6ef] p-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8e5c2d] mb-2">
              Nutrition per serving
            </p>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(itemNutrition).map(([key, nutrient]) => (
                <div
                  key={key}
                  className={`rounded-md px-2 py-1 text-center ${
                    nutrient.level === 'red'
                      ? 'bg-[#fee2e2]'
                      : nutrient.level === 'amber'
                        ? 'bg-[#fef3c7]'
                        : 'bg-[#dcfce7]'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-[#23411f]">
                    {nutrient.value}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[#6d6358]">
                    {key}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default MenuItemCard;