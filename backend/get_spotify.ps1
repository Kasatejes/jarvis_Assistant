$procs = Get-Process spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle }
foreach ($p in $procs) {
    Write-Output "TITLE: $($p.MainWindowTitle)"
}
if (-not $procs) {
    Write-Output "NO_SPOTIFY_FOUND"
}
