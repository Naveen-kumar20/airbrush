import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');

// Function to fetch categories from API
async function fetchCategories() {
  try {
    // Use the API endpoint to fetch categories
    const response = await fetch('http://127.0.0.1:8000/api/categories');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    
    const categories = await response.json();
    console.log(`Successfully fetched ${categories.length} categories`);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Function to fetch blogs from API
async function fetchBlogs() {
  try {
    // Use the API endpoint to fetch blogs
    const response = await fetch('http://127.0.0.1:8000/api/blog');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blogs: ${response.status}`);
    }
    
    const blogs = await response.json();
    console.log(`Successfully fetched ${blogs.data ? blogs.data.length : 0} blogs`);
    return blogs.data || [];
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

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

// Function to update sitemap with categories and pages from API
async function updateSitemapWithApi() {
  try {
    // Fetch categories and blogs from API
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

// Execute the function
updateSitemapWithApi();