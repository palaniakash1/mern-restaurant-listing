/**
 * Sample Seed: Create test users
 */

import bcrypt from "bcryptjs";

export const run = async (db) => {
  console.log("Creating test users...");
  
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
  ];
  
  await db.collection("users").insertMany(users);
  
  console.log(`✅ Created ${users.length} test users`);
};
