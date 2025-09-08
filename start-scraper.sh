#!/bin/bash

# Start Thomasnet Scraper Server
echo "Starting Thomasnet Scraper Server..."
echo "Server will run on http://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed or not in PATH"
    exit 1
fi

# Start the server
python3 thomasnet-server.py 8080
