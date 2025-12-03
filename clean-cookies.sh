#!/bin/bash

echo "Cleaning and validating cookies.txt..."
echo ""

if [ ! -f "cookies.txt" ]; then
    echo "Error: cookies.txt not found"
    exit 1
fi

BACKUP="cookies.txt.backup.$(date +%s)"
cp cookies.txt "$BACKUP"
echo "Backup created: $BACKUP"
echo ""

TEMP_FILE="cookies_cleaned.tmp"
> "$TEMP_FILE"

TOTAL_LINES=0
VALID_LINES=0
INVALID_LINES=0
YOUTUBE_COOKIES=0

while IFS= read -r line; do
    TOTAL_LINES=$((TOTAL_LINES + 1))
    
    if [[ "$line" =~ ^# ]]; then
        echo "$line" >> "$TEMP_FILE"
        continue
    fi
    
    if [ -z "$line" ]; then
        continue
    fi
    
    FIELD_COUNT=$(echo "$line" | awk -F'\t' '{print NF}')
    
    CLEANED_LINE=$(echo "$line" | tr -d '\r' | sed 's/\n//g' | sed 's/\t\t*/\t/g')
    
    FIELD_COUNT=$(echo "$CLEANED_LINE" | awk -F'\t' '{print NF}')
    
    if [ "$FIELD_COUNT" -eq 7 ]; then
        DOMAIN=$(echo "$CLEANED_LINE" | awk -F'\t' '{print $1}')
        
        if [[ "$DOMAIN" =~ ^\. ]] || [[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            echo "$CLEANED_LINE" >> "$TEMP_FILE"
            VALID_LINES=$((VALID_LINES + 1))
            
            if echo "$CLEANED_LINE" | grep -q "youtube.com"; then
                YOUTUBE_COOKIES=$((YOUTUBE_COOKIES + 1))
            fi
        else
            INVALID_LINES=$((INVALID_LINES + 1))
            if [ "$INVALID_LINES" -le 5 ]; then
                echo "Skipping entry with invalid domain: $DOMAIN"
            fi
        fi
    else
        INVALID_LINES=$((INVALID_LINES + 1))
        if [ "$INVALID_LINES" -le 5 ]; then
            echo "Skipping invalid entry (${FIELD_COUNT} fields instead of 7):"
            echo "  $(echo "$line" | cut -c1-100)..."
        fi
    fi
done < cookies.txt

if [ "$INVALID_LINES" -gt 5 ]; then
    echo "... and $((INVALID_LINES - 5)) more invalid entries"
fi

mv "$TEMP_FILE" cookies.txt

echo ""
echo "=========================================="
echo "Cookie file cleaned!"
echo "=========================================="
echo "Total lines processed: $TOTAL_LINES"
echo "Valid cookie entries: $VALID_LINES"
echo "Invalid entries removed: $INVALID_LINES"
echo "YouTube cookies: $YOUTUBE_COOKIES"
echo ""
echo "Cleaned file: cookies.txt"
echo "Backup saved: $BACKUP"
echo ""

if [ "$YOUTUBE_COOKIES" -lt 5 ]; then
    echo "⚠️  WARNING: Only $YOUTUBE_COOKIES YouTube cookies found!"
    echo "   This might not be enough. You may need to re-export cookies."
fi

