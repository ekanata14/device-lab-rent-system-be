require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { execSync } = require("child_process");
const prisma = require("./config/db");
const socketConfig = require("./socket");

// Controllers/Routers
const printerRoutes = require("./routes/printerRoutes");
const logRoutes = require("./routes/logRoutes");
const settingRoutes = require("./routes/settingRoutes");

// Services
const { startPrinterJob } = require("./services/printerJob");

const app = express();
const server = http.createServer(app);
const io = socketConfig.init(server);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Main init logic
async function bootstrap() {
  console.log("Running database migrations...");
  try {
    // Automatically applies Prisma migrations to create db/tables if empty
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("Migrations deployed successfully.");
  } catch (e) {
    console.error("Failed to run migrations", e);
  }

  // Seed checking
  try {
    const settingsCount = await prisma.labSettings.count();
    if (settingsCount === 0) {
      await prisma.labSettings.create({
        data: {
          isManuallyClosed: false,
          openTime: "08:00",
          closeTime: "17:00",
        },
      });
    }

    const printersCount = await prisma.printer.count();
    if (printersCount === 0) {
      const defaultPrinters = [
        ...Array.from({ length: 10 }).map((_, i) => ({
          name: `Ender-${(i + 1).toString().padStart(2, "0")}`,
          model: "Creality Ender 3 V3",
          status: "available",
        })),
        { name: "Halot-01", model: "Creality Halot Sky", status: "available" },
      ];
      await prisma.printer.createMany({ data: defaultPrinters });
    }
  } catch (e) {
    console.error("Failed to seed DB", e);
  }

  // Routes
  app.use("/api/printers", printerRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/settings", settingRoutes);

  // Start background job
  startPrinterJob();

  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
