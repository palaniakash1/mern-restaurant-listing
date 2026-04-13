/* eslint-disable no-console */
/**
 * Restaurant Menu Seed: Create categories and menus with items for EatWisely restaurants
 */

export const run = async (db) => {
  console.log('Creating restaurant categories and menus...\n');

  const restaurants = await db.collection('restaurants')
    .find({ name: { $regex: /^EatWisely/ } })
    .toArray();

  if (restaurants.length === 0) {
    console.log('No EatWisely restaurants found. Run 002_restaurants.js first.');
    return;
  }

  console.log(`Found ${restaurants.length} restaurants\n`);

  const categoryTemplates = [
    { name: 'Starters', slugSuffix: 'starters', order: 1 },
    { name: 'Main Courses', slugSuffix: 'main-courses', order: 2 },
    { name: 'Desserts', slugSuffix: 'desserts', order: 3 },
    { name: 'Drinks', slugSuffix: 'drinks', order: 4 }
  ];

  const unsplashImages = {
    starters: [
      'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400',
      'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400',
      'https://images.unsplash.com/photo-1608039829572-09960a024861?w=400',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
      'https://images.unsplash.com/photo-1604422978777-f6f71c3b1e77?w=400',
      'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400'
    ],
    mains: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400',
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400'
    ],
    desserts: [
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
      'https://images.unsplash.com/photo-1563729768-6af784d6df78?w=400',
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'
    ],
    drinks: [
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
      'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400',
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
      'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'
    ]
  };

  const menuItems = {
    starters: [
      { name: 'Crispy Calamari', description: 'Lightly battered squid rings served with zesty lemon aioli and marinara sauce', price: 9.99 },
      { name: 'Bruschetta Classica', description: 'Grilled ciabatta topped with fresh tomatoes, garlic, basil, and extra virgin olive oil', price: 7.50, dietary: { vegetarian: true, vegan: true } },
      { name: 'Soup of the Day', description: 'Ask your server for todays seasonal soup selection, served with artisan bread', price: 6.95, dietary: { vegetarian: true, vegan: false } },
      { name: 'Chicken Wings', description: 'Marinated chicken wings with your choice of buffalo, BBQ, or garlic parmesan', price: 11.99 },
      { name: 'Stuffed Mushrooms', description: 'Button mushrooms filled with cream cheese, herbs, and breadcrumbs', price: 8.99, dietary: { vegetarian: true, vegan: false } },
      { name: 'Garlic Prawns', description: 'Succulent prawns sautéed in garlic butter with white wine and fresh herbs', price: 12.99 }
    ],
    mains: [
      { name: 'Grilled Ribeye Steak', description: 'Prime 12oz ribeye with truffle mash, grilled asparagus, and peppercorn sauce', price: 28.99 },
      { name: 'Pan-Seared Salmon', description: 'Atlantic salmon with roasted vegetables, lemon butter, and herb oil', price: 18.99 },
      { name: 'Mushroom Risotto', description: 'Creamy arborio rice with wild mushrooms, parmesan, and truffle oil', price: 15.99, dietary: { vegetarian: true, vegan: false } },
      { name: 'Chicken Tikka Masala', description: 'Tender chicken in creamy tomato curry sauce with basmati rice and naan', price: 14.99 },
      { name: 'Fish and Chips', description: 'Beer-battered cod with triple-cooked chips, mushy peas, and tartare sauce', price: 16.99 },
      { name: 'Veggie Burger', description: 'House-made plant patty with all the fixings, served with sweet potato fries', price: 13.99, dietary: { vegetarian: true, vegan: true } }
    ],
    desserts: [
      { name: 'Chocolate Lava Cake', description: 'Warm chocolate fondant with molten center, vanilla bean ice cream', price: 8.99 },
      { name: 'Crème Brûlée', description: 'Classic vanilla custard with caramelized sugar crust', price: 7.99, dietary: { vegetarian: true, vegan: false } },
      { name: 'Tiramisu', description: 'Layers of espresso-soaked ladyfingers and mascarpone cream', price: 7.99 },
      { name: 'Fruit Sorbet', description: 'Refreshing trio of seasonal fruit sorbets', price: 5.99, dietary: { vegetarian: true, vegan: true } },
      { name: 'Cheesecake', description: 'New York style cheesecake with berry compote', price: 7.50 },
      { name: 'Sticky Toffee Pudding', description: 'Warm date sponge with butterscotch sauce and vanilla ice cream', price: 6.99 }
    ],
    drinks: [
      { name: 'Soft Drink', description: 'Choose from cola, diet cola, lemonade, or orange', price: 2.50, dietary: { vegetarian: true, vegan: true } },
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice, 250ml', price: 3.99, dietary: { vegetarian: true, vegan: true } },
      { name: 'House Wine', description: 'Glass of red, white, or rosé house wine', price: 6.50 },
      { name: 'Craft Beer', description: 'Selection of local and international craft beers', price: 5.99 },
      { name: 'Espresso', description: 'Double shot of our signature espresso blend', price: 2.99, dietary: { vegetarian: true, vegan: true } },
      { name: 'Milkshake', description: 'Choose vanilla, chocolate, or strawberry', price: 4.99 }
    ]
  };

  let totalCategories = 0;
  let totalMenus = 0;
  let totalItems = 0;

  for (const restaurant of restaurants) {
    console.log(`Processing: ${restaurant.name}`);

    const existingCategories = await db.collection('categories')
      .find({ restaurantId: restaurant._id, isGeneric: false })
      .toArray();

    if (existingCategories.length > 0) {
      console.log('  - Categories already exist, skipping...');
      continue;
    }

    const createdCategories = [];

    for (const template of categoryTemplates) {
      const slug = `${restaurant.slug}-${template.slugSuffix}`;

      const category = {
        name: template.name,
        slug: slug,
        isGeneric: false,
        restaurantId: restaurant._id,
        order: template.order,
        status: 'published',
        isActive: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('categories').insertOne(category);
      const categoryId = result.insertedId;
      createdCategories.push({ ...category, _id: categoryId });

      totalCategories++;
      console.log(`  - Created category: ${template.name}`);
    }

    for (const category of createdCategories) {
      let menuItemsForCategory;
      let images;

      if (category.name === 'Starters') {
        menuItemsForCategory = menuItems.starters;
        images = unsplashImages.starters;
      } else if (category.name === 'Main Courses') {
        menuItemsForCategory = menuItems.mains;
        images = unsplashImages.mains;
      } else if (category.name === 'Desserts') {
        menuItemsForCategory = menuItems.desserts;
        images = unsplashImages.desserts;
      } else {
        menuItemsForCategory = menuItems.drinks;
        images = unsplashImages.drinks;
      }

      const menuItemsData = menuItemsForCategory.map((item, index) => ({
        name: item.name,
        description: item.description,
        image: images[index] || null,
        price: item.price,
        dietary: item.dietary || { vegetarian: false, vegan: false },
        ingredients: [],
        nutrition: {},
        upsells: item.name === 'Soft Drink' ? [
          { label: '330ml Can', price: 0 },
          { label: '500ml Bottle', price: 1.50 }
        ] : item.name === 'House Wine' ? [
          { label: 'Small Glass', price: 0 },
          { label: 'Large Glass', price: 3.00 },
          { label: 'Bottle', price: 22.00 }
        ] : item.name === 'Espresso' ? [
          { label: 'Single Shot', price: 0 },
          { label: 'Oat Milk', price: 0.70 }
        ] : [],
        isMeal: category.name === 'Main Courses',
        isAvailable: true,
        order: index + 1,
        isActive: true
      }));

      const menu = {
        restaurantId: restaurant._id,
        categoryId: category._id,
        items: menuItemsData,
        isActive: true,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('menus').insertOne(menu);
      totalMenus++;
      totalItems += menuItemsData.length;
      console.log(`    - Created menu with ${menuItemsData.length} items`);
    }
  }

  console.log('\n=== Seed Complete ===');
  console.log(`Categories created: ${totalCategories}`);
  console.log(`Menus created: ${totalMenus}`);
  console.log(`Menu items created: ${totalItems}`);
};
