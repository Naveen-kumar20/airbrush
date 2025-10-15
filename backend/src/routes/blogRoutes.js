import express from 'express';
import { getAllBlogPosts, getBlogPostByUrl, editBlogPost } from '../controllers/blogController.js';

const router = express.Router();

// Get all blog posts
router.get('/', getAllBlogPosts);

// Get a single blog post by ID
router.get('/:url', getBlogPostByUrl);

// Edit a blog post by ID
router.put('/:id', editBlogPost);

export default router; 