import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();
const connectionString = "mongodb+srv://turquoisecarlee:lIgnMZtRdrKPIMjN@cluster0.qyp4f.mongodb.net/?retryWrites=true&w=majority";

// GET all pages
router.get('/', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = client.db('ai4chat');
    const pages = await db.collection('pages').find({}).toArray();
    
    res.status(200).json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ message: 'Error fetching pages', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// GET page by ID
router.get('/:id', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = client.db('ai4chat');
    const page = await db.collection('pages').findOne({ _id: req.params.id });
    
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.status(200).json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ message: 'Error fetching page', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

export default router;