const prisma = require("../config/db");

exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.labSettings.findFirst();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await prisma.labSettings.findFirst();
    if (settings) {
      const updated = await prisma.labSettings.update({
        where: { id: settings.id },
        data: req.body,
      });
      res.json(updated);
    } else {
      res.status(404).json({ error: "No settings found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
