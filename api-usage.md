# Airbrush API Usage Guide

## Categories API

The Categories API allows you to fetch all categories from the application. This guide explains how to use the API to get categories and integrate them into your application.

### Fetching Categories

#### Endpoint

```
GET /api/categories
```

#### Example Usage

##### Using fetch in JavaScript

```javascript
async function fetchCategories() {
  try {
    const response = await fetch('/api/categories');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    
    const categories = await response.json();
    console.log('Categories:', categories);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}
```

##### Using Node.js with node-fetch

```javascript
import fetch from 'node-fetch';

async function fetchCategories() {
  try {
    const response = await fetch('http://localhost:8001/api/categories');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    
    const categories = await response.json();
    console.log('Categories:', categories);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}
```

### Category Object Structure

Each category object contains the following properties:

```javascript
{
  _id: String,        // MongoDB ObjectId
  name: String,       // Category name
  slug: String,       // URL-friendly version of the name
  description: String, // Category description
  parent: String,     // Parent category ID (null for root categories)
  isFolder: Boolean,  // Whether this category is a folder
  createdAt: Date,    // Creation timestamp
  updatedAt: Date     // Last update timestamp
}
```

## Pages API

The Pages API allows you to fetch all pages from the application. This guide explains how to use the API to get pages and integrate them into your application.

### Fetching Pages

#### Endpoint

```
GET /api/pages
```

#### Example Usage

##### Using fetch in JavaScript

```javascript
async function fetchPages() {
  try {
    const response = await fetch('/api/pages');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status}`);
    }
    
    const pages = await response.json();
    console.log('Pages:', pages);
    return pages;
  } catch (error) {
    console.error('Error fetching pages:', error);
    return [];
  }
}
```

##### Using Node.js with node-fetch

```javascript
import fetch from 'node-fetch';

async function fetchPages() {
  try {
    const response = await fetch('http://localhost:8001/api/pages');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status}`);
    }
    
    const pages = await response.json();
    console.log('Pages:', pages);
    return pages;
  } catch (error) {
    console.error('Error fetching pages:', error);
    return [];
  }
}
```

### Page Object Structure

Each page object contains the following properties:

```javascript
{
  _id: String,        // MongoDB ObjectId
  slug: String,       // URL-friendly version of the title
  title: String,      // Page title
  content: String,    // Page content
  createdAt: Date,    // Creation timestamp
  updatedAt: Date     // Last update timestamp
}
```

### Example Applications

1. **Category Viewer**: A simple HTML page that demonstrates fetching and displaying categories from the API.
   - File: `public/category-viewer.html`
   - Usage: Open the HTML file in a browser and click the "Fetch Categories" button.

2. **Sitemap Generator**: A Node.js script that fetches categories from the API and generates a sitemap.
   - File: `update-sitemap-with-api.js`
   - Usage: Run `node update-sitemap-with-api.js` to generate a sitemap with category URLs.

3. **Category Fetcher**: A simple Node.js script that demonstrates fetching categories from the API.
   - File: `fetch-categories-example.js`
   - Usage: Run `node fetch-categories-example.js` to fetch and display categories.

4. **API Endpoint Tester**: A Node.js script that tests both the categories and pages API endpoints.
   - File: `test-api-endpoints.js`
   - Usage: Run `node test-api-endpoints.js` to test the API endpoints.

### Integration with Sitemap

The sitemap is automatically updated with category URLs in the following scenarios:

1. When the server starts
2. Daily at 2 AM Eastern Time via a scheduled CronJob
3. When categories are modified (created, updated, or deleted)
4. Manually via the `/api/admin/update-sitemap` endpoint

The sitemap includes URLs for all categories and pages, making them discoverable by search engines.