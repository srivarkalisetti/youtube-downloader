#!/bin/bash

echo "=========================================="
echo "YouTube Cookie Export (Anti-Rotation Method)"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: yt-dlp --cookies-from-browser does NOT work for private sessions!"
echo ""
echo "According to yt-dlp docs, you MUST use a browser extension to export cookies."
echo ""
echo "Steps:"
echo "1. Open a NEW private/incognito window in your browser"
echo "2. Log into YouTube in that window"
echo "3. In the SAME window and tab, navigate to: https://www.youtube.com/robots.txt"
echo "   (This should be the ONLY tab open in that private window)"
echo "4. Install a cookie export extension:"
echo "   - Chrome: 'Get cookies.txt LOCALLY' or 'cookies.txt'"
echo "   - Firefox: 'cookies.txt'"
echo "5. Use the extension to export cookies for youtube.com"
echo "6. Save the exported file as 'cookies.txt' in this directory"
echo "7. Close the private window immediately after export"
echo ""
echo "Alternative: Use yt-dlp's --cookies-from-browser (but this exports regular cookies, not private session):"
echo ""
echo "Press Enter to continue with browser extension method, or Ctrl+C to cancel..."
read

echo ""
echo "Checking if cookies.txt exists..."
if [ -f "cookies.txt" ]; then
    YOUTUBE_COUNT=$(grep -c "youtube.com" cookies.txt || echo "0")
    FILE_SIZE=$(wc -c < cookies.txt)
    
    echo ""
    echo "=========================================="
    echo "Found cookies.txt!"
    echo "=========================================="
    echo "File: cookies.txt"
    echo "Size: $FILE_SIZE bytes"
    echo "YouTube cookies: $YOUTUBE_COUNT"
    echo ""
    
    if [ "$YOUTUBE_COUNT" -lt 10 ]; then
        echo "⚠️  WARNING: Only $YOUTUBE_COUNT YouTube cookies found!"
        echo "   This might not be enough. Make sure you exported from the private session."
    fi
    
    echo ""
    echo "If this is from a browser extension export, you're good!"
    echo "Next steps:"
    echo "1. Run: ./encode-cookies.sh"
    echo "2. Run: ./split-cookies.sh"
    echo "3. Update Render with the new cookie chunks"
else
    echo ""
    echo "✗ cookies.txt not found!"
    echo ""
    echo "Please export cookies using a browser extension:"
    echo "  Chrome: 'Get cookies.txt LOCALLY' extension"
    echo "  Firefox: 'cookies.txt' extension"
    echo ""
    echo "Then save the exported file as 'cookies.txt' in this directory."
fi

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
    
    if [ "$YOUTUBE_COUNT" -lt 10 ]; then
        echo "⚠️  WARNING: Only $YOUTUBE_COUNT YouTube cookies found!"
        echo "   This might not be enough. Make sure you:"
        echo "   - Are logged into YouTube"
        echo "   - Have robots.txt open in the private window"
        echo "   - Only have one tab open in that window"
    fi
    
    echo ""
    echo "Next steps:"
    echo "1. Run: ./encode-cookies.sh"
    echo "2. Run: ./split-cookies.sh"
    echo "3. Update Render with the new cookie chunks"
    echo ""
    echo "⚠️  IMPORTANT: Close the private window now!"
else
    echo ""
    echo "✗ Failed to export cookies."
    echo ""
    echo "Try:"
    echo "  - Make sure you're logged into YouTube in the private window"
    echo "  - Make sure https://www.youtube.com/robots.txt is the only tab open"
    echo "  - Try a different browser: ./export-cookies.sh firefox"
    echo "  - Make sure yt-dlp is installed: yt-dlp --version"
fi

