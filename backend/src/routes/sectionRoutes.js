import express from 'express';
import {
  getSections,
  getSectionById,
  getSectionBySlug,
  createSection,
  updateSection,
  deleteSection,
  deleteAllSections,
  getSectionsByCategoryId
} from '../controllers/sectionController.js';
import { verifyToken, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getSections);
router.get('/id/:id', getSectionById);
router.get('/category/:categoryId', getSectionsByCategoryId);
router.get('/category/:categorySlug/section/:sectionSlug', getSectionBySlug);
router.get('/category/:categorySlug/parent/:parentSlug/section/:sectionSlug', getSectionBySlug);

// Protected routes (admin only)
router.post('/', createSection);
router.put('/:id', updateSection);
router.delete('/:id', deleteSection);
router.delete('/', deleteAllSections);

export default router; 