Get-Process | ForEach-Object {
    if ($_.ProcessName -match 'spot') {
        Write-Output "MATCH: $($_.Id) : $($_.ProcessName) : '$($_.MainWindowTitle)'"
    }
}
Write-Output "DONE"
