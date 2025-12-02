#!/bin/bash

echo "Exporting YouTube cookies using yt-dlp..."
echo ""
echo "This will export cookies from your default browser."
echo "Make sure you're logged into YouTube in your browser first."
echo ""

yt-dlp --cookies-from-browser chrome --cookies cookies.txt "https://www.youtube.com/robots.txt" 2>&1 | head -5

if [ -f "cookies.txt" ]; then
    echo ""
    echo "✓ Cookies exported to cookies.txt"
    echo "Add this file to your Render deployment and set YTDLP_COOKIES_FILE=/path/to/cookies.txt"
else
    echo ""
    echo "✗ Failed to export cookies. Try:"
    echo "  - Make sure you're logged into YouTube in Chrome"
    echo "  - Try: yt-dlp --cookies-from-browser firefox --cookies cookies.txt \"https://www.youtube.com/robots.txt\""
fi

