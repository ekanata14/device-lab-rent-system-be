const express = require("express");
const router = express.Router();
const printerController = require("../controllers/printerController");

router.get("/", printerController.getPrinters);
router.post("/", printerController.addPrinter);
router.delete("/:id", printerController.deletePrinter);

const upload = require("../config/multer");

router.post(
  "/:id/reserve",
  upload.single("photo"),
  printerController.reservePrinter,
);
router.post(
  "/:id/queue",
  upload.single("photo"),
  printerController.queueReservation,
);
router.post("/:id/force-stop", printerController.forceStop);
router.post("/:id/report-broken", printerController.reportBroken);
router.post("/:id/reset", printerController.resetPrinter);

module.exports = router;
