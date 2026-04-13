/* eslint-disable no-console */
/**
 * Sample Seed: Create test users
 */

import bcrypt from 'bcryptjs';

export const run = async (db) => {
  console.log('Creating test users...');

  const passwordHash = await bcrypt.hash('Test@123', 10);

  const users = [
    {
      userName: 'superadmin',
      email: 'superadmin@test.com',
      password: passwordHash,
      role: 'superAdmin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const user of users) {
    await db.collection('users').updateOne(
      { userName: user.userName },
      { $setOnInsert: user },
      { upsert: true }
    );
  }

  console.log(`✅ Processed ${users.length} test users`);
};
