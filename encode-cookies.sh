#!/bin/bash

if [ ! -f "cookies.txt" ]; then
    echo "Error: cookies.txt not found"
    echo "First export cookies using: ./export-cookies.sh"
    exit 1
fi

echo "Encoding cookies.txt to base64..."
echo ""
base64 -i cookies.txt -o cookies_base64.txt

echo "✓ Encoded cookies saved to cookies_base64.txt"
echo ""
echo "Next steps:"
echo "1. Copy the contents of cookies_base64.txt"
echo "2. In Render dashboard, go to your service → Environment"
echo "3. Add new environment variable:"
echo "   Key: YTDLP_COOKIES_BASE64"
echo "   Value: (paste the entire contents of cookies_base64.txt)"
echo "4. Save and redeploy"
echo ""

