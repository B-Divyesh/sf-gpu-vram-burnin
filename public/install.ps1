$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-gpu-vram-burnin'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match '\.(msi|exe|zip)$' } | Select-Object -First 1
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
if (!$asset -or !$sums) { throw 'Downloads are being published.' }
$dir = Join-Path $env:TEMP 'vram-burnin-install'; New-Item -Force -ItemType Directory $dir | Out-Null
$file = Join-Path $dir $asset.name; $sumFile = Join-Path $dir 'SHA256SUMS'
Invoke-WebRequest $asset.browser_download_url -OutFile $file; Invoke-WebRequest $sums.browser_download_url -OutFile $sumFile
$expected = (Select-String -Path $sumFile -Pattern ([regex]::Escape($asset.name) + '$')).Line.Split(' ')[0]
if ((Get-FileHash $file -Algorithm SHA256).Hash.ToLower() -ne $expected.ToLower()) { throw 'SHA256 check failed.' }
Write-Host "Verified $($asset.name). Open $file to install the unsigned build."
