const prisma = require("../config/db");
const pusher = require("../socket");

const emitUpdate = () => {
  pusher
    .trigger("lab-channel", "printers_updated", {})
    .catch((e) => console.error("Pusher error:", e.message));
};

exports.getPrinters = async (req, res) => {
  try {
    const printers = await prisma.printer.findMany();
    res.json(printers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addPrinter = async (req, res) => {
  try {
    const { name, model } = req.body;
    const printer = await prisma.printer.create({
      data: { name, model, status: "available" },
    });
    emitUpdate();
    res.json(printer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePrinter = async (req, res) => {
  try {
    await prisma.printer.delete({ where: { id: req.params.id } });
    emitUpdate();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reservePrinter = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = req.body;

    if (req.file) {
      reservation.photoUrl = `/uploads/${req.file.filename}`;
    }

    const endTime = new Date(
      Date.now() + reservation.durationInMinutes * 60000,
    ).toISOString();

    const updated = await prisma.printer.update({
      where: { id },
      data: {
        status: "in-use",
        endTime,
        currentUser: reservation,
      },
    });
    emitUpdate();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.queueReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = req.body;

    if (req.file) {
      reservation.photoUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.printer.update({
      where: { id },
      data: { nextReservation: reservation },
    });
    emitUpdate();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.forceStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, reason } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

    const printer = await prisma.printer.findUnique({ where: { id } });
    if (!printer) return res.status(404).json({ error: "Not found" });

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
            startTime: new Date(
              Date.now() - (currentUser.durationInMinutes || 0) * 60000,
            ),
            endTime: new Date(),
            photoUrl: currentUser.photoUrl,
            stopReason: reason,
            statusAtEnd: "force-stopped",
          },
        });
      }

      const BUFFER_MINUTES = 5;
      const bufferEndTime = new Date(
        Date.now() + BUFFER_MINUTES * 60000,
      ).toISOString();

      const updated = await prisma.printer.update({
        where: { id },
        data: {
          status: "available",
          endTime: null,
          currentUser: null,
          bufferEndTime: null,
        },
      });
      emitUpdate();
      res.json({ success: true, updated });
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reportBroken = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const printer = await prisma.printer.findUnique({ where: { id } });
    if (!printer) return res.status(404).json({ error: "Not found" });

    const currentUser = printer.currentUser;
    if (currentUser && Object.keys(currentUser).length > 0) {
      await prisma.usageLog.create({
        data: {
          printerId: printer.id,
          printerName: printer.name,
          userName: currentUser.name || "Unknown",
          studentId: currentUser.studentId || "Unknown",
          usageTime: currentUser.durationInMinutes || 0,
          startTime: new Date(
            Date.now() - (currentUser.durationInMinutes || 0) * 60000,
          ),
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
        currentUser: null,
        nextReservation: null,
      },
    });
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetPrinter = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.printer.update({
      where: { id },
      data: {
        status: "available",
        brokenReason: null,
        endTime: null,
        bufferEndTime: null,
        currentUser: null,
        nextReservation: null,
      },
    });
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
