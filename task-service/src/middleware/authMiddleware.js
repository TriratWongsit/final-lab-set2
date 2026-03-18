const { verifyToken } = require('./jwtUtils');

// re-export เพื่อให้ routes ใช้งานง่ายขึ้น
module.exports = verifyToken;
