import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get base URL
function getBaseUrl() {
  // Default to localhost:8000 for development
  return process.env.BASE_URL || 'http://localhost:8000';
}

// Function to trigger sitemap update via API
export const triggerSitemapUpdate = async () => {
  try {
    const baseUrl = getBaseUrl();
    // Make a request to the sitemap update endpoint
    const response = await fetch(`${baseUrl}/api/admin/update-sitemap`);
    
    if (!response.ok) {
      throw new Error(`Failed to update sitemap: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Sitemap update triggered:', data.message);
    return data;
  } catch (error) {
    console.error('Error triggering sitemap update:', error);
    // Don't throw the error to prevent disrupting the main operation
    return { success: false, error: error.message };
  }
};