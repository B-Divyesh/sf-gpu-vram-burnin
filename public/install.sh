#!/usr/bin/env sh
set -eu
repo='B-Divyesh/sf-gpu-vram-burnin'
api="https://api.github.com/repos/$repo/releases/latest"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
os=$(uname -s)
case "$os" in Linux) pattern='AppImage$';; Darwin) pattern='\.dmg$';; *) echo 'Use install.ps1 on Windows.' >&2; exit 1;; esac
url=$(curl -fsSL "$api" | grep browser_download_url | grep -E "$pattern" | head -n1 | cut -d '"' -f4)
sumurl=$(curl -fsSL "$api" | grep browser_download_url | grep 'SHA256SUMS' | head -n1 | cut -d '"' -f4)
[ -n "$url" ] && [ -n "$sumurl" ] || { echo 'Downloads are being published.' >&2; exit 1; }
# GitHub's final content-disposition header supplies the unescaped asset name.
curl -fsSL "$url" -D "$tmp/headers" -o "$tmp/asset"; curl -fsSL "$sumurl" -o "$tmp/SHA256SUMS"
asset=$(sed -n 's/.*filename=//p' "$tmp/headers" | tr -d '\r"' | tail -n1)
[ -n "$asset" ] || { echo 'Could not identify the release asset.' >&2; exit 1; }
expected=$(grep -F "  ./$asset" "$tmp/SHA256SUMS" | head -n1 | cut -d ' ' -f1)
[ -n "$expected" ] || { echo 'Release checksum is missing for this asset.' >&2; exit 1; }
actual=$(sha256sum "$tmp/asset" | cut -d ' ' -f1)
[ "$actual" = "$expected" ] || { echo 'SHA256 check failed.' >&2; exit 1; }
if [ "$os" = Linux ]; then
  mkdir -p "$HOME/.local/bin"; mv "$tmp/asset" "$HOME/.local/bin/$asset"; chmod +x "$HOME/.local/bin/$asset"
  echo "Installed $asset in $HOME/.local/bin after SHA256 verification."
else
  mkdir -p "$HOME/Downloads"; mv "$tmp/asset" "$HOME/Downloads/$asset"
  echo "Verified unsigned $asset in $HOME/Downloads. Open it, then drag the app to Applications."
fi
