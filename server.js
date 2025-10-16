import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import bodyParser from "body-parser";
import exphbs from "express-handlebars";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { marked } from "marked";
import fetch from 'node-fetch';
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import pm2 from 'pm2';
import { CronJob } from 'cron';

// Import the route handlers from backend
import backendRouter from './backend/src/index.js';
import categoryRoutes from './backend/src/routes/categoryRoutes.js';
import generatorRoutes from './backend/src/routes/generatorRoutes.js';
import {verifyToken, adminOnly} from './backend/src/middlewares/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const connectionString = "mongodb+srv://turquoisecarlee:lIgnMZtRdrKPIMjN@cluster0.qyp4f.mongodb.net/?retryWrites=true&w=majority";

// Mount the backend API under /api prefix
app.use('/api', backendRouter);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Explicitly set MIME types for common static files
express.static.mime.define({'text/css': ['css']});
express.static.mime.define({'application/javascript': ['js']});
express.static.mime.define({'application/javascript': ['mjs']});  // For ES modules
express.static.mime.define({'image/jpeg': ['jpg', 'jpeg']});
express.static.mime.define({'image/png': ['png']});
express.static.mime.define({'image/gif': ['gif']});

// Get absolute path to public directory
const publicPath = path.resolve(__dirname, "public");

// Verify public directory exists and is accessible
try {
  const publicStats = fs.statSync(publicPath);
  console.log('Public directory exists:', publicStats.isDirectory());
  console.log('Public directory permissions:', {
    readable: Boolean(publicStats.mode & fs.constants.R_OK),
    writable: Boolean(publicStats.mode & fs.constants.W_OK),
    executable: Boolean(publicStats.mode & fs.constants.X_OK)
  });
} catch (error) {
  console.error('Error accessing public directory:', error);
}

// Configure static file serving options
const staticOptions = {
  dotfiles: 'ignore',
  etag: true,
  extensions: false,
  fallthrough: true,
  immutable: true,
  index: false,
  lastModified: true,
  maxAge: '1y',
  redirect: true,
  setHeaders: (res, path, stat) => {
    // Set proper security headers
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Set proper MIME types
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    }
    
    // Set caching headers
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
};

// Serve static files before route handlers
app.use(express.static(publicPath, staticOptions));
app.use(express.static(path.join(process.cwd(), 'public'), staticOptions));

// Parse request bodies
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 100000 }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser());

// Function to get base URL
// Function to get base URL
function getBaseUrl(req) {
  if (!req) {
    return process.env.NODE_ENV === 'production' ? 'https://airbrush.ai' : 'http://localhost:8000';
  }
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = req.get('host');
  return `${protocol}://${host}`;
}

// Function to fetch categories from API
async function fetchCategories(req) {
  try {
    // Use relative URL for internal API calls
    const response = await fetch('http://127.0.0.1:8000/api/categories', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Function to fetch blogs from API
async function fetchBlogs(req) {
  try {
    // Use relative URL for internal API calls
    const response = await fetch('http://127.0.0.1:8000/api/blog', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

// Configure Handlebars
const hbs = exphbs.create({
  extname: ".hbs",
  helpers: {
    eq: function (a, b) {
      return a === b;
    },
    json: function (context) {
      return JSON.stringify(context);
    },
    formatDate: function (date) {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    section: function (name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    },
    ifCond: function (v1, operator, v2, options) {
      switch (operator) {
        case "==":
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case "===":
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case "!=":
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case "!==":
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case "<":
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case "<=":
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case ">":
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case ">=":
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case "&&":
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case "||":
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
  },
});

app.engine(".hbs", hbs.engine);

// Path to sitemap.xml file
const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');

// Initial sitemap template
const sitemapTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://airbrush.ai/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Generated pages will be inserted here -->
</urlset>`;

// Ensure sitemap exists
if (!fs.existsSync(sitemapPath)) {
  fs.writeFileSync(sitemapPath, sitemapTemplate);
}

// Declare client variable at the top level
let client;

// MongoDB connection - use Promise style consistently
MongoClient.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(mongoClient => {
  // Assign the client to the top-level variable
  client = mongoClient;
  console.log("Connected to Database");

  // Initialize collections
  const db = client.db("ai4chat");
  const rootCollection = db.collection("root-collection");
  const blogCollection = db.collection("blog-collection");
  const gptCollection = db.collection("gpt-collection");
  const generatorCollection = db.collection("generator-collection");
  const characterCollection = db.collection("character-collection");
  const modelsCollection = db.collection("models");
  const imageModelsCollection = db.collection("image-models");
  const apiFeatureCollection = db.collection("api-feature-collection");

  // Initial sitemap update
  updateSitemap();
})
.catch(err => {
  console.error("MongoDB Connection Error:", err);
  process.exit(1);
});

// Function to create individual sitemap file
function createSitemapFile(urls, filename) {
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('')}
</urlset>`;

  const filePath = path.join(__dirname, 'public', filename);
  fs.writeFileSync(filePath, sitemapContent);
  console.log(`Created ${filename} with ${urls.length} URLs`);
}

// Function to create sitemap index file
function createSitemapIndex(sitemapFiles) {
  const sitemapIndexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(filename => `  <sitemap>
    <loc>https://airbrush.ai/${filename}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  fs.writeFileSync(sitemapPath, sitemapIndexContent);
  console.log(`Created sitemap index with ${sitemapFiles.length} sitemap files`);
}

// Function to update sitemap with latest categories and pages
async function updateSitemap() {
  try {
    // Check if client is initialized
    if (!client) {
      console.log('MongoDB client not initialized yet, skipping sitemap update');
      return;
    }
    
    // Use fetchCategories and fetchBlogs functions to get data
    const categories = await fetchCategories();
    const blogs = await fetchBlogs();
    
    // Prepare all URLs
    const allUrls = [];
    
    // Add homepage
    allUrls.push(`  <url>
    <loc>https://airbrush.ai/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

    // Add categories to URLs
    if (categories && categories.length > 0) {
      console.log(`Adding ${categories.length} categories to sitemap`);
      categories.forEach(category => {
        allUrls.push(`  <url>
    <loc>https://airbrush.ai/${category.slug || category._id}</loc>
    <lastmod>${new Date(category.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
      });
    } else {
      console.log('No categories found for sitemap');
    }

    // Add blogs to URLs
    if (blogs && blogs.length > 0) {
      console.log(`Adding ${blogs.length} blogs to sitemap`);
      blogs.forEach(blog => {
        allUrls.push(`  <url>
    <loc>https://airbrush.ai/blog/${blog.url || blog._id}</loc>
    <lastmod>${new Date(blog.updatedAt || blog.createdAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    } else {
      console.log('No blogs found for sitemap');
    }

    // Split URLs into chunks of 100
    const maxUrlsPerFile = 100;
    const sitemapFiles = [];
    let currentChunk = [];
    let fileIndex = 1;

    for (let i = 0; i < allUrls.length; i++) {
      currentChunk.push(allUrls[i]);
      
      // If we reach 100 URLs or it's the last URL, create a sitemap file
      if (currentChunk.length === maxUrlsPerFile || i === allUrls.length - 1) {
        const filename = `sitemap${fileIndex}.xml`;
        createSitemapFile(currentChunk, filename);
        sitemapFiles.push(filename);
        currentChunk = [];
        fileIndex++;
      }
    }

    // Create sitemap index file
    createSitemapIndex(sitemapFiles);
    
    console.log(`Sitemap updated successfully! Created ${sitemapFiles.length} sitemap files with ${allUrls.length} total URLs`);
  } catch (error) {
    console.error('Error updating sitemap:', error);
  }
}

// Schedule daily sitemap updates at 2 AM
const sitemapJob = new CronJob('0 2 * * *', function() {
  console.log('Running scheduled sitemap update...');
  updateSitemap();
}, null, true, 'America/New_York');

// Start the cron job
sitemapJob.start();

// Sitemap routes
app.get("/sitemap.xml", (req, res) => {
  res.type('application/xml');
  res.sendFile(sitemapPath);
});

// Individual sitemap files
app.get("/sitemap1.xml", (req, res) => {
  const sitemapFilePath = path.join(__dirname, 'public', 'sitemap1.xml');
  if (fs.existsSync(sitemapFilePath)) {
    res.type('application/xml');
    res.sendFile(sitemapFilePath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

app.get("/sitemap2.xml", (req, res) => {
  const sitemapFilePath = path.join(__dirname, 'public', 'sitemap2.xml');
  if (fs.existsSync(sitemapFilePath)) {
    res.type('application/xml');
    res.sendFile(sitemapFilePath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Dynamic route for additional sitemap files
app.get("/sitemap:number.xml", (req, res) => {
  const sitemapNumber = req.params.number;
  const sitemapFilePath = path.join(__dirname, 'public', `sitemap${sitemapNumber}.xml`);
  
  // Check if file exists
  if (fs.existsSync(sitemapFilePath)) {
    res.type('application/xml');
    res.sendFile(sitemapFilePath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Root route handler
app.get("/", async (req, res) => {
  try {
    const categories = await fetchCategories(req);
    res.render("index", {
      layout: "main",
      title: "Airbrush Dashboard",
      category: {
        metaTags: `
          <title>Airbrush - Best AI Art, Image & Stock Photo Generator</title>
          <meta name="description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta name="robots" content="index, follow">
          
          <!-- FB meta tags -->
          <meta property="og:title" content="Airbrush - Best AI Art, Image & Stock Photo Generator">
          <meta property="og:description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta property="og:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.webp">
          <meta property="og:url" content="https://www.airbrush.ai">
          
          <!-- Twitter meta tags -->
          <meta name="twitter:title" content="Airbrush - Best AI Art, Image & Stock Photo Generator">
          <meta name="twitter:description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta name="twitter:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.webp">
        `
      }
    });
  } catch (error) {
    console.error('Error in root route:', error);
    res.render("index", {
      layout: "main",
      title: "Airbrush Dashboard",
      category: {
        metaTags: `
          <title>Airbrush - Best AI Art, Image & Stock Photo Generator</title>
          <meta name="description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta name="robots" content="index, follow">
          
          <!-- FB meta tags -->
          <meta property="og:title" content="Airbrush - Best AI Art, Image & Stock Photo Generator">
          <meta property="og:description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta property="og:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.webp">
          <meta property="og:url" content="https://www.airbrush.ai">
          
          <!-- Twitter meta tags -->
          <meta name="twitter:title" content="Airbrush - Best AI Art, Image & Stock Photo Generator">
          <meta name="twitter:description" content="With Airbrush's AI technology, you can create original stock photos, NFTs, art, and more - in just seconds.">
          <meta name="twitter:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.webp">
        `
      }
    });
  }
});

// Other route handlers
app.get("/pricing", (req, res) => {
  res.render("pricing", {
    layout: "main",
    title: "Pricing - Airbrush Dashboard",
    category: {
      metaTags: `
        <title>Pricing - Airbrush</title>
        <meta name="description" content="Explore Airbrush's pricing options! Choose between our free and unlimited plans to unlock advanced AI chatbot capabilities tailored to your needs.">
        <meta name="robots" content="index, follow">
        
        <!-- FB meta tags -->
        <meta property="og:title" content="Pricing - Airbrush">
        <meta property="og:description" content="Explore Airbrush's pricing options! Choose between our free and unlimited plans to unlock advanced AI capabilities tailored to your needs.">
        <meta property="og:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.png">
        <meta property="og:url" content="https://www.airbrush.ai">
        
        <!-- Twitter meta tags -->
        <meta name="twitter:title" content="Pricing - Airbrush AI">
        <meta name="twitter:description" content="Explore Airbrush AI's pricing options! Choose between our free and unlimited plans to unlock advanced AI capabilities tailored to your needs.">
        <meta name="twitter:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.png">
      `
    }
  });
});

app.get("/404", (req, res) => {
  // Check if the request accepts JSON
  if (req.accepts('json')) {
    return res.status(404).json({ message: 'Page not found' });
  }
  
  // Otherwise render the HTML page
  res.render("404", {
    layout: "main",
    title: "404 - Page Not Found"
  });
});

app.get("/faq", (req, res) => {
  res.render("faq", {
    layout: "main",
    title: "FAQ - Airbrush Dashboard",
    category: {
      metaTags: `
        <title>Frequently Asked Questions - Airbrush</title>
        <meta name="description" content="FAQs for Airbrush: Answers to your questions about using multiple chatbots, features, plans, and more. Get clarity on Airbrush's offerings.">
        <meta name="robots" content="index, follow">
        
        <!-- FB meta tags -->
        <meta property="og:title" content="Frequently Asked Questions - Airbrush">
        <meta property="og:description" content="FAQs for Airbrush: Answers to your questions about using multiple image models, features, plans, and more. Get clarity on Airbrush AI's offerings.">
        <meta property="og:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.png">
        <meta property="og:url" content="https://www.airbrush.ai">
        
        <!-- Twitter meta tags -->
        <meta name="twitter:title" content="Frequently Asked Questions - Airbrush">
        <meta name="twitter:description" content="FAQs for Airbrush: Answers to your questions about using multiple image models, features, plans, and more. Get clarity on Airbrush AI's offerings.">
        <meta name="twitter:image" content="https://i.postimg.cc/x8Hy7mQ9/Screenshot-297.png">
      `
    }
  });
});

// Update the aiChat function to use fetch with absolute URL
async function aiChat(conversation) {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversation,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in aiChat:", error);
    throw error;
  }
}

// Function to call OpenAI API and generate content
async function chatgpt3(conversation, aiengine) {
  const model = aiengine === "gpt-4" ? "gpt-4" : "gpt-3.5-turbo";
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: conversation,
    }),
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", requestOptions);
  const data = await response.json();
  console.log(data);
  return data;
}

// Add route update endpoint
app.post("/api/update-routes", async (req, res) => {
  try {
    const result = await updateRoutes();
    res.json(result);
  } catch (error) {
    console.error('Error updating routes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove duplicate route handlers
app.get("/blogs/:title", async (req, res) => {
  try {
    res.render("blog", {
      layout: "main",
      section: { title: "Blog", description: "Blog" },
    });
  } catch (error) {
    console.error("Error fetching blog article or related articles:", error);
    res.redirect("/error-page");
  }
});

// Authentication middleware - move before routes
const checkAuth = (req, res, next) => {
  // Check if path is a protected route
  if (req.path === '/admin/dashboard' || req.path === '/admin/new-category') {
    // Check for token in cookies
    const token = req.cookies.authToken;
    if (!token) {
      return res.redirect('/');
    }
  }
  return next();
};

// Apply auth middleware
app.use(checkAuth);

// Admin routes
app.get('/admin/login/secret', (req, res) => {
  res.render('auth', { layout: false });
});

app.get('/admin/dashboard',(req, res) => {
  res.render('adminIndex', { 
    layout: 'adminMain',
    partialName: 'placeholder',
    title: 'Admin Dashboard',
    activeMenu: 'dashboard',
    section: { 
      title: 'Dashboard', 
      description: 'Welcome to your admin dashboard' 
    }
  });
});

app.get('/hero-section', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'hero-section',
    title: 'Hero Section',
    activeMenu: 'hero-section',
    section: { title: 'Hero section', description: 'Studio Ghibli is amazing!' }
  });
});

app.get('/edit-category', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'edit-category',
    title: 'Edit Category',
    section: { title: 'Edit Category', description: 'Edit Category' }
  });
});

app.get('/text-to-anything', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'text-to-anything',
    title: 'Text to Anything',
    section: { title: 'Text to Anything', description: 'Text to Anything' }
  });
});

app.get('/blogs', verifyToken,  (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'blogs',
    title: 'Blogs',
    section: { title: 'Blogs', description: 'Blogs' }
  });
});

app.get('/transform-grid', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'transform-grid',
    title: 'Transform Grid',
    section: { title: 'Transform Grid', description: 'Transform Grid' }
  });
});

app.get('/admin/new-category', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'new-category',
    title: 'New Category',
    section: { title: 'New Category', description: 'New Category' }
  });
});

app.get('/why-use-tool', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'why-use-tool',
    section: { title: 'Why use the tool', description: 'Why use the tool section' }
  });
});

app.get('/images-gallery', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'image-gallery',
    section: { title: 'Image Gallery', description: 'Gallery of images' }
  });
});

app.get('/category-video', (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'category-video',
    section: { title: 'Category Video', description: 'Category Video' }
  });
});

app.get('/admin/all-blogs', verifyToken, (req, res) => {
  res.render('adminIndex', {
    layout: 'adminMain',
    partialName: 'all-blogs',
    section: { title: 'All Blogs', description: 'All Blogs' }
  });
});

function slugify(keyword) {
  return keyword
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove any non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with a single hyphen
    .trim(); // Remove any leading or trailing hyphens
}

app.post("/generate-page", async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "Invalid keywords input." });
  }

  try {
    const urls = await Promise.all(
      keywords.map(async (keyword) => {
        const slug = slugify(keyword);

        // Single conversation with all the required prompts
        const conversation1 = [
          {
            role: "user",
            content: `Generate an appropriate title for the web article having keywords: ${keyword}`,
          },
        ];
        const conversation2 = [
          {
            role: "user",
            content: `Generate a short-paragraphed content of about 4-6 lines based on keywords: ${keyword}`,
          },
        ];
        const conversation3 = [
          {
            role: "user",
            content: `Generate short-paragraphed content of about 4-6 lines about features based on keywords: ${keyword}`,
          },
        ];
        const conversation4 = [
          {
            role: "user",
            content: `Generate short-paragraphed content of about 4-6 lines about how to use based on keywords: ${keyword}`,
          },
        ];
        const conversation5 = [
          {
            role: "user",
            content: `Generate short-paragrpahed content of about 4-6 lines about best practices for keywords: ${keyword}`,
          },
        ];

        const response1 = await chatgpt3(conversation1, "gpt-4");
        const response2 = await chatgpt3(conversation2, "gpt-4");
        const response3 = await chatgpt3(conversation3, "gpt-4");
        const response4 = await chatgpt3(conversation4, "gpt-4");
        const response5 = await chatgpt3(conversation5, "gpt-4");

        const pageTitle = response1.choices[0].message.content;
        const content = response2.choices[0].message.content;
        const featuresContent = response3.choices[0].message.content;
        const howToUseContent = response4.choices[0].message.content;
        const bestPracticesContent = response5.choices[0].message.content;

        console.log(pageTitle);
        console.log(content);
        console.log(featuresContent);
        console.log(howToUseContent);
        console.log(bestPracticesContent);
        // const { pageTitle, content, featuresContent, howToUseContent, bestPracticesContent } = data;

        // Render content dynamically using a pre-saved .hbs template
        const templatePath = path.join(__dirname, "views", "template.hbs");
        const templateContent = fs.readFileSync(templatePath, "utf-8");
        const hbs = exphbs.create({});
        const pageContent = hbs.handlebars.compile(templateContent)({
          keyword,
          pageTitle,
          content,
          featuresContent,
          howToUseContent,
          bestPracticesContent,
        });

        const pagePath = path.join(
          __dirname,
          "views",
          "generated-pages",
          `${slug}.hbs`
        );
        fs.writeFileSync(pagePath, pageContent);
        addPageToSitemap(slug);
        return `/${slug}`;
      })
    );
    res.json({ message: "Pages generated successfully!", urls });
  } catch (error) {
    console.error("Error generating page:", error);
    res.status(500).json({ error: "Failed to generate page content." });
  }
});

// app.get("/:slug", async (req, res) => {
//   const { slug } = req.params;

//   try {
//     const blogArticle = await blogCollection.findOne({ url: slug });
//     if (blogArticle) {
//       // Redirect to the new blog URL
//       return res.redirect(301, `/blog/${slug}`);
//     }

//     // Check in pages collection
//     const generatorPage = await generatorCollection.findOne({ url: slug });
//     if (generatorPage) {
//       // Redirect to the new page URL
//       return res.redirect(301, `/pages/${slug}`);
//     }

//     const filePath = path.join(
//       __dirname,
//       "views",
//       "generated-pages",
//       `${slug}.hbs`
//     );
//     if (fs.existsSync(filePath)) {
//       return res.render(path.join("generated-pages", slug));
//     }

//     res.redirect("/404");
//   } catch (error) {
//     console.error("Error handling request:", error);
//     res.status(500).send("Internal server error.");
//   }
// });



// Function to call OpenAI API and generate content


// Add route update endpoint
app.post("/api/update-routes", async (req, res) => {
  try {
    const result = await updateRoutes();
    res.json(result);
  } catch (error) {
    console.error("Error generating image:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

app.get("/api/image/generate", async (req, res) => {
  const { prompt, aspect_ratio: aspectRatio } = req.query;

  if (!prompt || !aspectRatio) {
    return res
      .status(400)
      .json({ error: "Missing prompt or aspect_ratio parameter" });
  }

  try {
    const apiUrl = `https://1yjs1yldj7.execute-api.us-east-1.amazonaws.com/default/ai_image?prompt=${encodeURIComponent(
      prompt
    )}&aspect_ratio=${aspectRatio}&link=${encodeURIComponent(
      "writecream.com"
    )}`;
    console.log("Requesting:", apiUrl); // Debugging URL

    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Handle non-200 responses
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return res
        .status(response.status)
        .json({ error: "Error from AI image API", details: errorText });
    }

    const imageDetails = await response.json();
    console.log("Response from API:", imageDetails);

    if (!imageDetails.image_link) {
      // Validate the presence of the image link
      return res
        .status(500)
        .json({ error: "No image_link in response", details: imageDetails });
    }

    res.json(imageDetails);
  } catch (error) {
    console.error("Error generating image:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Category route handler (must be last to avoid conflicts)
app.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    // Check if it's a category page
    const categories = await fetchCategories(req);
    const category = categories.find(cat => cat.slug === slug);
    if (category) {
      const baseUrl = getBaseUrl(req);

      return res.render('3d-image', {
        title: category.name || 'Category Page',
        description: category.description || '',
        category: category,
        categories: categories,
        baseUrl: baseUrl
      });
    }

    // If no matching category is found, redirect to 404
    // res.redirect('/404');
  } catch (error) {
    console.error('Error in category route:', error);
    // res.redirect('/404');
  }
});

// Catch all other routes
app.all("*", (req, res) => {
  res.redirect("/404");
});

// Function to add a single page to sitemap
async function addPageToSitemap(slug) {
  try {
    let sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    
    // Create the new URL entry
    const newUrl = `
  <url>
    <loc>https://airbrush.ai/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

    // Insert before the closing </urlset> tag
    if (sitemapContent.includes('</urlset>')) {
      sitemapContent = sitemapContent.replace('</urlset>', `${newUrl}\n</urlset>`);
      fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding page to sitemap:', error);
    return false;
  }
}

let server;

// Server startup function
function startServer() {
  const PORT = process.env.PORT || 8000;
  server = app.listen(PORT, '0.0.0.0', function () {
    console.log(`Server listening on port ${PORT}...`);
  }).on('error', function(err) {
    console.error('Server failed to start:', err);
  });
}

startServer();


// Add route to manually update sitemap
app.get('/api/admin/update-sitemap', async (req, res) => {
  try {
    await updateSitemap();
    res.status(200).json({ success: true, message: 'Sitemap updated successfully' });
  } catch (error) {
    console.error('Error updating sitemap via API:', error);
    res.status(500).json({ success: false, message: 'Failed to update sitemap', error: error.message });
  }
});

