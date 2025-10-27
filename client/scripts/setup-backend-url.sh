#!/bin/bash

# Backend URL Setup Script for AI.ttorney
# This script helps configure the backend API URL for EAS builds

echo "🔧 AI.ttorney Backend URL Configuration"
echo "========================================"
echo ""
echo "Choose your backend setup:"
echo ""
echo "1) Production (Cloud-deployed backend)"
echo "2) ngrok (Temporary testing with local backend)"
echo "3) Local Network IP (Same WiFi testing)"
echo "4) Show current configuration"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo "📡 Production Setup"
    echo "-------------------"
    read -p "Enter your backend URL (e.g., https://your-app.railway.app): " backend_url
    
    # Validate URL
    if [[ ! $backend_url =~ ^https?:// ]]; then
      echo "❌ Error: URL must start with http:// or https://"
      exit 1
    fi
    
    # Update eas.json
    echo "Updating eas.json..."
    sed -i '' "s|\"EXPO_PUBLIC_API_URL\": \".*\"|\"EXPO_PUBLIC_API_URL\": \"$backend_url\"|g" ../eas.json
    
    echo "✅ Updated eas.json with: $backend_url"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run build:dev"
    echo "2. Wait for build to complete"
    echo "3. Download and install APK"
    ;;
    
  2)
    echo ""
    echo "🌐 ngrok Setup"
    echo "--------------"
    echo "Make sure ngrok is installed: brew install ngrok"
    echo ""
    echo "Steps:"
    echo "1. Start your backend: cd ../server && uvicorn main:app --host 0.0.0.0 --port 8000"
    echo "2. In another terminal: ngrok http 8000"
    echo "3. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)"
    echo ""
    read -p "Enter ngrok URL: " ngrok_url
    
    if [[ ! $ngrok_url =~ ^https:// ]]; then
      echo "❌ Error: ngrok URL must use HTTPS"
      exit 1
    fi
    
    sed -i '' "s|\"EXPO_PUBLIC_API_URL\": \".*\"|\"EXPO_PUBLIC_API_URL\": \"$ngrok_url\"|g" ../eas.json
    
    echo "✅ Updated eas.json with: $ngrok_url"
    echo ""
    echo "⚠️  WARNING: This URL will change when you restart ngrok!"
    echo ""
    echo "Next steps:"
    echo "1. Keep ngrok running"
    echo "2. Run: npm run build:dev"
    echo "3. Wait for build to complete"
    ;;
    
  3)
    echo ""
    echo "🏠 Local Network Setup"
    echo "---------------------"
    echo "Finding your local IP address..."
    
    # Try to detect local IP
    local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    
    if [ -z "$local_ip" ]; then
      echo "Could not auto-detect IP. Please find it manually:"
      echo "Mac: ipconfig getifaddr en0"
      echo "Windows: ipconfig"
      echo "Linux: ip addr show"
      read -p "Enter your local IP: " local_ip
    else
      echo "Detected IP: $local_ip"
      read -p "Is this correct? (y/n): " confirm
      if [ "$confirm" != "y" ]; then
        read -p "Enter correct IP: " local_ip
      fi
    fi
    
    backend_url="http://$local_ip:8000"
    sed -i '' "s|\"EXPO_PUBLIC_API_URL\": \".*\"|\"EXPO_PUBLIC_API_URL\": \"$backend_url\"|g" ../eas.json
    
    echo "✅ Updated eas.json with: $backend_url"
    echo ""
    echo "⚠️  Requirements:"
    echo "- Device must be on same WiFi network"
    echo "- Backend must be running: uvicorn main:app --host 0.0.0.0 --port 8000"
    echo ""
    echo "Next steps:"
    echo "1. Start backend server"
    echo "2. Run: npm run build:dev"
    echo "3. Connect device to same WiFi"
    ;;
    
  4)
    echo ""
    echo "📋 Current Configuration"
    echo "------------------------"
    current_url=$(grep -A 2 '"development"' ../eas.json | grep 'EXPO_PUBLIC_API_URL' | cut -d'"' -f4)
    echo "Development: $current_url"
    
    preview_url=$(grep -A 2 '"preview"' ../eas.json | grep 'EXPO_PUBLIC_API_URL' | cut -d'"' -f4)
    echo "Preview: $preview_url"
    
    prod_url=$(grep -A 2 '"production"' ../eas.json | grep 'EXPO_PUBLIC_API_URL' | cut -d'"' -f4)
    echo "Production: $prod_url"
    echo ""
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✨ Configuration complete!"
