import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user (requires authentication)
router.get('/me', verifyToken, getCurrentUser);

export default router; 