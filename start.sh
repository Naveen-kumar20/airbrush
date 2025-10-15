#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Stopping existing PM2 process if running..."

# --- PM2 Cleanup ---
# Check if PM2 is running and the process 'airbrush' exists, then stop and delete it.
# '|| true' prevents the script from exiting if PM2 is not running or the process doesn't exist.
pm2 stop airbrush || true
pm2 delete airbrush || true
echo "PM2 cleanup complete."
# --- End PM2 Cleanup ---

echo "Installing dependencies and starting server..."

# Change to the backend directory
# Note: Using sudo for npm install is generally discouraged due to potential
# permission issues and security risks. Consider fixing directory permissions
# or using a Node.js version manager (like nvm) instead.


# Install project dependencies in the backend directory
sudo npm install || { echo "Failed to install backend dependencies"; exit 1; }

# Install PM2 globally if it's not already installed
# Note: Again, using sudo for global npm installs can have issues.
# A Node.js version manager is a better approach for managing global packages.
# We add || true to prevent the script from failing if pm2 is already installed.
sudo npm install pm2 -g || true

echo "Server is starting using PM2..."

# Start the server.js application using PM2
# --name "codex" assigns a process name for easier management with PM2
# --watch can be added here if you want PM2 to restart the app on file changes
pm2 start server.js --name "airbrush" || { echo "Failed to start server with PM2"; exit 1; }

# Provide information on how to check PM2 status and logs
echo "Server 'airbrush' is running in the background managed by PM2."
echo "Check PM2 status: pm2 status"
echo "View logs: pm2 logs airbrush"
echo "Default PM2 logs are often located in ~/.pm2/logs/"