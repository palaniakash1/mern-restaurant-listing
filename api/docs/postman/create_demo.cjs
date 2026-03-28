const fs = require('fs');

const menuItems = {
  info: {
    name: 'Demo Menu Items',
    description: 'Detailed menu items with all fields',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    {key: 'baseUrl', value: 'http://localhost:3000/api'},
    {key: 'adminToken', value: ''},
    {key: 'restaurantId', value: ''},
    {key: 'categoryId', value: ''}
  ],
  item: [
    {
      name: '1. CREATE - Starter (Bruschetta)',
      request: {
        method: 'POST',
        url: '{{baseUrl}}/menu',
        header: [
          {key: 'Content-Type', value: 'application/json'},
          {key: 'Authorization', value: 'Bearer {{adminToken}}'}
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            restaurantId: '{{restaurantId}}',
            categoryId: '{{categoryId}}',
            status: 'published',
            items: [
              {
                name: 'Bruschetta Classica',
                description: 'Toasted ciabatta with fresh tomatoes, garlic, basil',
                price: 7.50,
                dietary: {vegetarian: true, vegan: true},
                ingredients: [
                  {name: 'Ciabatta Bread', allergens: ['gluten'], strict: true},
                  {name: 'Fresh Tomatoes', allergens: [], removable: false},
                  {name: 'Fresh Basil', allergens: [], removable: true}
                ],
                nutrition: {
                  calories: {value: 220, level: 'amber'},
                  fat: {value: 12, level: 'amber'},
                  sugar: {value: 3, level: 'green'}
                },
                order: 1,
                isAvailable: true
              }
            ]
          }, null, 2)
        }
      }
    },
    {
      name: '2. CREATE - Main (Grilled Salmon)',
      request: {
        method: 'POST',
        url: '{{baseUrl}}/menu',
        header: [
          {key: 'Content-Type', value: 'application/json'},
          {key: 'Authorization', value: 'Bearer {{adminToken}}'}
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            restaurantId: '{{restaurantId}}',
            categoryId: '{{categoryId}}',
            status: 'published',
            items: [
              {
                name: 'Grilled Atlantic Salmon',
                description: 'Fresh salmon with seasonal vegetables and potatoes',
                price: 18.99,
                dietary: {vegetarian: false, vegan: false},
                ingredients: [
                  {name: 'Atlantic Salmon Fillet', allergens: ['fish'], strict: true},
                  {name: 'Seasonal Vegetables', allergens: [], removable: false},
                  {name: 'Lemon Butter Sauce', allergens: ['milk'], removable: true}
                ],
                nutrition: {
                  calories: {value: 520, level: 'red'},
                  fat: {value: 32, level: 'red'},
                  sugar: {value: 4, level: 'green'}
                },
                isMeal: true,
                upsells: [
                  {label: 'Extra Vegetables', price: 3.00},
                  {label: 'Garlic Bread', price: 2.50}
                ],
                order: 1,
                isAvailable: true
              }
            ]
          }, null, 2)
        }
      }
    },
    {
      name: '3. CREATE - Dessert (Chocolate Cake)',
      request: {
        method: 'POST',
        url: '{{baseUrl}}/menu',
        header: [
          {key: 'Content-Type', value: 'application/json'},
          {key: 'Authorization', value: 'Bearer {{adminToken}}'}
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            restaurantId: '{{restaurantId}}',
            categoryId: '{{categoryId}}',
            status: 'published',
            items: [
              {
                name: 'Chocolate Lava Cake',
                description: 'Warm chocolate cake with molten center',
                price: 8.50,
                dietary: {vegetarian: true, vegan: false},
                ingredients: [
                  {name: 'Dark Chocolate', allergens: ['soya'], strict: true},
                  {name: 'Butter', allergens: ['milk'], strict: true},
                  {name: 'Eggs', allergens: ['egg'], strict: true}
                ],
                order: 1,
                isAvailable: true
              }
            ]
          }, null, 2)
        }
      }
    },
    {
      name: '4. CREATE - Drinks with Upsells',
      request: {
        method: 'POST',
        url: '{{baseUrl}}/menu',
        header: [
          {key: 'Content-Type', value: 'application/json'},
          {key: 'Authorization', value: 'Bearer {{adminToken}}'}
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            restaurantId: '{{restaurantId}}',
            categoryId: '{{categoryId}}',
            status: 'published',
            items: [
              {
                name: 'Coca Cola',
                price: 2.50,
                upsells: [
                  {label: '330ml Can', price: 0},
                  {label: '500ml Bottle', price: 1.00}
                ],
                order: 1
              },
              {
                name: 'House Red Wine',
                price: 6.50,
                allergens: ['sulphites'],
                upsells: [
                  {label: 'Small Glass', price: 0},
                  {label: 'Large Glass', price: 3.00},
                  {label: 'Bottle', price: 22.00}
                ],
                order: 2
              }
            ]
          }, null, 2)
        }
      }
    },
    {
      name: '5. CREATE - Full Menu',
      request: {
        method: 'POST',
        url: '{{baseUrl}}/menu',
        header: [
          {key: 'Content-Type', value: 'application/json'},
          {key: 'Authorization', value: 'Bearer {{adminToken}}'}
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            restaurantId: '{{restaurantId}}',
            categoryId: '{{categoryId}}',
            status: 'published',
            items: [
              {
                name: 'Ribeye Steak',
                description: '12oz premium ribeye with chips',
                price: 28.99,
                ingredients: [
                  {name: 'Ribeye Steak', allergens: [], strict: true},
                  {name: 'Peppercorn Sauce', allergens: ['milk'], removable: true}
                ],
                isMeal: true,
                upsells: [
                  {label: 'Rare', price: 0},
                  {label: 'Medium', price: 0},
                  {label: 'Well Done', price: 0}
                ],
                order: 1,
                isAvailable: true
              },
              {
                name: 'The Plant Burger',
                description: 'Beyond Meat patty with vegan cheese',
                price: 13.99,
                dietary: {vegetarian: true, vegan: true},
                order: 2,
                isAvailable: true
              }
            ]
          }, null, 2)
        }
      }
    }
  ]
};

fs.writeFileSync('demo_menu_v2.json', JSON.stringify(menuItems, null, 2));
console.log('Created menu demo with', menuItems.item.length, 'items');
