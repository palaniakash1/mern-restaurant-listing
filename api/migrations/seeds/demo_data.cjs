import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from '../models/restaurant.model.js';
import Category from '../models/category.model.js';
import Menu from '../models/menu.model.js';
import User from '../models/user.model.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/mern-restaurant'
    );
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createDemoData = async () => {
  try {
    await connectDB();

    // Get admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please create one first.');
      process.exit(1);
    }
    console.log('Using admin:', admin.email);

    // Clear existing demo data
    await Restaurant.deleteMany({ name: { $regex: /Demo/i } });
    await Category.deleteMany({ name: { $regex: /Demo/i } });
    await Menu.deleteMany({});
    console.log('Cleared existing demo data');

    // 1. Create Restaurants
    const restaurants = await Restaurant.insertMany([
      {
        name: 'Demo London Grills',
        slug: 'demo-london-grills',
        tagline: 'Best steaks in London',
        description: 'Premium steakhouse in the heart of London',
        address: {
          addressLine1: '25 Fleet Street',
          areaLocality: 'City of London',
          city: 'London',
          postcode: 'EC4Y 1AA',
          country: 'United Kingdom',
          location: { type: 'Point', coordinates: [-0.1137, 51.5156] }
        },
        openingHours: {
          monday: { open: '12:00', close: '23:00', isClosed: false },
          tuesday: { open: '12:00', close: '23:00', isClosed: false },
          wednesday: { open: '12:00', close: '23:00', isClosed: false },
          thursday: { open: '12:00', close: '23:00', isClosed: false },
          friday: { open: '12:00', close: '00:00', isClosed: false },
          saturday: { open: '12:00', close: '00:00', isClosed: false },
          sunday: { open: '12:00', close: '22:00', isClosed: false }
        },
        contactNumber: '+442071234567',
        email: 'info@demolondongrills.com',
        adminId: admin._id,
        status: 'published',
        isActive: true,
        imageLogo:
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
      },
      {
        name: 'Demo Italian Bistro',
        slug: 'demo-italian-bistro',
        tagline: 'Authentic Italian Cuisine',
        description: 'Family-owned Italian restaurant',
        address: {
          addressLine1: '156 Kensington High Street',
          areaLocality: 'Kensington',
          city: 'London',
          postcode: 'W8 7RG',
          country: 'United Kingdom',
          location: { type: 'Point', coordinates: [-0.1937, 51.501] }
        },
        openingHours: {
          monday: { open: '11:00', close: '22:00', isClosed: false },
          tuesday: { open: '11:00', close: '22:00', isClosed: false },
          wednesday: { open: '11:00', close: '22:00', isClosed: false },
          thursday: { open: '11:00', close: '22:00', isClosed: false },
          friday: { open: '11:00', close: '23:00', isClosed: false },
          saturday: { open: '11:00', close: '23:00', isClosed: false },
          sunday: { open: '12:00', close: '21:00', isClosed: false }
        },
        contactNumber: '+442071234568',
        email: 'info@demoitalianbistro.com',
        adminId: admin._id,
        status: 'published',
        isActive: true,
        imageLogo:
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'
      }
    ]);
    console.log(`Created ${restaurants.length} restaurants`);

    // 2. Create Generic Categories
    const genericCategories = await Category.insertMany([
      {
        name: 'Starters',
        slug: 'starters',
        isGeneric: true,
        order: 1,
        status: 'published',
        isActive: true
      },
      {
        name: 'Main Courses',
        slug: 'main-courses',
        isGeneric: true,
        order: 2,
        status: 'published',
        isActive: true
      },
      {
        name: 'Desserts',
        slug: 'desserts',
        isGeneric: true,
        order: 3,
        status: 'published',
        isActive: true
      },
      {
        name: 'Drinks',
        slug: 'drinks',
        isGeneric: true,
        order: 4,
        status: 'published',
        isActive: true
      }
    ]);
    console.log(`Created ${genericCategories.length} generic categories`);

    // 3. Create Restaurant-Specific Categories
    const restaurantCategories = await Category.insertMany([
      {
        name: "Chef's Specials",
        slug: 'demo-london-grills-chefs-specials',
        isGeneric: false,
        restaurantId: restaurants[0]._id,
        order: 0,
        status: 'published',
        isActive: true
      },
      {
        name: "Chef's Specials",
        slug: 'demo-italian-bistro-chefs-specials',
        isGeneric: false,
        restaurantId: restaurants[1]._id,
        order: 0,
        status: 'published',
        isActive: true
      }
    ]);
    console.log(
      `Created ${restaurantCategories.length} restaurant-specific categories`
    );

    // 4. Create Menus with Items for Restaurant 1
    const startersCat = genericCategories[0];
    const mainsCat = genericCategories[1];
    const dessertsCat = genericCategories[2];
    const drinksCat = genericCategories[3];
    const specialsCat = restaurantCategories[0];

    const menus = await Menu.insertMany([
      {
        restaurantId: restaurants[0]._id,
        categoryId: startersCat._id,
        status: 'published',
        isActive: true,
        items: [
          {
            name: 'Bruschetta Classica',
            description:
              'Toasted ciabatta with fresh tomatoes, garlic, basil and olive oil',
            image:
              'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400',
            price: 7.5,
            dietary: { vegetarian: true, vegan: true },
            order: 1,
            isAvailable: true
          },
          {
            name: 'Crispy Calamari',
            description: 'Lightly fried squid rings with aioli',
            image:
              'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
            price: 9.99,
            dietary: { vegetarian: false, vegan: false },
            order: 2,
            isAvailable: true
          },
          {
            name: 'Soup of the Day',
            description: "Ask your server for today's selection",
            image:
              'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
            price: 6.5,
            dietary: { vegetarian: true, vegan: false },
            order: 3,
            isAvailable: true
          }
        ]
      },
      {
        restaurantId: restaurants[0]._id,
        categoryId: mainsCat._id,
        status: 'published',
        isActive: true,
        items: [
          {
            name: 'Grilled Ribeye Steak',
            description:
              '12oz premium ribeye with truffle fries and peppercorn sauce',
            image:
              'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400',
            price: 28.99,
            dietary: { vegetarian: false, vegan: false },
            isMeal: true,
            order: 1,
            isAvailable: true
          },
          {
            name: 'Pan-Seared Salmon',
            description:
              'Fresh Atlantic salmon with roasted vegetables and lemon butter',
            image:
              'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
            price: 18.99,
            dietary: { vegetarian: false, vegan: false },
            isMeal: true,
            order: 2,
            isAvailable: true
          },
          {
            name: 'The Plant Burger',
            description:
              'Beyond Meat patty with vegan cheese, lettuce, tomato and special sauce',
            image:
              'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400',
            price: 14.99,
            dietary: { vegetarian: true, vegan: true },
            isMeal: true,
            order: 3,
            isAvailable: true
          }
        ]
      },
      {
        restaurantId: restaurants[0]._id,
        categoryId: dessertsCat._id,
        status: 'published',
        isActive: true,
        items: [
          {
            name: 'Chocolate Lava Cake',
            description:
              'Warm chocolate cake with molten center, served with vanilla ice cream',
            image:
              'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
            price: 8.5,
            dietary: { vegetarian: true, vegan: false },
            order: 1,
            isAvailable: true
          },
          {
            name: 'Tiramisu',
            description: 'Classic Italian coffee-flavored dessert',
            image:
              'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
            price: 7.99,
            dietary: { vegetarian: true, vegan: false },
            order: 2,
            isAvailable: true
          }
        ]
      },
      {
        restaurantId: restaurants[0]._id,
        categoryId: drinksCat._id,
        status: 'published',
        isActive: true,
        items: [
          {
            name: 'Coca Cola',
            price: 2.5,
            dietary: { vegetarian: true, vegan: true },
            upsells: [
              { label: '330ml Can', price: 0 },
              { label: '500ml Bottle', price: 1.0 }
            ],
            order: 1,
            isAvailable: true
          },
          {
            name: 'House Red Wine',
            description: 'Glass of Spanish red wine',
            price: 6.5,
            allergens: ['sulphites'],
            upsells: [
              { label: 'Small Glass', price: 0 },
              { label: 'Large Glass', price: 3.0 },
              { label: 'Bottle', price: 22.0 }
            ],
            order: 2,
            isAvailable: true
          },
          {
            name: 'Espresso',
            price: 2.0,
            dietary: { vegetarian: true, vegan: true },
            upsells: [
              { label: 'Double', price: 1.0 },
              { label: 'Oat Milk', price: 0.7 }
            ],
            order: 3,
            isAvailable: true
          }
        ]
      }
    ]);
    console.log(`Created ${menus.length} menus with items`);

    console.log('\n=== Demo Data Created Successfully! ===');
    console.log('\nRestaurants:');
    restaurants.forEach((r) => console.log(`  - ${r.name} (${r.slug})`));
    console.log('\nCategories:');
    genericCategories.forEach((c) => console.log(`  - ${c.name} (generic)`));
    restaurantCategories.forEach((c) =>
      console.log(`  - ${c.name} (restaurant-specific)`)
    );
    console.log('\nMenus:');
    menus.forEach((m) => console.log(`  - ${m.items.length} items`));

    console.log('\nYou can now test the API!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo data:', error);
    process.exit(1);
  }
};

createDemoData();
