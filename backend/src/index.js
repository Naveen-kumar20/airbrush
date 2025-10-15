import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// Import routes
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import imagesRoute from './routes/imagesRoute.js';
import blogRoutes from './routes/blogRoutes.js';
import generatorRoutes from './routes/generatorRoutes.js';

// Configure environment variables
dotenv.config();

const router = express.Router();

// Middleware
router.use(cors());
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 100000 }));

// Connect to database
const DB = process.env.MONGO_URL;
mongoose.connect(DB)
  .then(() => {
    console.log("Backend Database Connected");
  })
  .catch((err) => {
    console.log(err);
  });

// Use routes - remove the /api prefix since the main app will add it
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/sections', sectionRoutes);
router.use('/content', contentRoutes);
router.use('/images', imagesRoute);
router.use('/blog', blogRoutes);
router.use('/free-generators', generatorRoutes);

export default router;