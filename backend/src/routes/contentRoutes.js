import express from 'express';
import {
  getAllContent,
  getContentById,
  getContentBySection,
  getContentByCategory,
  getContentBySlug,
  createContent,
  updateContent,
  deleteContent,
  deleteAllContent
} from '../controllers/contentController.js';
import { verifyToken, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllContent);
router.get('/id/:id', getContentById);
router.get('/section/:sectionId', getContentBySection);
router.get('/category/:categoryId', getContentByCategory);
router.get('/category/:categoryId/slug/:slug', getContentBySlug);

// Protected routes (admin only)
router.post('/', createContent);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);
router.delete('/', deleteAllContent);

export default router; 