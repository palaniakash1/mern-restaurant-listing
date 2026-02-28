/**
 * Sample Seed: Create Test Users
 * 
 * This seed creates sample users for testing
 * 
 * To run: npm run seed
 */

import bcrypt from "bcryptjs";

export const run = async (db) => {
  console.log("Creating sample users...");
  
  const passwordHash = await bcrypt.hash("Test@123", 10);
  
  const users = [
    {
      userName: "superadmin",
      email: "superadmin@test.com",
      password: passwordHash,
      role: "superAdmin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userName: "testadmin",
      email: "admin@test.com",
      password: passwordHash,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userName: "testuser",
      email: "user@test.com",
      password: passwordHash,
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  // Insert users (use insertMany for better performance)
  await db.collection("users").insertMany(users, { ordered: false });
  
  console.log(`✅ Created ${users.length} sample users`);
  console.log("   - superadmin@test.com (superAdmin)");
  console.log("   - admin@test.com (admin)");
  console.log("   - user@test.com (user)");
  console.log("   Password for all: Test@123");
};

export const meta = {
  description: "Create sample test users",
  author: "DevTeam",
  safe: true, // Can be run multiple times
};
