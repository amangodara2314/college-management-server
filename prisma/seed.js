// const { PrismaClient } = require("@prisma/client/extension");
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

// const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
    },
  });

  console.log("✅ Admin user created:");
  console.log("   Email:", admin.email);
  console.log("   Password: admin1234");
  console.log("   (Please change this password after first login)\n");

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
