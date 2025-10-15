import express from 'express';
import { getAllGenerators, getGeneratorById } from '../controllers/generatorController.js';

const router = express.Router();

// Get all generators
router.get('/', getAllGenerators);

// Get a single generator by ID
router.get('/:id', getGeneratorById);

export default router; 