import mongoose from 'mongoose';
import { triggerSitemapUpdate } from '../utils/sitemaputils.js';

// Get all blog posts
export const getAllBlogPosts = async (req, res) => {
    try {
        const collection = mongoose.connection.collection('blog-collection');
        const { search } = req.query;
        let query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' }; // case-insensitive search
        }
        const posts = await collection.find(query).toArray();
        
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get a single blog post by URL
export const getBlogPostByUrl = async (req, res) => {
    try {
        const { url } = req.params;
        const collection = mongoose.connection.collection('blog-collection');
        
        const post = await collection.findOne({ url: url });
        
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Blog post not found'
            });
        }

        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Edit a blog post by ID
export const editBlogPost = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid blog post ID'
            });
        }

        const collection = mongoose.connection.collection('blog-collection');
        
        const result = await collection.updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $set: updates }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog post not found'
            });
        }

        // Trigger sitemap update after updating a blog post
        triggerSitemapUpdate();
        
        res.status(200).json({
            success: true,
            message: 'Blog post updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
