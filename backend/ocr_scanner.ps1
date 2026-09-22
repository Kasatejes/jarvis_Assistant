param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] | Out-Null

    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    } | Select-Object -First 1

    function Wait-AsyncOperation($asyncOp, $type) {
        $method = $asTaskGeneric.MakeGenericMethod($type)
        $netTask = $method.Invoke($null, @($asyncOp))
        $netTask.Wait()
        return $netTask.Result
    }

    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    if (-not (Test-Path $fullPath)) {
        Write-Error "File not found: $fullPath"
        exit 1
    }

    $file = Wait-AsyncOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)) ([Windows.Storage.StorageFile])
    $stream = Wait-AsyncOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Wait-AsyncOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $softwareBmp = Wait-AsyncOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {
        $lang = [Windows.Globalization.Language]::new("en-US")
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    }

    $ocrResult = Wait-AsyncOperation ($engine.RecognizeAsync($softwareBmp)) ([Windows.Media.Ocr.OcrResult])
    
    $lines = @()
    foreach ($line in $ocrResult.Lines) {
        if ($line.Text) {
            $lines += $line.Text
        }
    }
    
    $stream.Dispose()
    $extractedText = $lines -join "`n"

    # Get active windows list
    $openWindows = @()
    try {
        $procs = Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle.Trim().Length -gt 0 }
        foreach ($p in $procs) {
            $openWindows += "$($p.ProcessName): $($p.MainWindowTitle.Trim())"
        }
    } catch {}

    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $resObj = [PSCustomObject]@{
        success = $true
        text = $extractedText
        openWindows = $openWindows
    }

    Write-Output ($resObj | ConvertTo-Json -Depth 3 -Compress)
} catch {
    $errObj = [PSCustomObject]@{
        success = $false
        error = $_.Exception.Message
        text = ""
        openWindows = @()
    }
    Write-Output ($errObj | ConvertTo-Json -Depth 3 -Compress)
}
