// API Configuration
const config = {
    // Base URL for API calls - empty string means use the same domain as the frontend
    apiBaseUrl: ''
};

// For development, you can change this to point to a different server
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    config.apiBaseUrl = 'http://localhost:5000';
}

// Export the config
window.appConfig = config; 