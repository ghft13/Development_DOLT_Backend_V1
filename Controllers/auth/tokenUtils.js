const jwt = require("jsonwebtoken");

const generateTokens = (id, role) => {
  const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { token, refreshToken };
};

const verifyToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded;
};

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  return decoded;
};

module.exports = { generateTokens, verifyToken, verifyRefreshToken };
