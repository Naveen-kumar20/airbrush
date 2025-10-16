import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify token middleware
export const verifyToken = async (req, res, next) => {
  try {
    let token = null;
    
    // Check Authorization header first (for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no header token, check cookies (for web page requests)
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }
    
    if (!token) {
      // For API requests, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // For web requests, redirect to login
      return res.redirect('/admin/login/secret');
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists and is active
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        if (req.path.startsWith('/api/')) {
          return res.status(401).json({ message: 'User not found' });
        }
        return res.redirect('/admin/login/secret');
      }
      
      if (!user.isActive) {
        if (req.path.startsWith('/api/')) {
          return res.status(403).json({ message: 'Account is deactivated' });
        }
        return res.redirect('/admin/login/secret');
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
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      return res.redirect('/admin/login/secret');
    }
  } catch (error) {
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ message: error.message });
    }
    return res.redirect('/admin/login/secret');
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