#!/usr/bin/env bash

FILE_TYPES=("js" "ts" "tsx" "mjs" "cjs")

echo "{"
first=true
for ext in "${FILE_TYPES[@]}"; do
    tmpfile=$(mktemp --tmpdir=. --suffix=".$ext")
    config=$(yarn eslint --print-config "$tmpfile")
    rm -f "$tmpfile"
    if [ -n "$config" ]; then
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        printf '  "%s": %s' "$ext" "$config"
    fi
done
echo ""
echo "}"