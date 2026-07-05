const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    req.role = decoded.role;
    req.dept = decoded.dept;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
