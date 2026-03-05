"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Init DB
async function initDB() {
    const settingsCount = await prisma.labSettings.count();
    if (settingsCount === 0) {
        await prisma.labSettings.create({
            data: { isManuallyClosed: false, openTime: "08:00", closeTime: "17:00" },
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
}
// Ensure startup
initDB().catch(console.error);
// Background job to process expirations (matches frontend behavior)
setInterval(async () => {
    const printers = await prisma.printer.findMany();
    const now = new Date();
    const BUFFER_MINUTES = 5;
    for (const printer of printers) {
        if (printer.status === "in-use" && printer.endTime) {
            const end = new Date(printer.endTime);
            if (now >= end) {
                const currentUser = printer.currentUser;
                if (currentUser && Object.keys(currentUser).length > 0) {
                    await prisma.usageLog.create({
                        data: {
                            printerId: printer.id,
                            printerName: printer.name,
                            userName: currentUser.name || "Unknown",
                            studentId: currentUser.studentId || "Unknown",
                            usageTime: currentUser.durationInMinutes || 0,
                            startTime: new Date(Date.now() - (currentUser.durationInMinutes || 0) * 60000),
                            endTime: now,
                            photoUrl: currentUser.photoUrl,
                            statusAtEnd: "completed",
                        },
                    });
                }
                const bufferEndTime = new Date(now.getTime() + BUFFER_MINUTES * 60000).toISOString();
                await prisma.printer.update({
                    where: { id: printer.id },
                    data: { status: "buffer", endTime: null, bufferEndTime },
                });
            }
        }
        if (printer.status === "buffer" && printer.bufferEndTime) {
            const bufferEnd = new Date(printer.bufferEndTime);
            if (now >= bufferEnd) {
                const nextRes = printer.nextReservation;
                if (nextRes && Object.keys(nextRes).length > 0) {
                    const sessionEnd = new Date(now.getTime() + (nextRes.durationInMinutes || 0) * 60000).toISOString();
                    await prisma.printer.update({
                        where: { id: printer.id },
                        data: {
                            status: "in-use",
                            currentUser: nextRes,
                            nextReservation: client_1.Prisma.JsonNull,
                            endTime: sessionEnd,
                            bufferEndTime: null,
                        },
                    });
                }
                else {
                    await prisma.printer.update({
                        where: { id: printer.id },
                        data: {
                            status: "available",
                            bufferEndTime: null,
                            currentUser: client_1.Prisma.JsonNull,
                        },
                    });
                }
            }
        }
    }
}, 5000); // Check every 5s
// REST APIs
app.get("/api/printers", async (req, res) => {
    const printers = await prisma.printer.findMany();
    res.json(printers);
});
app.post("/api/printers", async (req, res) => {
    const { name, model } = req.body;
    const printer = await prisma.printer.create({
        data: { name, model, status: "available" },
    });
    res.json(printer);
});
app.delete("/api/printers/:id", async (req, res) => {
    await prisma.printer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
app.post("/api/printers/:id/reserve", async (req, res) => {
    const { id } = req.params;
    const reservation = req.body;
    const endTime = new Date(Date.now() + reservation.durationInMinutes * 60000).toISOString();
    const updated = await prisma.printer.update({
        where: { id },
        data: {
            status: "in-use",
            endTime,
            currentUser: reservation,
        },
    });
    res.json(updated);
});
app.post("/api/printers/:id/queue", async (req, res) => {
    const { id } = req.params;
    const reservation = req.body;
    const updated = await prisma.printer.update({
        where: { id },
        data: { nextReservation: reservation },
    });
    res.json(updated);
});
app.post("/api/printers/:id/force-stop", async (req, res) => {
    const { id } = req.params;
    const { password, reason } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
    const printer = await prisma.printer.findUnique({ where: { id } });
    if (!printer) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const currentUser = printer.currentUser;
    const isAdmin = password === ADMIN_PASSWORD;
    const isUser = currentUser?.sessionPassword === password;
    if (isAdmin || isUser) {
        if (currentUser && Object.keys(currentUser).length > 0) {
            await prisma.usageLog.create({
                data: {
                    printerId: printer.id,
                    printerName: printer.name,
                    userName: currentUser.name || "Unknown",
                    studentId: currentUser.studentId || "Unknown",
                    usageTime: currentUser.durationInMinutes || 0,
                    startTime: new Date(Date.now() - (currentUser.durationInMinutes || 0) * 60000),
                    endTime: new Date(),
                    photoUrl: currentUser.photoUrl,
                    stopReason: reason,
                    statusAtEnd: "force-stopped",
                },
            });
        }
        const BUFFER_MINUTES = 5;
        const bufferEndTime = new Date(Date.now() + BUFFER_MINUTES * 60000).toISOString();
        const updated = await prisma.printer.update({
            where: { id },
            data: {
                status: "buffer",
                endTime: null,
                currentUser: client_1.Prisma.JsonNull,
                bufferEndTime,
            },
        });
        res.json({ success: true, updated });
    }
    else {
        res.status(401).json({ success: false, error: "Unauthorized" });
    }
});
app.post("/api/printers/:id/report-broken", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const printer = await prisma.printer.findUnique({ where: { id } });
    if (!printer) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const currentUser = printer.currentUser;
    if (currentUser && Object.keys(currentUser).length > 0) {
        await prisma.usageLog.create({
            data: {
                printerId: printer.id,
                printerName: printer.name,
                userName: currentUser.name || "Unknown",
                studentId: currentUser.studentId || "Unknown",
                usageTime: currentUser.durationInMinutes || 0,
                startTime: new Date(Date.now() - (currentUser.durationInMinutes || 0) * 60000),
                endTime: new Date(),
                photoUrl: currentUser.photoUrl,
                stopReason: reason,
                statusAtEnd: "broken",
            },
        });
    }
    const updated = await prisma.printer.update({
        where: { id },
        data: {
            status: "broken",
            brokenReason: reason,
            endTime: null,
            bufferEndTime: null,
            currentUser: client_1.Prisma.JsonNull,
            nextReservation: client_1.Prisma.JsonNull,
        },
    });
    res.json({ success: true, updated });
});
app.post("/api/printers/:id/reset", async (req, res) => {
    const { id } = req.params;
    const updated = await prisma.printer.update({
        where: { id },
        data: {
            status: "available",
            brokenReason: null,
            endTime: null,
            bufferEndTime: null,
            currentUser: client_1.Prisma.JsonNull,
            nextReservation: client_1.Prisma.JsonNull,
        },
    });
    res.json({ success: true, updated });
});
app.get("/api/logs", async (req, res) => {
    const logs = await prisma.usageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100, // Limit for safety
    });
    res.json(logs);
});
app.get("/api/settings", async (req, res) => {
    const settings = await prisma.labSettings.findFirst();
    res.json(settings);
});
app.patch("/api/settings", async (req, res) => {
    const settings = await prisma.labSettings.findFirst();
    if (settings) {
        const updated = await prisma.labSettings.update({
            where: { id: settings.id },
            data: req.body,
        });
        res.json(updated);
    }
    else {
        res.status(404).json({ error: "No settings found" });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
