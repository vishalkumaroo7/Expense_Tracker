const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];//Extracts the Authorization header from the request.

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: "Token is required" });
  }
 
  const token = authHeader.split(' ')[1]; // Extract token after "Bearer "
 //The first part ([0]) is the string "Bearer".
 //          The second part ([1]) is the actual token.                
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Attach user information to the request object
    req.user = { 
      id: decoded.id, 
      premium: decoded.premium || false // Add premium status if it exists
    };

    next();
  });
};
