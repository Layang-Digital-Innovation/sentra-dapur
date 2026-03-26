import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password for all test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create SUPER_ADMIN user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  // Create ADMIN user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Create INVESTOR user
  const investor = await prisma.user.upsert({
    where: { email: 'investor@example.com' },
    update: {},
    create: {
      email: 'investor@example.com',
      password: hashedPassword,
      role: Role.INVESTOR,
    },
  });

  // Create PROJECT_OWNER user
  const projectOwner = await prisma.user.upsert({
    where: { email: 'projectowner@example.com' },
    update: {},
    create: {
      email: 'projectowner@example.com',
      password: hashedPassword,
      role: Role.PROJECT_OWNER,
    },
  });

  // Create ADMIN_PUSAT user
  const adminPusat = await prisma.user.upsert({
    where: { email: 'adminpusat@example.com' },
    update: {},
    create: {
      email: 'adminpusat@example.com',
      password: hashedPassword,
      role: Role.ADMIN_PUSAT,
    },
  });

  // Create ADMIN_DAPUR user
  const adminDapur = await prisma.user.upsert({
    where: { email: 'admindapur@example.com' },
    update: {},
    create: {
      email: 'admindapur@example.com',
      password: hashedPassword,
      role: Role.ADMIN_DAPUR,
    },
  });

  console.log('✅ Seeding completed!');
  console.log('Test users created:');
  console.log('- SUPER_ADMIN: superadmin@example.com / password123');
  console.log('- ADMIN: admin@example.com / password123');
  console.log('- INVESTOR: investor@example.com / password123');
  console.log('- PROJECT_OWNER: projectowner@example.com / password123');
  console.log('- ADMIN_PUSAT: adminpusat@example.com / password123');
  console.log('- ADMIN_DAPUR: admindapur@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });