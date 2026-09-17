#!/usr/bin/env bash
# Publish teacher pages to imitator. Usage: teacher/_shared/publish.sh [index day1 ...]  (default: all built pages)
# Requires $IMITATOR_TOKEN. Visibility: group (token holders / link holders). Pass VIS=public to override.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${IMITATOR_TOKEN:?set IMITATOR_TOKEN}"
VIS="${VIS:-group}"
pages=("$@"); [ ${#pages[@]} -eq 0 ] && pages=(index day1 day2 day3 day4 day5 day6 day7)
for p in "${pages[@]}"; do
  f="$p.html"; [ -f "$f" ] || { echo "skip $f (not built)"; continue; }
  slug="ev-charge-ops-teacher"; [ "$p" != "index" ] && slug="ev-charge-ops-teacher-$p"
  title=$(grep -o '<title>[^<]*</title>' "$f" | sed 's/<\/*title>//g')
  resp=$(curl -sS -X PUT "https://imitator.ai-apps.work/v1/a/$slug" \
    -H "Authorization: Bearer $IMITATOR_TOKEN" -H "Content-Type: text/html" \
    -H "X-Visibility: $VIS" -H "X-Title: $title" --data-binary @"$f")
  echo "$resp" | python3 -c 'import sys,json; d=json.load(sys.stdin); w=[x.get("code") for x in d.get("warnings") or []]; print(d.get("slug"), "→", d.get("url"), "| warnings:", w or "none")'
done
