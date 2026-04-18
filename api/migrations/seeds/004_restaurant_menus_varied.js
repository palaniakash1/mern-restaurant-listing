/* eslint-disable no-console */
/**
 * Restaurant Menu Seed: Create varied, cuisine-specific menu items for each EatWisely restaurant
 */

export const run = async (db) => {
  console.log('Creating restaurant-specific menus...\n');

  const restaurants = await db.collection('restaurants')
    .find({ name: { $regex: /^EatWisely/ } })
    .toArray();

  if (restaurants.length === 0) {
    console.log('No EatWisely restaurants found.');
    return;
  }

  console.log(`Found ${restaurants.length} restaurants\n`);

  const menuTemplates = {
    starters: [
      // British/General
      {
        slugs: ['eatwisely-the-ivy-garden', 'eatwisely-brunch-social', 'eatwisely-fish-and-chips'],
        items: [
          { name: 'Soup of the Day', description: 'Seasonal soup served with crusty bread', price: 6.95, dietary: { vegetarian: true } },
          { name: 'Crispy Duck Egg', description: 'Soft-boiled duck egg with soldiers and truffle oil', price: 8.99 },
          { name: 'Smoked Salmon', description: 'Oak-smoked salmon with capers and brown bread', price: 11.99 },
          { name: 'Beef Carpaccio', description: 'Thinly sliced raw beef with parmesan and rocket', price: 10.99 },
          { name: 'Chicken Liver Pate', description: 'Smooth chicken liver pate with toast and chutney', price: 9.50 },
          { name: 'Crispy Squid', description: 'Lightly battered squid with sweet chili dipping sauce', price: 10.50 }
        ]
      },
      // Indian
      {
        slugs: ['eatwisely-spice-lane'],
        items: [
          { name: 'Onion Bhaji', description: 'Crispy onion fritters with mint chutney', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Samosa Chaat', description: 'Crispy samosas topped with yogurt and chutneys', price: 7.50, dietary: { vegetarian: true } },
          { name: 'Lamb Seekh Kebab', description: 'Minced lamb kebabs with green chutney', price: 9.99 },
          { name: 'Paneer Tikka', description: 'Grilled cottage cheese marinated in spices', price: 8.50, dietary: { vegetarian: true } },
          { name: 'Chicken Tikka', description: 'Tandoori chicken pieces with mint sauce', price: 9.50 },
          { name: 'Mixed Grill Platter', description: 'Assortment of grilled meats for two', price: 16.99 }
        ]
      },
      // Japanese
      {
        slugs: ['eatwisely-sakura-japanese'],
        items: [
          { name: 'Edamame', description: 'Steamed soybeans with sea salt', price: 4.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Agedashi Tofu', description: 'Fried tofu in dashi broth with ginger', price: 7.99, dietary: { vegetarian: true } },
          { name: 'Gyoza', description: 'Pan-fried pork dumplings with ponzu', price: 8.50 },
          { name: 'Takoyaki', description: 'Octopus balls with bonito flakes and sauce', price: 9.99 },
          { name: 'Sashimi Platter', description: 'Assorted fresh raw fish selection', price: 18.99 },
          { name: 'Prawn Tempura', description: 'Lightly battered king prawns with tentsuyu', price: 12.99 }
        ]
      },
      // Mexican/Tapas
      {
        slugs: ['eatwisely-tapas-revolution', 'eatwisely-mediterranean-breeze'],
        items: [
          { name: 'Patatas Bravas', description: 'Crispy potatoes with spicy tomato sauce', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Calamares Fritos', description: 'Fried squid rings with aioli', price: 9.99 },
          { name: 'Gambas al Ajillo', description: 'Garlic prawns in olive oil', price: 11.99 },
          { name: 'Croquetas', description: 'Creamy ham croquettes with paprika', price: 8.50 },
          { name: 'Jamón Ibérico', description: 'Sliced Iberian ham with bread', price: 14.99 },
          { name: 'Aceitunas', description: 'Marinated olives with herbs', price: 5.50, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      // Burger/American
      {
        slugs: ['eatwisely-the-burger-joint', 'eatwisely-burger-barn', 'eatwisely-steakhouse-1920'],
        items: [
          { name: 'Loaded Fries', description: 'Crispy fries with cheese, bacon, and BBQ sauce', price: 7.99 },
          { name: 'Mozzarella Sticks', description: 'Breaded mozzarella with marinara sauce', price: 8.50, dietary: { vegetarian: true } },
          { name: 'Onion Rings', description: 'Beer-battered onion rings', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Buffalo Wings', description: 'Spicy buffalo wings with blue cheese dip', price: 10.99 },
          { name: 'Nachos Supreme', description: 'Tortilla chips with all the toppings', price: 11.99 },
          { name: 'Mac & Cheese Bites', description: 'Creamy mac and cheese balls with ranch', price: 7.50, dietary: { vegetarian: true } }
        ]
      },
      // Thai/Vietnamese
      {
        slugs: ['eatwisely-thai-orchid', 'eatwisely-vietnamese-kitchen'],
        items: [
          { name: 'Spring Rolls', description: 'Fresh vegetable spring rolls with peanut sauce', price: 6.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Prawn Crackers', description: 'Crispy prawn crackers with sweet chili', price: 4.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Chicken Satay', description: 'Grilled chicken skewers with peanut sauce', price: 8.99 },
          { name: 'Tom Yum Soup', description: 'Spicy and sour soup with shrimp', price: 7.99 },
          { name: 'Pork Gyoza', description: 'Pan-fried dumplings with soy sauce', price: 7.50 },
          { name: 'Crispy Soft Shell Crab', description: 'Whole soft shell crab with dipping sauce', price: 12.99 }
        ]
      },
      // Greek
      {
        slugs: ['eatwisely-greek-taverna'],
        items: [
          { name: 'Tzatziki', description: 'Greek yogurt dip with cucumber and garlic', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Hummus', description: 'Creamy chickpea dip with warm pita', price: 6.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Dolmades', description: 'Stuffed vine leaves with rice and herbs', price: 7.99, dietary: { vegetarian: true } },
          { name: 'Keftedes', description: 'Greek meatballs with tzatziki', price: 9.50 },
          { name: 'Octopus Grilled', description: 'Grilled octopus with lemon and oregano', price: 13.99 },
          { name: 'Halloumi', description: 'Grilled halloumi cheese with honey', price: 8.99, dietary: { vegetarian: true } }
        ]
      },
      // Korean
      {
        slugs: ['eatwisely-seoul-kitchen'],
        items: [
          { name: 'Kimchi', description: 'Traditional fermented vegetables', price: 5.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Japchae', description: 'Stir-fried glass noodles with vegetables', price: 8.99, dietary: { vegetarian: true } },
          { name: 'Korean Fried Chicken', description: 'Crispy fried chicken with gochujang sauce', price: 11.99 },
          { name: 'Bulgogi', description: 'Marinated grilled beef slices', price: 13.99 },
          { name: 'Pajeon', description: 'Korean spring onion pancake', price: 7.99, dietary: { vegetarian: true } },
          { name: 'Tteokbokki', description: 'Spicy rice cakes in red pepper sauce', price: 8.50, dietary: { vegetarian: true } }
        ]
      },
      // Vegan
      {
        slugs: ['eatwisely-plant-power'],
        items: [
          { name: 'Buffalo Cauliflower', description: 'Crispy cauliflower with buffalo sauce', price: 8.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Avocado Bruschetta', description: 'Smashed avocado on toasted sourdough', price: 9.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Crispy Chickpeas', description: 'Roasted spiced chickpeas with lime', price: 6.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Beetroot Carpaccio', description: 'Thinly sliced beetroot with vegan feta', price: 8.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Mushroom Tartare', description: 'Plant-based tartare with avocado', price: 10.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Spring Rolls', description: 'Fresh vegetable rolls with peanut sauce', price: 7.50, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      // Pizza
      {
        slugs: ['eatwisely-pizza-paradiso'],
        items: [
          { name: 'Bruschetta', description: 'Tomato and basil on grilled bread', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Caprese Salad', description: 'Fresh mozzarella, tomato, and basil', price: 8.99, dietary: { vegetarian: true } },
          { name: 'Garlic Bread', description: 'Crusty bread with garlic butter', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Arancini', description: 'Risotto balls with mozzarella center', price: 7.99, dietary: { vegetarian: true } },
          { name: 'Burrata', description: 'Fresh burrata with pesto and tomatoes', price: 10.99, dietary: { vegetarian: true } },
          { name: 'Antipasto Plate', description: 'Selection of Italian cured meats and cheeses', price: 14.99 }
        ]
      },
      // Chinese/Dim Sum
      {
        slugs: ['eatwisely-dim-sum-house'],
        items: [
          { name: 'Har Gow', description: 'Crystal shrimp dumplings', price: 7.50 },
          { name: 'Siu Mai', description: 'Pork and prawn dumplings', price: 7.00 },
          { name: 'Char Siu Bao', description: 'Steamed BBQ pork buns', price: 6.50 },
          { name: 'Cheung Fun', description: 'Rice noodle rolls with various fillings', price: 8.00 },
          { name: 'Phoenix Claws', description: 'Braised chicken feet in black bean sauce', price: 6.99 },
          { name: 'Turnip Cake', description: 'Pan-fried radish cake', price: 6.50, dietary: { vegetarian: true } }
        ]
      },
      // Wine Cellar
      {
        slugs: ['eatwisely-the-wine-cellar'],
        items: [
          { name: 'Cheese Board', description: 'Selection of artisan cheeses with crackers', price: 14.99 },
          { name: 'Charcuterie Board', description: 'Cured meats and olives selection', price: 15.99 },
          { name: 'Truffle Fries', description: 'Crispy fries with truffle oil and parmesan', price: 8.99, dietary: { vegetarian: true } },
          { name: 'Oysters', description: 'Half dozen fresh oysters with mignonette', price: 16.99 },
          { name: 'Beef Tartare', description: 'Hand-cut beef with capers and quail egg', price: 13.99 },
          { name: 'Foie Gras', description: 'Pan-seared foie gras with brioche', price: 19.99 }
        ]
      },
      // Rooftop/Grill
      {
        slugs: ['eatwisely-rooftop-grill'],
        items: [
          { name: 'Tuna Tartare', description: 'Fresh tuna with avocado and sesame', price: 12.99 },
          { name: 'Beef Skewers', description: 'Marinated beef on rosemary skewers', price: 11.99 },
          { name: 'Lamb Chops', description: 'Grilled lamb chops with mint sauce', price: 14.99 },
          { name: 'Tiger Prawns', description: 'Grilled tiger prawns with garlic butter', price: 13.99 },
          { name: 'Halloumi Skewers', description: 'Grilled halloumi with vegetables', price: 9.99, dietary: { vegetarian: true } },
          { name: 'Mezze Platter', description: 'Selection of Mediterranean dips and breads', price: 12.99, dietary: { vegetarian: true } }
        ]
      }
    ],
    mains: [
      // British/General
      {
        slugs: ['eatwisely-the-ivy-garden', 'eatwisely-brunch-social'],
        items: [
          { name: 'Fish and Chips', description: 'Beer-battered cod with triple-cooked chips', price: 16.99 },
          { name: 'Shepherd\'s Pie', description: 'Slow-cooked lamb with mashed potato', price: 15.99 },
          { name: 'Beef Wellington', description: 'Tender beef wrapped in puff pastry', price: 28.99 },
          { name: 'Roast Chicken', description: 'Herb-roasted chicken with all the trimmings', price: 18.99 },
          { name: 'Mushroom Risotto', description: 'Creamy arborio rice with wild mushrooms', price: 14.99, dietary: { vegetarian: true } },
          { name: 'Pan-Fried Sea Bass', description: 'Sea bass with samphire and new potatoes', price: 19.99 }
        ]
      },
      // Indian
      {
        slugs: ['eatwisely-spice-lane'],
        items: [
          { name: 'Chicken Tikka Masala', description: 'Creamy tomato curry with grilled chicken', price: 14.99 },
          { name: 'Lamb Rogan Josh', description: 'Slow-cooked lamb in aromatic spices', price: 16.99 },
          { name: 'Palak Paneer', description: 'Spinach curry with cottage cheese cubes', price: 12.99, dietary: { vegetarian: true } },
          { name: 'Butter Chicken', description: 'Rich and creamy tomato-based curry', price: 15.99 },
          { name: 'Vegetable Biryani', description: 'Fragrant rice with mixed vegetables', price: 13.99, dietary: { vegetarian: true } },
          { name: 'Lamb Biryani', description: 'Aromatic rice with tender lamb pieces', price: 17.99 }
        ]
      },
      // Japanese
      {
        slugs: ['eatwisely-sakura-japanese'],
        items: [
          { name: 'Salmon Teriyaki', description: 'Grilled salmon with teriyaki glaze and rice', price: 18.99 },
          { name: 'Chicken Katsu', description: 'Breaded chicken cutlet with curry sauce', price: 15.99 },
          { name: 'Vegetable Tempura Udon', description: 'Thick noodles in hot broth with tempura', price: 14.99, dietary: { vegetarian: true } },
          { name: 'Beef Teriyaki Don', description: 'Beef slices on rice with teriyaki', price: 17.99 },
          { name: 'Sushi Platter', description: 'Assorted nigiri and maki rolls', price: 24.99 },
          { name: 'Ramen', description: 'Rich pork broth ramen with soft-boiled egg', price: 16.99 }
        ]
      },
      // Mediterranean
      {
        slugs: ['eatwisely-mediterranean-breeze'],
        items: [
          { name: 'Grilled Sea Bass', description: 'Whole sea bass with lemon and herbs', price: 22.99 },
          { name: 'Paella', description: 'Spanish rice with seafood and saffron', price: 24.99 },
          { name: 'Lamb Tagine', description: 'Slow-cooked lamb with apricots and almonds', price: 19.99 },
          { name: 'Falafel Plate', description: 'Crispy chickpea fritters with hummus', price: 13.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Grilled Octopus', description: 'Tender octopus with potatoes and olives', price: 21.99 },
          { name: 'Moussaka', description: 'Layered eggplant and minced meat bake', price: 15.99 }
        ]
      },
      // Tapas/Spanish
      {
        slugs: ['eatwisely-tapas-revolution'],
        items: [
          { name: 'Paella Valenciana', description: 'Traditional rice dish with chicken and seafood', price: 22.99 },
          { name: 'Pollo al Ajillo', description: 'Chicken thighs in garlic sauce', price: 14.99 },
          { name: 'Bacalao', description: 'Salt cod cooked in cream and potatoes', price: 18.99 },
          { name: 'Fabada Asturiana', description: 'Rich bean stew with chorizo and pork', price: 13.99 },
          { name: 'Rabo de Toro', description: 'Slow-cooked oxtail stew', price: 19.99 },
          { name: 'Spinach with Chickpeas', description: 'Espinacas con garbanzos', price: 11.99, dietary: { vegetarian: true } }
        ]
      },
      // Burger/American
      {
        slugs: ['eatwisely-the-burger-joint', 'eatwisely-burger-barn'],
        items: [
          { name: 'Classic Cheeseburger', description: 'Beef patty with cheddar, lettuce, tomato', price: 13.99 },
          { name: 'Bacon BBQ Burger', description: 'Double patty with bacon and BBQ sauce', price: 16.99 },
          { name: 'Veggie Burger', description: 'Plant-based patty with all the fixings', price: 12.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Mushroom Swiss', description: 'Beef patty with sauteed mushrooms and swiss', price: 15.99 },
          { name: 'Nashville Hot Chicken', description: 'Spicy fried chicken sandwich', price: 14.99 },
          { name: 'Loaded Cheese Fries', description: 'Fries with cheese, bacon, and ranch', price: 10.99 }
        ]
      },
      // Steakhouse
      {
        slugs: ['eatwisely-steakhouse-1920'],
        items: [
          { name: 'Ribeye Steak', description: '12oz prime ribeye cooked to perfection', price: 32.99 },
          { name: 'Filet Mignon', description: '8oz tender center-cut filet', price: 36.99 },
          { name: 'NY Strip', description: '14oz strip loin steak', price: 29.99 },
          { name: 'Tomahawk Ribeye', description: '32oz bone-in ribeye for sharing', price: 65.99 },
          { name: 'BBQ Ribs', description: 'Slow-smoked pork ribs with sauce', price: 24.99 },
          { name: 'Grilled Salmon', description: 'Atlantic salmon with herb butter', price: 22.99 }
        ]
      },
      // Thai/Vietnamese
      {
        slugs: ['eatwisely-thai-orchid', 'eatwisely-vietnamese-kitchen'],
        items: [
          { name: 'Pad Thai', description: 'Stir-fried rice noodles with shrimp', price: 14.99 },
          { name: 'Green Curry', description: 'Thai green curry with coconut and basil', price: 13.99 },
          { name: 'Red Curry Duck', description: 'Red curry with roasted duck', price: 17.99 },
          { name: 'Beef Pho', description: 'Vietnamese beef noodle soup', price: 13.99 },
          { name: 'Banh Mi', description: 'Vietnamese baguette sandwich', price: 11.99 },
          { name: 'Crispy Soft Shell Crab', description: 'Whole crab with green mango salad', price: 18.99 }
        ]
      },
      // Greek
      {
        slugs: ['eatwisely-greek-taverna'],
        items: [
          { name: 'Moussaka', description: 'Layered eggplant and lamb bake', price: 15.99 },
          { name: 'Souvlaki', description: 'Grilled meat skewers with tzatziki', price: 16.99 },
          { name: 'Kleftiko', description: 'Slow-baked lamb with vegetables', price: 22.99 },
          { name: 'Spanakopita', description: 'Spinach and feta pie in filo pastry', price: 13.99, dietary: { vegetarian: true } },
          { name: 'Grilled Sea Bass', description: 'Whole fish with lemon and oregano', price: 21.99 },
          { name: 'Stifado', description: 'Rabbit stew with pearl onions', price: 19.99 }
        ]
      },
      // Korean
      {
        slugs: ['eatwisely-seoul-kitchen'],
        items: [
          { name: 'Korean BBQ Ribeye', description: 'Premium beef for tabletop grilling', price: 38.99 },
          { name: 'Bulgogi Bowl', description: 'Marinated beef over rice with vegetables', price: 16.99 },
          { name: 'Bibimbap', description: 'Rice bowl with vegetables, egg, and gochujang', price: 14.99 },
          { name: 'Japchae', description: 'Stir-fried glass noodles with beef', price: 15.99 },
          { name: 'Fried Chicken', description: 'Crispy Korean fried chicken meal', price: 17.99 },
          { name: 'Kimchi Stew', description: 'Pork and kimchi stew with tofu', price: 14.99 }
        ]
      },
      // Vegan
      {
        slugs: ['eatwisely-plant-power'],
        items: [
          { name: 'Beyond Burger', description: 'Plant-based patty with all the trimmings', price: 15.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Buddha Bowl', description: 'Quinoa bowl with roasted vegetables and tahini', price: 14.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Cauliflower Steak', description: 'Roasted cauliflower with chimichurri', price: 13.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Jackfruit Curry', description: 'Tender jackfruit in coconut curry', price: 14.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Mushroom Wellington', description: 'Puff pastry with mushroom filling', price: 16.99, dietary: { vegetarian: true } },
          { name: 'Acai Bowl', description: 'Blended acai with granola and fresh fruit', price: 12.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      // Pizza
      {
        slugs: ['eatwisely-pizza-paradiso'],
        items: [
          { name: 'Margherita', description: 'San Marzano tomatoes, mozzarella, basil', price: 12.99, dietary: { vegetarian: true } },
          { name: 'Diavola', description: 'Spicy salami and chili flakes', price: 14.99 },
          { name: 'Quattro Formaggi', description: 'Four cheese pizza', price: 14.99, dietary: { vegetarian: true } },
          { name: 'Prosciutto e Funghi', description: 'Ham and mushrooms', price: 15.99 },
          { name: 'Vegetariana', description: 'Assorted fresh vegetables', price: 13.99, dietary: { vegetarian: true } },
          { name: 'Calzone', description: 'Folded pizza with ricotta and ham', price: 14.99 }
        ]
      },
      // Chinese/Dim Sum
      {
        slugs: ['eatwisely-dim-sum-house'],
        items: [
          { name: 'Roast Duck', description: 'Half crispy aromatic duck with pancakes', price: 24.99 },
          { name: 'Kung Pao Chicken', description: 'Spicy stir-fried chicken with peanuts', price: 15.99 },
          { name: 'Sweet and Sour Pork', description: 'Classic Cantonese sweet and sour', price: 14.99 },
          { name: 'Beef in Oyster Sauce', description: 'Tender beef with vegetables', price: 16.99 },
          { name: 'Mapo Tofu', description: 'Silken tofu in spicy sauce', price: 12.99, dietary: { vegetarian: true } },
          { name: 'Fried Rice', description: 'Egg fried rice with vegetables', price: 10.99, dietary: { vegetarian: true } }
        ]
      },
      // Fish & Chips
      {
        slugs: ['eatwisely-fish-and-chips'],
        items: [
          { name: 'Traditional Fish and Chips', description: 'Beer-battered cod with chips and mushy peas', price: 14.99 },
          { name: 'Scampi and Chips', description: 'Whole tail scampi with chips', price: 13.99 },
          { name: 'Battered Sausage', description: 'Deep-fried sausage with chips', price: 9.99 },
          { name: 'Plaice', description: 'Flatfish in crispy batter', price: 13.99 },
          { name: 'Chicken and Chips', description: 'Beer-battered chicken with chips', price: 11.99 },
          { name: 'Veggie Fishless', description: 'Plant-based fish substitute with chips', price: 10.99, dietary: { vegetarian: true } }
        ]
      },
      // Wine Cellar
      {
        slugs: ['eatwisely-the-wine-cellar'],
        items: [
          { name: 'Duck Confit', description: 'Slow-cooked duck leg with potato gratin', price: 26.99 },
          { name: 'Beef Tournedos', description: 'Pan-seared beef with peppercorn sauce', price: 32.99 },
          { name: 'Lamb Rack', description: 'Herb-crusted rack of lamb', price: 34.99 },
          { name: 'Lobster Thermidor', description: 'Classic lobster in creamy sauce', price: 45.99 },
          { name: 'Risotto', description: 'Saffron risotto with parmesan', price: 18.99, dietary: { vegetarian: true } },
          { name: 'Grilled Turbot', description: 'Whole fish with caper butter', price: 38.99 }
        ]
      },
      // Rooftop/Grill
      {
        slugs: ['eatwisely-rooftop-grill'],
        items: [
          { name: 'T-Bone Steak', description: '16oz T-bone cooked to your preference', price: 42.99 },
          { name: 'Mixed Grill', description: 'Assortment of grilled meats for sharing', price: 38.99 },
          { name: 'Grilled Sea Bream', description: 'Whole fish with lemon and herbs', price: 26.99 },
          { name: 'Lamb Chops', description: 'New Zealand lamb chops with mint sauce', price: 29.99 },
          { name: 'Grilled Vegetable Platter', description: 'Seasonal vegetables with romesco', price: 18.99, dietary: { vegetarian: true } },
          { name: 'BBQ Pulled Pork', description: 'Slow-smoked pulled pork with coleslaw', price: 22.99 }
        ]
      }
    ],
    desserts: [
      {
        slugs: ['eatwisely-the-ivy-garden', 'eatwisely-brunch-social', 'eatwisely-steakhouse-1920'],
        items: [
          { name: 'Sticky Toffee Pudding', description: 'Warm date sponge with butterscotch sauce', price: 7.99 },
          { name: 'Chocolate Fondant', description: 'Warm chocolate cake with molten center', price: 8.99 },
          { name: 'Crème Brûlée', description: 'Classic vanilla custard with caramel crust', price: 7.50 },
          { name: 'Eton Mess', description: 'Meringue, cream, and fresh berries', price: 6.99 },
          { name: 'Cheesecake', description: 'New York style with berry compote', price: 7.50 },
          { name: 'Apple Crumble', description: 'Warm crumble with custard or ice cream', price: 6.99, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-spice-lane', 'eatwisely-thai-orchid'],
        items: [
          { name: 'Gulab Jamun', description: 'Sweet milk dumplings in rose syrup', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Kheer', description: 'Creamy rice pudding with cardamom', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Mango Kulfi', description: 'Indian ice cream with pistachios', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Rasmalai', description: 'Soft cheese in sweet saffron milk', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Mango Lassi', description: 'Thick yogurt drink with mango', price: 4.50, dietary: { vegetarian: true } },
          { name: 'Kulfi', description: 'Traditional Indian frozen dessert', price: 5.99, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-sakura-japanese'],
        items: [
          { name: 'Mochi Ice Cream', description: 'Assorted Japanese ice cream mochi', price: 7.99 },
          { name: 'Matcha Cake', description: 'Green tea flavored sponge cake', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Dorayaki', description: 'Red bean pancake sandwich', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Taiyaki', description: 'Fish-shaped waffle with red bean', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Miso Soup', description: 'Traditional miso with tofu', price: 4.99, dietary: { vegetarian: true } },
          { name: 'Yuzu Sorbet', description: 'Refreshing citrus sorbet', price: 6.50, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-tapas-revolution', 'eatwisely-mediterranean-breeze'],
        items: [
          { name: 'Churros', description: 'Fried dough with chocolate sauce', price: 6.99 },
          { name: 'Tarta de Santiago', description: 'Almond cake from Galicia', price: 7.50, dietary: { vegetarian: true } },
          { name: 'Flan', description: 'Spanish caramel custard', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Tiramisu', description: 'Coffee-flavored layered dessert', price: 7.99 },
          { name: 'Panna Cotta', description: 'Italian cream dessert with berries', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Baklava', description: 'Phyllo pastry with nuts and honey', price: 6.50, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-the-burger-joint', 'eatwisely-burger-barn'],
        items: [
          { name: 'Brownie Sundae', description: 'Warm brownie with ice cream and sauce', price: 7.99 },
          { name: 'Apple Pie', description: 'Classic apple pie with vanilla ice cream', price: 6.99 },
          { name: 'Cheesecake', description: 'Creamy New York style cheesecake', price: 7.50 },
          { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 8.99 },
          { name: 'Milkshake', description: 'Thick milkshake, choose your flavor', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Salted Caramel Pie', description: 'Chocolate caramel tart with sea salt', price: 7.99 }
        ]
      },
      {
        slugs: ['eatwisely-greek-taverna'],
        items: [
          { name: 'Loukoumades', description: 'Fried dough balls with honey and nuts', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Galaktoboureko', description: 'Custard in phyllo pastry', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Baklava', description: 'Layers of phyllo with nuts and honey', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Kataifi', description: 'Shredded phyllo with almonds', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Yogurt with Honey', description: 'Thick Greek yogurt with honey', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Rice Pudding', description: 'Creamy rice pudding with cinnamon', price: 5.99, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-seoul-kitchen'],
        items: [
          { name: 'Bingsoo', description: 'Korean shaved ice with toppings', price: 8.99 },
          { name: 'Tteok', description: 'Traditional rice cakes with sweet sauce', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Hotteok', description: 'Sweet Korean pancakes', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Gyeongju Bread', description: 'Sweet red bean filled bread', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Sundae', description: 'Korean blood sausage with glass noodles', price: 7.99 },
          { name: 'Ice Cream', description: 'Green tea or black sesame ice cream', price: 5.99, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-plant-power'],
        items: [
          { name: 'Raw Brownie', description: 'No-bake chocolate brownie', price: 6.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Acai Bowl', description: 'Blended acai with granola and fruit', price: 8.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Coconut Panna Cotta', description: 'Plant-based panna cotta', price: 6.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Fruit Sorbet', description: 'Assorted fruit sorbets', price: 5.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Banana Nice Cream', description: 'Frozen banana blended soft serve', price: 5.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Chia Pudding', description: 'Coconut chia pudding with mango', price: 6.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-pizza-paradiso'],
        items: [
          { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 7.99 },
          { name: 'Panna Cotta', description: 'Vanilla cream with berry coulis', price: 6.99, dietary: { vegetarian: true } },
          { name: 'Affogato', description: 'Vanilla ice cream with espresso', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Cannoli', description: 'Crispy shells with sweet ricotta', price: 6.50, dietary: { vegetarian: true } },
          { name: 'Gelato', description: 'Italian ice cream, choose your flavor', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Torta Caprese', description: 'Chocolate almond cake', price: 7.50, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-dim-sum-house'],
        items: [
          { name: 'Egg Tarts', description: 'Crispy Portuguese-style egg tarts', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Mango Pudding', description: 'Silky mango dessert', price: 5.50, dietary: { vegetarian: true } },
          { name: 'Sesame Balls', description: 'Deep-fried glutinous rice balls', price: 4.99, dietary: { vegetarian: true } },
          { name: 'Red Bean Soup', description: 'Sweet red bean soup', price: 4.50, dietary: { vegetarian: true } },
          { name: 'Tofu Fa', description: 'Silken tofu with ginger syrup', price: 5.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Fried Ice Cream', description: 'Ice cream wrapped in fried breadcrumbs', price: 6.99 }
        ]
      },
      {
        slugs: ['eatwisely-the-wine-cellar'],
        items: [
          { name: 'Cheese Board', description: 'Selection of fine cheeses with crackers', price: 16.99 },
          { name: 'Crème Brûlée', description: 'Classic vanilla custard', price: 9.99, dietary: { vegetarian: true } },
          { name: 'Chocolate Truffles', description: 'Assorted dark chocolate truffles', price: 8.99, dietary: { vegetarian: true } },
          { name: 'Tarte Tatin', description: 'Upside-down apple tart', price: 9.50, dietary: { vegetarian: true } },
          { name: 'Port', description: 'Glass of vintage port', price: 12.99 },
          { name: 'Salted Caramel', description: 'Caramel tart with sea salt', price: 8.99, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-rooftop-grill'],
        items: [
          { name: 'Molten Chocolate Cake', description: 'Warm chocolate with liquid center', price: 9.99 },
          { name: 'Pecan Pie', description: 'Classic Southern pecan tart', price: 8.50 },
          { name: 'New York Cheesecake', description: 'Dense creamy cheesecake', price: 8.99 },
          { name: 'Key Lime Pie', description: 'Tangy lime curd in pastry shell', price: 7.99 },
          { name: 'Fruit Tart', description: 'Fresh seasonal fruits on custard', price: 8.50, dietary: { vegetarian: true } },
          { name: 'Sorbet Trio', description: 'Three scoops of house sorbets', price: 7.50, dietary: { vegetarian: true, vegan: true } }
        ]
      }
    ],
    drinks: [
      {
        slugs: ['eatwisely-the-ivy-garden', 'eatwisely-brunch-social'],
        items: [
          { name: 'Fresh Orange Juice', description: 'Freshly squeezed, 250ml', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'English Breakfast Tea', description: 'Pot of fine English breakfast tea', price: 2.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Flat White', description: 'Double shot with steamed milk', price: 3.50, dietary: { vegetarian: true } },
          { name: 'House Wine', description: 'Glass of red, white, or rosé', price: 6.99 },
          { name: 'Craft Beer', description: 'Selection of local ales', price: 5.99 },
          { name: 'Elderflower Cordial', description: 'Refreshing non-alcoholic spritz', price: 3.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-spice-lane', 'eatwisely-thai-orchid'],
        items: [
          { name: 'Mango Lassi', description: 'Sweet yogurt mango drink', price: 4.50, dietary: { vegetarian: true } },
          { name: 'Masala Chai', description: 'Traditional spiced tea', price: 3.50, dietary: { vegetarian: true } },
          { name: 'Lassi', description: 'Classic salted yogurt drink', price: 3.99, dietary: { vegetarian: true } },
          { name: 'Kingfisher Beer', description: 'Indian pale lager', price: 4.99 },
          { name: 'Sweet Lassi', description: 'Sweetened yogurt drink', price: 3.99, dietary: { vegetarian: true } },
          { name: 'Masala Soda', description: 'Spiced carbonated drink', price: 2.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-sakura-japanese'],
        items: [
          { name: 'Sake', description: 'Hot or cold Japanese rice wine', price: 8.99 },
          { name: 'Japanese Beer', description: 'Asahi or Sapporo', price: 5.99 },
          { name: 'Green Tea', description: 'Traditional matcha or sencha', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Ramune', description: 'Japanese marble soda', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Calpico', description: 'Japanese yogurt drink', price: 3.50, dietary: { vegetarian: true } },
          { name: ' plum wine', description: 'Umeshu liqueur on the rocks', price: 7.99 }
        ]
      },
      {
        slugs: ['eatwisely-tapas-revolution', 'eatwisely-mediterranean-breeze'],
        items: [
          { name: 'Sangria', description: 'Red or white Spanish wine punch', price: 6.99 },
          { name: 'Tinto de Verano', description: 'Spanish summer red wine cooler', price: 5.99 },
          { name: 'Cava', description: 'Spanish sparkling wine', price: 7.99 },
          { name: 'Horchata', description: 'Spanish tiger nut drink', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Spanish Beer', description: 'Estrella or Mahou', price: 4.99 },
          { name: ' Agua de Valencia', description: 'Champagne and orange juice cocktail', price: 8.99 }
        ]
      },
      {
        slugs: ['eatwisely-the-burger-joint', 'eatwisely-burger-barn', 'eatwisely-steakhouse-1920'],
        items: [
          { name: 'Milkshake', description: 'Chocolate, vanilla, or strawberry', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Craft IPA', description: 'Hoppy craft Indian pale ale', price: 6.99 },
          { name: 'Root Beer Float', description: 'Draft root beer with ice cream', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Lime Rickey', description: 'Fresh lime with soda', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Americano', description: 'Espresso with hot water', price: 3.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Bourbon', description: 'Single or double bourbon', price: 7.99 }
        ]
      },
      {
        slugs: ['eatwisely-greek-taverna'],
        items: [
          { name: 'Ouzo', description: 'Greek aniseed spirit', price: 6.99 },
          { name: 'Retsina', description: 'Traditional Greek resin wine', price: 5.99 },
          { name: 'Frappé', description: 'Iced coffee frappe', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Freddo Espresso', description: 'Chilled espresso with foam', price: 4.50, dietary: { vegetarian: true } },
          { name: 'Mythos Beer', description: 'Greek lager', price: 4.99 },
          { name: 'Soumada', description: 'Almond syrup drink', price: 3.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-seoul-kitchen'],
        items: [
          { name: 'Soju', description: 'Korean distilled spirit', price: 5.99 },
          { name: 'Makgeolli', description: 'Korean rice wine', price: 6.99 },
          { name: 'Hite Beer', description: 'Korean pale lager', price: 4.99 },
          { name: 'Korean Plum Tea', description: 'Sweet Maesil cha', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Bottled Water', description: 'Still or sparkling', price: 2.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Banana Milk', description: 'Sweet Korean banana drink', price: 3.50, dietary: { vegetarian: true } }
        ]
      },
      {
        slugs: ['eatwisely-plant-power'],
        items: [
          { name: 'Green Smoothie', description: 'Kale, banana, and spinach', price: 6.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Oat Milk Latte', description: 'Espresso with oat milk', price: 4.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Kombucha', description: 'Fermented tea drink', price: 4.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Cold Pressed Juice', description: 'Fresh pressed vegetable juice', price: 5.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Coconut Water', description: 'Fresh young coconut water', price: 4.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Hemp Milk Latte', description: 'Espresso with hemp milk', price: 4.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-pizza-paradiso'],
        items: [
          { name: 'Limoncello', description: 'Italian lemon liqueur', price: 6.99 },
          { name: 'Aperol Spritz', description: 'Aperol with prosecco and soda', price: 7.99 },
          { name: 'Italian Soda', description: 'Fruit-flavored soda', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Cappuccino', description: 'Classic Italian coffee', price: 3.50, dietary: { vegetarian: true } },
          { name: 'San Pellegrino', description: 'Italian sparkling water', price: 3.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Grappa', description: 'Italian grape spirit', price: 5.99 }
        ]
      },
      {
        slugs: ['eatwisely-dim-sum-house'],
        items: [
          { name: 'Chrysanthemum Tea', description: 'Traditional herbal tea', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Hong Kong Milk Tea', description: 'Strong tea with evaporated milk', price: 4.50, dietary: { vegetarian: true } },
          { name: 'Tiger Bubble Tea', description: 'Milk tea with tapioca pearls', price: 5.99, dietary: { vegetarian: true } },
          { name: 'Jasmine Tea', description: 'Fragrant flower tea', price: 3.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Soy Milk', description: 'Warm or cold soy milk', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Chinese Beer', description: 'Tsingtao or Harbin', price: 4.99 }
        ]
      },
      {
        slugs: ['eatwisely-the-wine-cellar'],
        items: [
          { name: 'Fine Wine by Glass', description: 'Selection of premium wines', price: 12.99 },
          { name: 'Champagne', description: 'Glass of vintage champagne', price: 15.99 },
          { name: 'Port', description: 'Vintage port, 50ml', price: 9.99 },
          { name: 'Sherry', description: 'Fino or Oloroso sherry', price: 6.99 },
          { name: 'Still Water', description: 'Premium mineral water', price: 4.50, dietary: { vegetarian: true, vegan: true } },
          { name: 'Espresso', description: 'Double shot Italian espresso', price: 3.99, dietary: { vegetarian: true, vegan: true } }
        ]
      },
      {
        slugs: ['eatwisely-rooftop-grill'],
        items: [
          { name: 'Cocktail', description: 'Signature rooftop cocktail', price: 12.99 },
          { name: 'Rose Wine', description: 'Glass of Provence rose', price: 9.99 },
          { name: 'Gin and Tonic', description: 'Premium gin with tonic', price: 9.99 },
          { name: 'Craft Lemonade', description: 'House-made lemonade', price: 4.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Iced Tea', description: 'Fresh brewed, sweetened or unsweetened', price: 3.99, dietary: { vegetarian: true, vegan: true } },
          { name: 'Sparkling Water', description: 'Premium sparkling mineral water', price: 4.50, dietary: { vegetarian: true, vegan: true } }
        ]
      }
    ]
  };

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
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
    ]
  };

  let totalItems = 0;

  for (const restaurant of restaurants) {
    console.log(`Processing: ${restaurant.name}`);

    const categories = await db.collection('categories')
      .find({ restaurantId: restaurant._id, isGeneric: false, status: 'published' })
      .toArray();

    for (const category of categories) {
      const menu = await db.collection('menus').findOne({
        restaurantId: restaurant._id,
        categoryId: category._id
      });

      const categoryKey = category.slug.includes('starters') ? 'starters' :
        category.slug.includes('main-courses') ? 'mains' :
          category.slug.includes('desserts') ? 'desserts' :
            category.slug.includes('drinks') ? 'drinks' : null;

      if (!categoryKey) continue;

      const itemsToUse = getItemsForRestaurant(menuTemplates[categoryKey], restaurant.slug);
      const images = unsplashImages[categoryKey];

      const menuItemsData = itemsToUse.map((item, index) => ({
        name: item.name,
        description: item.description,
        image: images[index] || null,
        price: item.price,
        dietary: item.dietary || { vegetarian: false, vegan: false },
        ingredients: [],
        allergens: item.allergens || detectAllergens(item.name, item.description),
        nutrition: generateNutrition(item.name, categoryKey),
        upsells: getUpsells(item.name, categoryKey),
        isMeal: categoryKey === 'mains',
        isAvailable: true,
        order: index + 1,
        isActive: true
      }));

      if (menu) {
        // Preserve existing items, and update them with nutrition/allergens if missing
        const existingItems = menu.items.filter(i => i.isActive);
        let updatedCount = 0;

        const updatedItems = existingItems.map((item) => {
          const needsUpdate = !item.nutrition || Object.keys(item.nutrition).length === 0;
          if (needsUpdate) {
            item.nutrition = generateNutrition(item.name, categoryKey);
            item.allergens = item.allergens || detectAllergens(item.name, item.description || '');
            updatedCount++;
          }
          return item;
        });

        const existingNames = new Set(existingItems.map(i => i.name));
        const newItems = menuItemsData.filter(i => !existingNames.has(i.name));

        const allItems = [...updatedItems, ...newItems];

        await db.collection('menus').updateOne(
          { _id: menu._id },
          { $set: { items: allItems } }
        );

        if (updatedCount > 0 || newItems.length > 0) {
          console.log(`  - Updated ${category.name}: ${updatedCount} items enriched, ${newItems.length} new items added`);
        } else {
          console.log(`  - Preserved ${category.name}: ${existingItems.length} items`);
        }
        totalItems += menuItemsData.length;
      } else {
        await db.collection('menus').insertOne({
          restaurantId: restaurant._id,
          categoryId: category._id,
          items: menuItemsData,
          isActive: true,
          status: 'published'
        });
        console.log(`  - Created ${category.name}: ${menuItemsData.length} items`);
        totalItems += menuItemsData.length;
      }
    }
  }

  console.log('\n=== Seed Complete ===');
  console.log(`Total menu items: ${totalItems}`);
};

// Allergen detection based on keywords
const allergenKeywords = {
  milk: ['milk', 'milkshake', 'cheese', 'cream', 'butter', 'yogurt', 'ice cream', 'latte', 'cappuccino', 'mocha', 'milkshake', 'milkshakes', 'brie', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'gouda', 'quesadilla', 'queso', 'alfredo', 'bechamel'],
  egg: ['egg', 'mayonnaise', 'aioli', 'meringue', 'custard', 'carbonara', 'omelette'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'bass', 'trout', 'mackerel', 'sardine', 'anchovy', 'anchovies'],
  crustaceans: ['shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'scallop', 'king prawn', 'scampi'],
  molluscs: ['mussel', 'mussels', 'oyster', 'oysters', 'clam', 'clams', 'squid', 'calamari', 'octopus'],
  peanut: ['peanut', 'peanuts', 'satay', 'pad thai'],
  tree_nuts: ['almond', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan', 'macadamia', 'praline', 'marzipan', 'pesto'],
  sesame: ['sesame', 'tahini', 'hummus', 'falafel', 'brioche'],
  soya: ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso'],
  celery: ['celery'],
  mustard: ['mustard', 'dijon'],
  sulphites: ['wine', 'beer', 'vinegar', 'bourbon', 'whisky'],
  gluten: ['bread', 'pasta', 'noodle', 'wheat', 'flour', 'crouton', 'croutons', 'pizza', 'burger', 'sandwich', 'wrap', 'tortilla', 'battered', 'croissant', 'dumpling', 'wonton', 'spring roll', 'filo', 'pasty', 'pie', 'pastry', 'bap', 'roll']
};

function detectAllergens(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();
  const detected = [];

  for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      detected.push(allergen);
    }
  }

  return detected;
}

function getItemsForRestaurant(templates, restaurantSlug) {
  for (const template of templates) {
    if (template.slugs.includes(restaurantSlug)) {
      return template.items;
    }
  }
  return templates[0].items;
}

function generateNutrition(itemName, categoryKey) {
  const name = itemName.toLowerCase();
  const category = categoryKey;

  // Generate realistic nutrition based on item type
  let baseCalories = 200;
  let baseFat = 10;
  let baseSaturates = 3;
  let baseSugar = 5;
  let baseSalt = 0.5;

  if (category === 'starters' || category === 'mains') {
    if (name.includes('salad')) { baseCalories = 150; baseFat = 8; baseSaturates = 1; baseSugar = 3; baseSalt = 0.3; }
    else if (name.includes('burger') || name.includes('fries')) { baseCalories = 650; baseFat = 35; baseSaturates = 12; baseSugar = 6; baseSalt = 1.2; }
    else if (name.includes('steak') || name.includes('beef')) { baseCalories = 450; baseFat = 28; baseSaturates = 10; baseSugar = 2; baseSalt = 0.8; }
    else if (name.includes('chicken')) { baseCalories = 350; baseFat = 15; baseSaturates = 4; baseSugar = 2; baseSalt = 0.6; }
    else if (name.includes('fish') || name.includes('salmon') || name.includes('cod')) { baseCalories = 280; baseFat = 12; baseSaturates = 2; baseSugar = 1; baseSalt = 0.5; }
    else if (name.includes('pasta') || name.includes('risotto')) { baseCalories = 480; baseFat = 18; baseSaturates = 6; baseSugar = 4; baseSalt = 0.9; }
    else if (name.includes('pizza')) { baseCalories = 320; baseFat = 12; baseSaturates = 5; baseSugar = 3; baseSalt = 0.7; }
    else if (name.includes('soup')) { baseCalories = 180; baseFat = 8; baseSaturates = 2; baseSugar = 4; baseSalt = 0.8; }
    else if (name.includes('sandwich') || name.includes('wrap')) { baseCalories = 420; baseFat = 20; baseSaturates = 7; baseSugar = 5; baseSalt = 1.0; }
    else { baseCalories = 380; baseFat = 16; baseSaturates = 5; baseSugar = 3; baseSalt = 0.7; }
  } else if (category === 'desserts') {
    if (name.includes('cake') || name.includes('cheesecake')) { baseCalories = 450; baseFat = 25; baseSaturates = 12; baseSugar = 35; baseSalt = 0.3; }
    else if (name.includes('ice cream') || name.includes('gelato')) { baseCalories = 280; baseFat = 15; baseSaturates = 9; baseSugar = 22; baseSalt = 0.1; }
    else if (name.includes('tiramisu')) { baseCalories = 380; baseFat = 20; baseSaturates = 10; baseSugar = 28; baseSalt = 0.2; }
    else if (name.includes('crumble') || name.includes('pie')) { baseCalories = 320; baseFat = 14; baseSaturates = 6; baseSugar = 24; baseSalt = 0.2; }
    else { baseCalories = 300; baseFat = 12; baseSaturates = 5; baseSugar = 20; baseSalt = 0.2; }
  } else if (category === 'drinks') {
    if (name.includes('wine')) { baseCalories = 125; baseFat = 0; baseSaturates = 0; baseSugar = 4; baseSalt = 0; }
    else if (name.includes('beer') || name.includes('ale')) { baseCalories = 180; baseFat = 0; baseSaturates = 0; baseSugar = 3; baseSalt = 0; }
    else if (name.includes('coffee')) { baseCalories = 5; baseFat = 0; baseSaturates = 0; baseSugar = 0; baseSalt = 0; }
    else if (name.includes('juice') || name.includes('smoothie')) { baseCalories = 120; baseFat = 1; baseSaturates = 0; baseSugar = 22; baseSalt = 0; }
    else if (name.includes('tea')) { baseCalories = 0; baseFat = 0; baseSaturates = 0; baseSugar = 0; baseSalt = 0; }
    else { baseCalories = 80; baseFat = 1; baseSaturates = 0; baseSugar = 15; baseSalt = 0; }
  }

  const getLevel = (val, type) => {
    if (type === 'calories') return val < 200 ? 'green' : val < 400 ? 'amber' : 'red';
    if (type === 'fat') return val < 5 ? 'green' : val < 10 ? 'amber' : 'red';
    if (type === 'saturates') return val < 2 ? 'green' : val < 5 ? 'amber' : 'red';
    if (type === 'sugar') return val < 6 ? 'green' : val < 15 ? 'amber' : 'red';
    if (type === 'salt') return val < 0.5 ? 'green' : val < 1.5 ? 'amber' : 'red';
    return 'green';
  };

  return {
    calories: { value: Math.round(baseCalories + (Math.random() * 40 - 20)), level: getLevel(baseCalories, 'calories') },
    fat: { value: parseFloat((baseFat + (Math.random() * 4 - 2)).toFixed(1)), level: getLevel(baseFat, 'fat') },
    saturates: { value: parseFloat((baseSaturates + (Math.random() * 2 - 1)).toFixed(1)), level: getLevel(baseSaturates, 'saturates') },
    sugar: { value: Math.round(baseSugar + (Math.random() * 4 - 2)), level: getLevel(baseSugar, 'sugar') },
    salt: { value: parseFloat((baseSalt + (Math.random() * 0.2 - 0.1)).toFixed(2)), level: getLevel(baseSalt, 'salt') }
  };
}

function getUpsells(itemName, categoryKey) {
  if (categoryKey === 'drinks') {
    if (itemName.toLowerCase().includes('wine')) {
      return [
        { label: 'Small Glass', price: 0 },
        { label: 'Large Glass', price: 4.00 },
        { label: 'Bottle', price: 24.00 }
      ];
    }
    if (itemName.toLowerCase().includes('coffee') || itemName.toLowerCase().includes('espresso') || itemName.toLowerCase().includes('latte') || itemName.toLowerCase().includes('cappuccino')) {
      return [
        { label: 'Oat Milk', price: 0.70 },
        { label: 'Extra Shot', price: 0.80 }
      ];
    }
    if (itemName.toLowerCase().includes('beer')) {
      return [
        { label: 'Half Pint', price: 0 },
        { label: 'Pint', price: 2.00 }
      ];
    }
  }
  if (categoryKey === 'mains') {
    if (itemName.toLowerCase().includes('burger') || itemName.toLowerCase().includes('fries')) {
      return [
        { label: 'Regular Fries', price: 0 },
        { label: 'Sweet Potato Fries', price: 1.50 },
        { label: 'Side Salad', price: 2.50 }
      ];
    }
    if (itemName.toLowerCase().includes('steak')) {
      return [
        { label: 'Medium Rare', price: 0 },
        { label: 'Medium', price: 0 },
        { label: 'Well Done', price: 0 },
        { label: 'Peppercorn Sauce', price: 2.00 }
      ];
    }
    if (itemName.toLowerCase().includes('curry') || itemName.toLowerCase().includes('biryani')) {
      return [
        { label: 'With Rice', price: 0 },
        { label: 'With Naan', price: 2.00 },
        { label: 'Extra Portion', price: 4.00 }
      ];
    }
  }
  return [];
}
