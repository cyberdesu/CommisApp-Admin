import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { requireDatabaseUrl } from '../src/lib/env/database-url';

dotenv.config();

async function ensureAdminSchema(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id" SERIAL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "admin_sessions" (
      "id" TEXT PRIMARY KEY,
      "adminId" INTEGER NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "admin_sessions_adminId_fkey"
        FOREIGN KEY ("adminId")
        REFERENCES "admin_users"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "admin_sessions_adminId_idx"
    ON "admin_sessions"("adminId");
  `);
}

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
    await ensureAdminSchema(prisma);

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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        console.error('Error: Admin with this email already exists.');
        return;
      }

      if (error.code === 'P2021') {
        console.error('Error: Required admin table is still missing in the target DB.');
        console.error('Try running: APP_ENV=dev pnpm prisma db push');
        return;
      }
    }

    if (
      error instanceof Prisma.PrismaClientInitializationError &&
      error.errorCode === 'P1001'
    ) {
      console.error('Error: Database is unreachable. Make sure Postgres is running.');
      return;
    }

    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
