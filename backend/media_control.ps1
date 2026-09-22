param(
    [string]$Action = "playpause"
)

$ErrorActionPreference = 'SilentlyContinue'
$cmd = $Action.ToLower().Trim()

# Strategy 1: Direct Windows WinRT SMTC session controls (Chrome, Spotify, Edge, VLC)
$smtcSuccess = $false
try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $t = 0
    while ($asyncOp.Status -eq 'Started' -and $t -lt 20) {
        Start-Sleep -Milliseconds 15
        $t++
    }
    if ($asyncOp.Status -eq 'Completed') {
        $mgr = $asyncOp.GetResults()
        if ($mgr) {
            $sess = $mgr.GetCurrentSession()
            if (-not $sess) {
                $all = $mgr.GetSessions()
                if ($all -and $all.Count -gt 0) {
                    $sess = $all[0]
                }
            }
            if ($sess) {
                $actionOp = $null
                switch ($cmd) {
                    "next" {
                        $actionOp = $sess.TrySkipNextAsync()
                    }
                    "prev" {
                        $actionOp = $sess.TrySkipPreviousAsync()
                    }
                    "previous" {
                        $actionOp = $sess.TrySkipPreviousAsync()
                    }
                    "stop" {
                        $actionOp = $sess.TryStopAsync()
                    }
                    default {
                        $actionOp = $sess.TryTogglePlayPauseAsync()
                    }
                }
                if ($actionOp) {
                    $w = 0
                    while ($actionOp.Status -eq 'Started' -and $w -lt 20) {
                        Start-Sleep -Milliseconds 15
                        $w++
                    }
                    if ($actionOp.Status -eq 'Completed' -and $actionOp.GetResults()) {
                        $smtcSuccess = $true
                        Write-Output "TRIGGERED_SMTC_$($cmd.ToUpper())"
                    }
                }
            }
        }
    }
} catch {}

# If SMTC succeeded, exit early without triggering redundant keyboard event
if ($smtcSuccess) {
    exit 0
}

# Strategy 2: Native Win32 Keybd_Event with KEYEVENTF_EXTENDEDKEY (Fallback if SMTC session is unavailable)
$signature = @'
using System;
using System.Runtime.InteropServices;

public class MediaKeySimulator {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public const byte VK_MEDIA_NEXT_TRACK = 0xB0; // 176
    public const byte VK_MEDIA_PREV_TRACK = 0xB1; // 177
    public const byte VK_MEDIA_STOP       = 0xB2; // 178
    public const byte VK_MEDIA_PLAY_PAUSE  = 0xB3; // 179

    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const uint KEYEVENTF_KEYUP       = 0x0002;

    public static void Trigger(byte vk) {
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
        System.Threading.Thread.Sleep(20);
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
'@

try {
    Add-Type -TypeDefinition $signature -ErrorAction SilentlyContinue
} catch {}

switch ($cmd) {
    "next" {
        [MediaKeySimulator]::Trigger([MediaKeySimulator]::VK_MEDIA_NEXT_TRACK)
        Write-Output "TRIGGERED_NEXT"
    }
    "prev" {
        [MediaKeySimulator]::Trigger([MediaKeySimulator]::VK_MEDIA_PREV_TRACK)
        Write-Output "TRIGGERED_PREV"
    }
    "previous" {
        [MediaKeySimulator]::Trigger([MediaKeySimulator]::VK_MEDIA_PREV_TRACK)
        Write-Output "TRIGGERED_PREV"
    }
    "stop" {
        [MediaKeySimulator]::Trigger([MediaKeySimulator]::VK_MEDIA_STOP)
        Write-Output "TRIGGERED_STOP"
    }
    default {
        [MediaKeySimulator]::Trigger([MediaKeySimulator]::VK_MEDIA_PLAY_PAUSE)
        Write-Output "TRIGGERED_PLAYPAUSE"
    }
}
