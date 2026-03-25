import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { requireDatabaseUrl } from '../src/lib/env/database-url';

dotenv.config();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin';

  if (!email || !password) {
    console.error('Usage: pnpm create-admin <email> <password> [name]');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl("create-admin script") });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
      },
    });

    console.log(`Admin created: ${admin.email}`);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.error('Error: Admin with this email already exists.');
    } else {
      console.error('Error creating admin:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
