#!/bin/bash
echo "Stopping any running Next.js processes..."
pkill -f "next"
echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache
echo "Clearing browser cache for localhost..."
echo "Please also manually clear your browser cache with Ctrl+Shift+R"
echo "Starting development server..."
npm run dev