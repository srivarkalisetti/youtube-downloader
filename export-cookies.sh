#!/bin/bash

echo "=========================================="
echo "YouTube Cookie Export (Anti-Rotation Method)"
echo "=========================================="
echo ""
echo "IMPORTANT: Follow these steps EXACTLY to avoid cookie rotation:"
echo ""
echo "1. Open a NEW private/incognito window in your browser"
echo "2. Log into YouTube in that window"
echo "3. In the SAME window and tab, navigate to: https://www.youtube.com/robots.txt"
echo "   (This should be the ONLY tab open in that private window)"
echo "4. Keep that tab open and run this script"
echo "5. After export, CLOSE the private window immediately"
echo ""
echo "Press Enter when ready, or Ctrl+C to cancel..."
read

BROWSER=${1:-chrome}
echo ""
echo "Exporting cookies from $BROWSER..."
echo ""

yt-dlp --cookies-from-browser "$BROWSER" --cookies cookies.txt "https://www.youtube.com/robots.txt" 2>&1

if [ -f "cookies.txt" ]; then
    YOUTUBE_COUNT=$(grep -c "youtube.com" cookies.txt || echo "0")
    FILE_SIZE=$(wc -c < cookies.txt)
    
    echo ""
    echo "=========================================="
    echo "✓ Cookies exported successfully!"
    echo "=========================================="
    echo "File: cookies.txt"
    echo "Size: $FILE_SIZE bytes"
    echo "YouTube cookies: $YOUTUBE_COUNT"
    echo ""
    echo "Now run: ./encode-cookies.sh"
    echo "Then run: ./split-cookies.sh"
    echo ""
    echo "⚠️  IMPORTANT: Close the private window now!"
else
    echo ""
    echo "✗ Failed to export cookies."
    echo ""
    echo "Try:"
    echo "  - Make sure you're logged into YouTube in the private window"
    echo "  - Make sure robots.txt is the only tab open"
    echo "  - Try a different browser: ./export-cookies.sh firefox"
fi

