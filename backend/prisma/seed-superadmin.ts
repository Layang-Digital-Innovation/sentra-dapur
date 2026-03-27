import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Use environment variables or default values
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@sentradapur.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SentraDapur2026';

  console.log(`🌱 Seeding Super Admin...`);
  console.log(`Email: ${email}`);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert the super admin
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
    create: {
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      fullname: 'Super Admin',
    },
  });

  console.log(`✅ Super Admin seeded successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Super Admin seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
