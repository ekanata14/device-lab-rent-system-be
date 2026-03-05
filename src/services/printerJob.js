const prisma = require("../config/db");
const pusher = require("../socket");

exports.startPrinterJob = () => {
  setInterval(async () => {
    try {
      const printers = await prisma.printer.findMany();
      const now = new Date();
      const BUFFER_MINUTES = 5;
      let hasChanges = false;

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
                  startTime: new Date(
                    Date.now() - (currentUser.durationInMinutes || 0) * 60000,
                  ),
                  endTime: now,
                  photoUrl: currentUser.photoUrl,
                  statusAtEnd: "completed",
                },
              });
            }
            const bufferEndTime = new Date(
              now.getTime() + BUFFER_MINUTES * 60000,
            ).toISOString();
            await prisma.printer.update({
              where: { id: printer.id },
              data: { status: "buffer", endTime: null, bufferEndTime },
            });
            hasChanges = true;
          }
        }

        if (printer.status === "buffer" && printer.bufferEndTime) {
          const bufferEnd = new Date(printer.bufferEndTime);
          if (now >= bufferEnd) {
            const nextRes = printer.nextReservation;
            if (nextRes && Object.keys(nextRes).length > 0) {
              const sessionEnd = new Date(
                now.getTime() + (nextRes.durationInMinutes || 0) * 60000,
              ).toISOString();
              await prisma.printer.update({
                where: { id: printer.id },
                data: {
                  status: "in-use",
                  currentUser: nextRes,
                  nextReservation: null,
                  endTime: sessionEnd,
                  bufferEndTime: null,
                },
              });
              hasChanges = true;
            } else {
              await prisma.printer.update({
                where: { id: printer.id },
                data: {
                  status: "available",
                  bufferEndTime: null,
                  currentUser: null,
                },
              });
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges) {
        pusher
          .trigger("lab-channel", "printers_updated", {})
          .catch((e) => console.error("Pusher error:", e.message));
      }
    } catch (error) {
      console.error("Error in printer job:", error);
    }
  }, 5000); // Check every 5s
};
