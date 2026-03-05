const prisma = require("../config/db");

exports.getLogs = async (req, res) => {
  try {
    const logs = await prisma.usageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
