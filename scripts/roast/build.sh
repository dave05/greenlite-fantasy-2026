#!/usr/bin/env bash
# Build one week's Guillotine Gazette. Prints the PDF path on stdout.
#
#   ./build.sh              # last completed week
#   ./build.sh --week 2     # a specific week
#
# Two renders come out of this:
#   gazette-week-N.html   web fonts + animation, for viewing/sharing as a page
#   guillotine-gazette-week-N.pdf   system fonts, one A4 page, for emailing
#
# Chrome does the PDF because it is already on the machine. Headless Chrome does
# NOT exit after --print-to-pdf, so it is backgrounded and killed once the file
# appears - otherwise this script hangs forever.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${OUT_DIR:-${TMPDIR:-/tmp}}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "${CHROME:-}" ] && [ -x "$CHROME" ] || { echo "no Chrome/Chromium found; set CHROME=/path/to/chrome" >&2; exit 1; }

node "$here/collect.mjs" "$@" > "$out/gazette.json"
week="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$out/gazette.json','utf8')).week)")"

# Screen version: web fonts, animation.
node "$here/render.mjs" --fonts=web    < "$out/gazette.json" > "$out/gazette-week-$week.html"
# Print version: system fonts and no emoji, which keeps the PDF small.
node "$here/render.mjs" --fonts=system < "$out/gazette.json" > "$out/gazette-print-$week.html"

raw="$out/.gazette-raw-$week.pdf"
pdf="$out/guillotine-gazette-week-$week.pdf"
rm -f "$raw" "$pdf"

# In a sandboxed CI/cloud container Chrome's browser process hangs BEFORE it
# forks a renderer, blocked on component-update / safebrowsing / sync calls that
# cannot reach the network. It then never writes the PDF. Every flag below
# switches off one of those background fetches, and --virtual-time-budget caps
# how long the page may keep the renderer busy so it always terminates.
profile="$(mktemp -d)"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --no-sandbox --disable-dev-shm-usage \
  --disable-background-networking --disable-component-update \
  --disable-client-side-phishing-detection --safebrowsing-disable-auto-update \
  --disable-sync --disable-default-apps --disable-extensions \
  --no-first-run --no-default-browser-check --metrics-recording-only \
  --virtual-time-budget=10000 \
  --user-data-dir="$profile" --print-to-pdf="$raw" \
  "file://$out/gazette-print-$week.html" >/dev/null 2>&1 &
chrome_pid=$!

# Wait for the file to stop growing, then stop Chrome.
for _ in $(seq 1 60); do
  sleep 1
  [ -s "$raw" ] || continue
  a=$(wc -c < "$raw"); sleep 1; b=$(wc -c < "$raw")
  [ "$a" = "$b" ] && break
done
kill "$chrome_pid" 2>/dev/null || true
wait "$chrome_pid" 2>/dev/null || true
rm -rf "$profile"

[ -s "$raw" ] || { echo "Chrome produced no PDF" >&2; exit 1; }

# Ghostscript roughly halves it. Not fatal if it is missing.
if command -v gs >/dev/null 2>&1; then
  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer \
     -dNOPAUSE -dQUIET -dBATCH -sOutputFile="$pdf" "$raw" 2>/dev/null || cp "$raw" "$pdf"
else
  cp "$raw" "$pdf"
fi
rm -f "$raw"

echo "$pdf"
