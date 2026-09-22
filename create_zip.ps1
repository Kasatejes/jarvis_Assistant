# Export J.A.R.V.I.S Prototype to ZIP (excluding node_modules and build caches)
$sourceDir = $PSScriptRoot
$zipPath = Join-Path $sourceDir "JARVIS-Prototype.zip"

Write-Host "Preparing clean export of J.A.R.V.I.S..."

$tempFolder = Join-Path $env:TEMP "JARVIS_Prototype_Export"
if (Test-Path $tempFolder) {
    Remove-Item -Path $tempFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $tempFolder | Out-Null

# Exclude list
$excludeDirs = @('node_modules', 'build', '.git')
$excludeExts = @('.zip', '.log')

Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $item = $_
    $relPath = $item.FullName.Substring($sourceDir.Length).TrimStart('\', '/')
    
    # Check if part of excluded folder
    $pathParts = $relPath -split '[\\/]'
    $isExcluded = $false
    foreach ($part in $pathParts) {
        if ($excludeDirs -contains $part) {
            $isExcluded = $true
            break
        }
    }
    
    if (-not $isExcluded) {
        if (-not $item.PSIsContainer) {
            if ($excludeExts -contains $item.Extension) {
                $isExcluded = $true
            }
        }
    }
    
    if (-not $isExcluded) {
        $targetPath = Join-Path $tempFolder $relPath
        if ($item.PSIsContainer) {
            if (-not (Test-Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            }
        } else {
            $targetParent = Split-Path $targetPath -Parent
            if (-not (Test-Path $targetParent)) {
                New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
            }
            Copy-Item -Path $item.FullName -Destination $targetPath -Force
        }
    }
}

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Write-Host "Compressing files into JARVIS-Prototype.zip..."
Compress-Archive -Path "$tempFolder\*" -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup temp folder
Remove-Item -Path $tempFolder -Recurse -Force

$zipItem = Get-Item $zipPath
$sizeMB = [math]::Round($zipItem.Length / 1MB, 2)
Write-Host "Success! Created: $($zipItem.FullName) ($sizeMB MB)"
