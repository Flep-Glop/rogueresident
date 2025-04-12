# Create this as "deep-reset.sh"
#!/bin/bash
echo "Deep cleaning project..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules
if [ -d "~/.cache/next" ]; then
  rm -rf ~/.cache/next
fi
echo "Clearing localStorage..."
cat << EOF > clear-storage.js
localStorage.clear();
sessionStorage.clear();
EOF
echo "Reinstalling dependencies..."
npm install
echo "Done. Start fresh with 'npm run dev'"