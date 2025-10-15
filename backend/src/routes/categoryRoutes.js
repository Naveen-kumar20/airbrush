import express from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteAllCategories,
  deleteCategoryWithRelated
} from '../controllers/categoryController.js';
import { verifyToken, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/id/:id', getCategoryById);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/parent/:parentSlug/slug/:slug', getCategoryBySlug);

// Protected routes (admin only)
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.delete('/:id/complete', deleteCategoryWithRelated);
router.delete('/', deleteAllCategories);

export default router;