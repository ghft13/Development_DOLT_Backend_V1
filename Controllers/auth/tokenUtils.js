

const jwt = require("jsonwebtoken");

const generateTokens = (id, role) => {

  const token = jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "1h", // Short-lived
  });

  const refreshToken = jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // Long-lived
  });

  return { token, refreshToken };
};

module.exports = { generateTokens };
