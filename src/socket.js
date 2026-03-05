const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "1234567",
  key: process.env.PUSHER_KEY || "dummy-key",
  secret: process.env.PUSHER_SECRET || "dummy-secret",
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

module.exports = pusher;
