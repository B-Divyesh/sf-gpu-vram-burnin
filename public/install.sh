#!/usr/bin/env sh
set -eu
repo='B-Divyesh/sf-gpu-vram-burnin'
api="https://api.github.com/repos/$repo/releases/latest"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
os=$(uname -s)
case "$os" in Linux) pattern='AppImage$'; out='vram-burnin.AppImage';; Darwin) pattern='\.dmg$'; out='VRAM-Burn-in-Kit.dmg';; *) echo 'Use install.ps1 on Windows.' >&2; exit 1;; esac
url=$(curl -fsSL "$api" | grep browser_download_url | grep -E "$pattern" | head -n1 | cut -d '"' -f4)
sumurl=$(curl -fsSL "$api" | grep browser_download_url | grep 'SHA256SUMS' | head -n1 | cut -d '"' -f4)
[ -n "$url" ] && [ -n "$sumurl" ] || { echo 'Downloads are being published.' >&2; exit 1; }
curl -fsSL "$url" -o "$tmp/$out"; curl -fsSL "$sumurl" -o "$tmp/SHA256SUMS"
(cd "$tmp" && grep " $out$" SHA256SUMS | sha256sum -c -)
mkdir -p "$HOME/.local/bin"; mv "$tmp/$out" "$HOME/.local/bin/$out"; chmod +x "$HOME/.local/bin/$out"
echo "Installed $out in $HOME/.local/bin after SHA256 verification."
