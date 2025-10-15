import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify token middleware
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("req.headers.authorization--->>>>", req.headers.authorization);
    
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // return res.status(401).json({ message: 'Authentication required' });
      return res.redirect('/admin/login/secret');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists and is active
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      // Attach user to request
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only' });
  }
}; 