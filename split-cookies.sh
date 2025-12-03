#!/bin/bash

if [ ! -f "cookies_base64_clean.txt" ]; then
    echo "Error: cookies_base64_clean.txt not found"
    echo "Run: base64 -i cookies.txt -o cookies_base64.txt && cat cookies_base64.txt | tr -d '\n' > cookies_base64_clean.txt"
    exit 1
fi

BASE64=$(cat cookies_base64_clean.txt)
TOTAL_LEN=${#BASE64}
CHUNK_SIZE=50000
CHUNK_NUM=1
OFFSET=0

echo "Splitting base64 into chunks of $CHUNK_SIZE characters..."
echo "Total length: $TOTAL_LEN characters"
echo ""

while [ $OFFSET -lt $TOTAL_LEN ]; do
    CHUNK="${BASE64:$OFFSET:$CHUNK_SIZE}"
    CHUNK_LEN=${#CHUNK}
    echo "YTDLP_COOKIES_BASE64_$CHUNK_NUM (length: $CHUNK_LEN):"
    echo "$CHUNK"
    echo ""
    echo "---"
    echo ""
    
    OFFSET=$((OFFSET + CHUNK_SIZE))
    CHUNK_NUM=$((CHUNK_NUM + 1))
done

echo "Total chunks: $((CHUNK_NUM - 1))"
echo ""
echo "Add these as environment variables in Render:"
echo "YTDLP_COOKIES_BASE64_1, YTDLP_COOKIES_BASE64_2, etc."

