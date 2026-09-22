$ErrorActionPreference = 'SilentlyContinue'

# Method 1: Check Windows WinRT Global System Media Transport Controls (SMTC)
function Get-SMTCMedia {
    try {
        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
        $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
        
        $timeout = 0
        while ($asyncOp.Status -eq 'Started' -and $timeout -lt 20) {
            Start-Sleep -Milliseconds 15
            $timeout++
        }
        if ($asyncOp.Status -ne 'Completed') { return $null }

        $manager = $asyncOp.GetResults()
        if (-not $manager) { return $null }

        # Check current active session first
        $session = $manager.GetCurrentSession()
        $sessionsToCheck = @()
        if ($session) {
            $sessionsToCheck += $session
        }
        
        # Also append all other registered sessions (e.g. Spotify or browser backgrounded)
        $allSessions = $manager.GetSessions()
        if ($allSessions) {
            foreach ($s in $allSessions) {
                if ($sessionsToCheck -notcontains $s) {
                    $sessionsToCheck += $s
                }
            }
        }

        $firstValid = $null
        foreach ($s in $sessionsToCheck) {
            if (-not $s) { continue }
            try {
                $playbackInfo = $s.GetPlaybackInfo()
                $isPlaying = ($playbackInfo -and $playbackInfo.PlaybackStatus -eq 'Playing')
                
                $mediaPropsOp = $s.TryGetMediaPropertiesAsync()
                $propTimeout = 0
                while ($mediaPropsOp.Status -eq 'Started' -and $propTimeout -lt 15) {
                    Start-Sleep -Milliseconds 15
                    $propTimeout++
                }
                if ($mediaPropsOp.Status -eq 'Completed') {
                    $props = $mediaPropsOp.GetResults()
                    if ($props -and $props.Title) {
                        $appId = ($s.SourceAppUserModelId -or '').ToLower()
                        $source = 'System'
                        if ($appId -match 'spotify') { $source = 'Spotify' }
                        elseif ($appId -match 'chrome') { $source = 'YouTube / Chrome' }
                        elseif ($appId -match 'msedge|edge') { $source = 'Edge' }
                        elseif ($appId -match 'vlc') { $source = 'VLC' }

                        $candidate = @{
                            Success = $true
                            Title = $props.Title
                            Artist = if ($props.Artist) { $props.Artist } else { 'Desktop Audio' }
                            Source = $source
                            IsPlaying = $isPlaying
                        }

                        # Prioritize active playing session immediately
                        if ($isPlaying) {
                            return $candidate
                        }
                        if (-not $firstValid) {
                            $firstValid = $candidate
                        }
                    }
                }
            } catch {}
        }
        if ($firstValid) { return $firstValid }
    } catch {
        # Fallback
    }
    return $null
}

# Method 2: Win32 EnumWindows inspection for Spotify desktop client
function Get-SpotifyEnumMedia {
    try {
        $csharpCode = @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class SpotifyWindowProbe {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static List<string> FindTitles() {
        var results = new List<string>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                int len = GetWindowTextLength(hWnd);
                if (len > 0) {
                    var sb = new StringBuilder(len + 1);
                    GetWindowText(hWnd, sb, sb.Capacity);
                    uint pid = 0;
                    GetWindowThreadProcessId(hWnd, out pid);
                    try {
                        var p = System.Diagnostics.Process.GetProcessById((int)pid);
                        if (p.ProcessName.ToLower().Contains("spotify")) {
                            string t = sb.ToString().Trim();
                            if (!string.IsNullOrEmpty(t)) {
                                results.Add(t);
                            }
                        }
                    } catch {}
                }
            }
            return true;
        }, IntPtr.Zero);
        return results;
    }
}
'@
        Add-Type -TypeDefinition $csharpCode -ErrorAction SilentlyContinue
        $titles = [SpotifyWindowProbe]::FindTitles()
        if ($titles) {
            foreach ($t in $titles) {
                if ($t -and ($t -ne 'Spotify') -and ($t -notmatch '^Spotify (Free|Premium)')) {
                    $parts = $t -split ' - ', 2
                    if ($parts.Count -ge 2) {
                        return @{
                            Success = $true
                            Artist = $parts[0].Trim()
                            Title = $parts[1].Trim()
                            Source = 'Spotify'
                            IsPlaying = $true
                        }
                    } else {
                        return @{
                            Success = $true
                            Artist = 'Spotify'
                            Title = $t
                            Source = 'Spotify'
                            IsPlaying = $true
                        }
                    }
                }
            }
        }
    } catch {}
    return $null
}

# Method 3: Process MainWindowTitle fallback
function Get-ProcessMedia {
    try {
        $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { 
            ($_.ProcessName -match 'spotify|music|vlc|chrome|msedge') -and $_.MainWindowTitle 
        }
        foreach ($p in $procs) {
            $t = $p.MainWindowTitle.Trim()
            if ($p.ProcessName -match 'spotify') {
                if ($t -and ($t -ne 'Spotify') -and ($t -notmatch '^Spotify (Free|Premium)')) {
                    $parts = $t -split ' - ', 2
                    if ($parts.Count -ge 2) {
                        return @{
                            Success = $true
                            Artist = $parts[0].Trim()
                            Title = $parts[1].Trim()
                            Source = 'Spotify'
                            IsPlaying = $true
                        }
                    } else {
                        return @{
                            Success = $true
                            Artist = 'Spotify'
                            Title = $t
                            Source = 'Spotify'
                            IsPlaying = $true
                        }
                    }
                }
            }
        }
    } catch {}
    return $null
}

# Execute probes in order of precision
$res = Get-SMTCMedia
if (-not $res) {
    $res = Get-SpotifyEnumMedia
}
if (-not $res) {
    $res = Get-ProcessMedia
}

if ($res) {
    $json = $res | ConvertTo-Json -Compress
    Write-Output "MEDIA_JSON:$json"
} else {
    # Check if Spotify is at least open in background
    $spotProc = Get-Process -Name 'spotify' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($spotProc) {
        Write-Output "MEDIA_JSON:{`"Success`":true,`"IsPlaying`":false,`"Title`":`"Spotify Standby`",`"Artist`":`"Playback Paused - Press Play to Resume`",`"Source`":`"Spotify`"}"
    } else {
        Write-Output "MEDIA_JSON:{`"Success`":false,`"IsPlaying`":false,`"Title`":`"Media Deck Standby`",`"Artist`":`"Ready for Playback`",`"Source`":`"Desktop`"}"
    }
}
