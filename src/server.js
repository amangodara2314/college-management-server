const app = require("./app");
const prisma = require("./config/prisma");

const PORT = process.env.PORT || 5000;

// Test database connection
async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await testDbConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  });
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("⏹️  SIGTERM received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("⏹️  SIGINT received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
