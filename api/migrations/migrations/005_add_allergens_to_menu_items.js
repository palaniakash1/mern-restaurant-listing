/* eslint-disable no-console */
/**
 * Migration: Add allergens to existing menu items
 * This migration adds allergens array to menu items based on their name/content
 * It does NOT delete any existing data
 */

const allergenMap = {
  // Milk/Dairy products
  'milk': ['milk'],
  'milkshake': ['milk'],
  'cheese': ['milk'],
  'cream': ['milk'],
  'butter': ['milk'],
  'yogurt': ['milk'],
  'ice cream': ['milk'],
  'brie': ['milk'],
  'cheddar': ['milk'],
  'mozzarella': ['milk'],
  'parmesan': ['milk'],
  'feta': ['milk'],
  'gouda': ['milk'],
  'latte': ['milk'],
  'cappuccino': ['milk'],
  'mocha': ['milk'],
  'white sauce': ['milk'],
  'bechamel': ['milk'],
  'alfredo': ['milk'],
  'quesadilla': ['milk'],
  'queso': ['milk'],

  // Eggs
  'egg': ['egg'],
  'mayonnaise': ['egg'],
  'aioli': ['egg'],
  'meringue': ['egg'],
  'custard': ['egg'],
  'french toast': ['egg'],
  'omelette': ['egg'],
  'scrambled': ['egg'],
  'poached': ['egg'],
  'carbonara': ['egg'],

  // Fish
  'fish': ['fish'],
  'salmon': ['fish'],
  'tuna': ['fish'],
  'cod': ['fish'],
  'haddock': ['fish'],
  'bass': ['fish'],
  'trout': ['fish'],
  'mackerel': ['fish'],
  'sardine': ['fish'],
  'anchovy': ['fish'],
  'anchovies': ['fish'],
  'fishcake': ['fish'],

  // Crustaceans (shellfish)
  'shrimp': ['crustaceans'],
  'prawn': ['crustaceans'],
  'prawns': ['crustaceans'],
  'crab': ['crustaceans'],
  'lobster': ['crustaceans'],
  'scallop': ['crustaceans'],
  'king prawn': ['crustaceans'],
  'scampi': ['crustaceans'],
  'crayfish': ['crustaceans'],

  // Molluscs
  'mussel': ['molluscs'],
  'mussels': ['molluscs'],
  'oyster': ['molluscs'],
  'oysters': ['molluscs'],
  'clam': ['molluscs'],
  'clams': ['molluscs'],
  'squid': ['molluscs'],
  'calamari': ['molluscs'],
  'octopus': ['molluscs'],

  // Peanut
  'peanut': ['peanut'],
  'peanuts': ['peanut'],
  'satay': ['peanut'],
  'pad thai': ['peanut'],

  // Tree nuts
  'almond': ['tree_nuts'],
  'walnut': ['tree_nuts'],
  'cashew': ['tree_nuts'],
  'pistachio': ['tree_nuts'],
  'hazelnut': ['tree_nuts'],
  'pecan': ['tree_nuts'],
  'macadamia': ['tree_nuts'],
  'praline': ['tree_nuts'],
  'marzipan': ['tree_nuts'],
  'pesto': ['tree_nuts'],
  'frangipane': ['tree_nuts'],

  // Sesame
  'sesame': ['sesame'],
  'tahini': ['sesame'],
  'hummus': ['sesame'],
  'falafel': ['sesame'],
  'brioche': ['sesame'],
  'burger bun': ['sesame'],

  // Soya/Soy
  'soy': ['soya'],
  'soya': ['soya'],
  'tofu': ['soya'],
  'edamame': ['soya'],
  'tempeh': ['soya'],
  'miso': ['soya'],
  'teriyaki': ['soya'],

  // Celery
  'celery': ['celery'],

  // Mustard
  'mustard': ['mustard'],
  'dijon': ['mustard'],

  // Sulphites
  'wine': ['sulphites'],
  'beer': ['sulphites'],
  'vinegar': ['sulphites'],
  'bourbon': ['sulphites'],
  'whisky': ['sulphites'],

  // Lupin
  'lupin': ['lupin'],
  'lupin': ['lupin'],

  // Gluten (most bread/wheat items)
  'bread': ['gluten'],
  'pasta': ['gluten'],
  'noodle': ['gluten'],
  'wheat': ['gluten'],
  'flour': ['gluten'],
  'crouton': ['gluten'],
  'croutons': ['gluten'],
  'pizza': ['gluten'],
  'burger': ['gluten'],
  'sandwich': ['gluten'],
  'wrap': ['gluten'],
  'tortilla': ['gluten'],
  'breaded': ['gluten'],
  'battered': ['gluten'],
  'croissant': ['gluten'],
  'dumpling': ['gluten'],
  'wonton': ['gluten'],
  'spring roll': ['gluten'],
  'filo': ['gluten'],
  'pasty': ['gluten'],
  'pie': ['gluten'],
  'pastry': ['gluten']
};

function getAllergensForItem(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const allergens = new Set();

  for (const [keyword, allergenList] of Object.entries(allergenMap)) {
    if (text.includes(keyword)) {
      allergenList.forEach(a => allergens.add(a));
    }
  }

  return Array.from(allergens);
}

export const up = async (db) => {
  console.log('Adding allergens to menu items...\n');

  const menus = await db.collection('menus').find({ isActive: true }).toArray();
  console.log(`Found ${menus.length} menus`);

  let updatedCount = 0;

  for (const menu of menus) {
    let menuUpdated = false;

    for (const item of menu.items) {
      if (item.isActive && !item.allergens) {
        const allergens = getAllergensForItem(item.name, item.description || '');

        if (allergens.length > 0) {
          await db.collection('menus').updateOne(
            { _id: menu._id, 'items.name': item.name },
            { $set: { 'items.$.allergens': allergens } }
          );
          console.log(`  Added allergens [${allergens.join(', ')}] to "${item.name}"`);
          menuUpdated = true;
          updatedCount++;
        }
      }
    }

    if (menuUpdated) {
      await db.collection('menus').findOneAndUpdate(
        { _id: menu._id },
        { $currentDate: { updatedAt: true } }
      );
    }
  }

  console.log(`\nDone! Updated ${updatedCount} menu items with allergens.`);
};
