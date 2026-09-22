param(
    [Parameter(Position=0)]
    $Targets = 'youtube',
    [Parameter(Position=1)]
    [int]$CountPerTarget = 1
)

$sig = @'
using System;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class TabCloserNative {
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseDesktop(IntPtr hDesktop);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);

    public const byte VK_MENU    = 0x12;
    public const byte VK_CONTROL = 0x11;
    public const byte VK_SHIFT   = 0x10;
    public const byte VK_RETURN  = 0x0D;
    public const byte VK_ESCAPE  = 0x1B;
    public const byte VK_TAB     = 0x09;
    public const byte VK_KEY_A   = 0x41;
    public const byte VK_KEY_W   = 0x57;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    private static IntPtr _hDesktop = IntPtr.Zero;

    public static bool EnsureDesktop() {
        if (_hDesktop == IntPtr.Zero) {
            _hDesktop = OpenInputDesktop(0, false, 0x01FF);
            if (_hDesktop != IntPtr.Zero) {
                SetThreadDesktop(_hDesktop);
            }
        }
        return _hDesktop != IntPtr.Zero;
    }

    public static void ReleaseDesktop() {
        if (_hDesktop != IntPtr.Zero) {
            CloseDesktop(_hDesktop);
            _hDesktop = IntPtr.Zero;
        }
    }

    public static IntPtr[] FindAllBrowserWindows() {
        EnsureDesktop();
        var list = new List<IntPtr>();
        EnumDesktopWindows(_hDesktop, (hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                var sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string t = sb.ToString();
                if (!string.IsNullOrEmpty(t)) {
                    if (t.Contains("Google Chrome") || t.Contains("Microsoft Edge") || t.Contains("Brave")) {
                        list.Add(hWnd);
                    }
                }
            }
            return true;
        }, IntPtr.Zero);
        return list.ToArray();
    }

    public static string GetHwndTitle(IntPtr hWnd) {
        EnsureDesktop();
        if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return "";
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, 512);
        return sb.ToString();
    }

    public static void ForceForeground(IntPtr hWnd) {
        EnsureDesktop();
        if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return;

        IntPtr foreHwnd = GetForegroundWindow();
        uint forePid;
        uint foreThread = GetWindowThreadProcessId(foreHwnd, out forePid);
        uint curThread = GetCurrentThreadId();

        if (foreThread != curThread && foreThread != 0) {
            AttachThreadInput(curThread, foreThread, true);
        }

        keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
        BringWindowToTop(hWnd);
        if (IsIconic(hWnd)) {
            ShowWindow(hWnd, 9); // SW_RESTORE only if minimized, preserves maximized state
        }
        SetForegroundWindow(hWnd);
        SwitchToThisWindow(hWnd, true);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

        // Cancel any unintentional Windows menu bar activation
        keybd_event(VK_ESCAPE, 0, 0, UIntPtr.Zero);
        Thread.Sleep(20);
        keybd_event(VK_ESCAPE, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

        if (foreThread != curThread && foreThread != 0) {
            AttachThreadInput(curThread, foreThread, false);
        }
    }

    public static void SendCtrlW() {
        byte scCtrl = (byte)MapVirtualKey(VK_CONTROL, 0);
        byte scW = (byte)MapVirtualKey(VK_KEY_W, 0);

        keybd_event(VK_CONTROL, scCtrl, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_KEY_W, scW, 0, UIntPtr.Zero);
        Thread.Sleep(60);
        keybd_event(VK_KEY_W, scW, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_CONTROL, scCtrl, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendCtrlTab() {
        byte scCtrl = (byte)MapVirtualKey(VK_CONTROL, 0);
        byte scTab = (byte)MapVirtualKey(VK_TAB, 0);

        keybd_event(VK_CONTROL, scCtrl, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_TAB, scTab, 0, UIntPtr.Zero);
        Thread.Sleep(60);
        keybd_event(VK_TAB, scTab, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_CONTROL, scCtrl, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendCtrlShiftA() {
        byte scCtrl = (byte)MapVirtualKey(VK_CONTROL, 0);
        byte scShift = (byte)MapVirtualKey(VK_SHIFT, 0);
        byte scA = (byte)MapVirtualKey(VK_KEY_A, 0);

        keybd_event(VK_CONTROL, scCtrl, 0, UIntPtr.Zero);
        keybd_event(VK_SHIFT, scShift, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_KEY_A, scA, 0, UIntPtr.Zero);
        Thread.Sleep(60);
        keybd_event(VK_KEY_A, scA, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_SHIFT, scShift, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, scCtrl, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendEnter() {
        byte sc = (byte)MapVirtualKey(VK_RETURN, 0);
        keybd_event(VK_RETURN, sc, 0, UIntPtr.Zero);
        Thread.Sleep(50);
        keybd_event(VK_RETURN, sc, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendEscape() {
        byte sc = (byte)MapVirtualKey(VK_ESCAPE, 0);
        keybd_event(VK_ESCAPE, sc, 0, UIntPtr.Zero);
        Thread.Sleep(50);
        keybd_event(VK_ESCAPE, sc, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
'@

Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue

function Test-IsProtectedTab($title) {
    if ([string]::IsNullOrWhiteSpace($title)) { return $false }
    return ($title -match 'localhost|127\.0\.0\.1|J\.A\.R\.V\.I\.S|JARVIS HUD|Core System|React App|Antigravity')
}

try {
    $browserWindows = [TabCloserNative]::FindAllBrowserWindows()
    if (-not $browserWindows -or $browserWindows.Length -eq 0) {
        Write-Output "STATUS:NO_BROWSER_FOUND"
        exit
    }

    # Find any J.A.R.V.I.S window to keep safe and refocus later
    $jarvisHwnd = [IntPtr]::Zero
    $orderedWindows = @()
    foreach ($w in $browserWindows) {
        $t = [TabCloserNative]::GetHwndTitle($w)
        if (Test-IsProtectedTab $t) {
            $jarvisHwnd = $w
            $orderedWindows += $w # Put protected window at the end
        } else {
            # Prioritize non-Jarvis windows first
            $orderedWindows = @($w) + $orderedWindows
        }
    }

    $closedTotal = 0
    $wshell = New-Object -ComObject WScript.Shell

    $targetStr = ($Targets -join ' ').ToLower()
    if ($targetStr -match '\b(all|all_tabs|other|othertabs|every|tabs?)\b' -and $targetStr -notmatch 'youtube|instagram|spotify|discord|netflix|google') {
        Write-Output "CLOSING_OTHER_TABS_MODE"
        $isCloseAll = ($targetStr -match '\b(all|every)\b' -or $CountPerTarget -ge 10)
        $maxToClose = if ($isCloseAll) { 40 } else { [Math]::Max(1, $CountPerTarget) }

        foreach ($w in $orderedWindows) {
            if ($closedTotal -ge $maxToClose) { break }
            if (-not [TabCloserNative]::IsWindow($w)) { continue }

            [TabCloserNative]::ForceForeground($w)
            Start-Sleep -Milliseconds 300

            $initialTitle = [TabCloserNative]::GetHwndTitle($w)
            $isJarvisWin = (Test-IsProtectedTab $initialTitle)

            if ($isJarvisWin) {
                # Window contains J.A.R.V.I.S. Core System - must NOT close the J.A.R.V.I.S. tab!
                # Cycle tabs to find and close any non-Jarvis tabs in this window.
                $cycleChecks = 25
                $seenNonJarvis = 0
                while ($cycleChecks -gt 0 -and $closedTotal -lt $maxToClose) {
                    $cycleChecks--
                    $curTitle = [TabCloserNative]::GetHwndTitle($w)
                    if (Test-IsProtectedTab $curTitle) {
                        # Switch to next tab
                        [TabCloserNative]::SendCtrlTab()
                        Start-Sleep -Milliseconds 300
                        $nextTitle = [TabCloserNative]::GetHwndTitle($w)
                        if ($nextTitle -eq $curTitle -or (Test-IsProtectedTab $nextTitle)) {
                            # No other tabs in this window
                            break
                        }
                    } else {
                        # Close non-Jarvis tab
                        [TabCloserNative]::SendCtrlW()
                        $closedTotal++
                        $seenNonJarvis++
                        Write-Output "CLOSED_TAB:other (Closed: $curTitle)"
                        Start-Sleep -Milliseconds 350
                        if (-not [TabCloserNative]::IsWindow($w)) { break }
                    }
                }
            } else {
                # Normal browser window (e.g. user browsing tabs) - close tabs
                $winChecks = 35
                while ($winChecks -gt 0 -and $closedTotal -lt $maxToClose -and [TabCloserNative]::IsWindow($w)) {
                    $winChecks--
                    $curTitle = [TabCloserNative]::GetHwndTitle($w)
                    if ([string]::IsNullOrWhiteSpace($curTitle)) { break }
                    if (Test-IsProtectedTab $curTitle) {
                        # Safety check: do not close if title matches J.A.R.V.I.S
                        break
                    }
                    [TabCloserNative]::SendCtrlW()
                    $closedTotal++
                    Write-Output "CLOSED_TAB:other (Closed: $curTitle)"
                    Start-Sleep -Milliseconds 350

                    if (-not [TabCloserNative]::IsWindow($w)) {
                        # Window closed because all its tabs were closed
                        break
                    }
                    if (-not $isCloseAll -and $closedTotal -ge $maxToClose) {
                        break
                    }
                }
            }
        }

        # Refocus J.A.R.V.I.S Core System if present
        if ($jarvisHwnd -ne [IntPtr]::Zero -and [TabCloserNative]::IsWindow($jarvisHwnd)) {
            [TabCloserNative]::ForceForeground($jarvisHwnd)
        }
        Write-Output "TOTAL_CLOSED:$closedTotal"
        exit
    }

    # Target-specific Tab Closing (e.g. "youtube", "spotify")
    $targetList = @()
    if ($Targets -is [array]) {
        $targetList = $Targets
    } elseif ($Targets -is [string]) {
        $targetList = $Targets -split '[,;|\s]+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    }

    foreach ($rawTarget in $targetList) {
        $target = ($rawTarget -replace '[^a-zA-Z0-9\s.-]', '').Trim()
        $target = ($target -replace '\b(jarvis|jervis|jarviss|travis|javis|jarviz|please|sir)\b', '').Trim()
        if ([string]::IsNullOrWhiteSpace($target)) { continue }

        $targetClean = $target.ToLower() -replace '[^a-z0-9]', ''
        if ($targetClean -match '^(localhost|127001|jarvis|coresystem|hud|reactapp|system)$') {
            Write-Output "PROTECTED_TARGET:$target"
            continue
        }

        for ($i = 0; $i -lt $CountPerTarget; $i++) {
            $targetWords = $target.ToLower() -split '\s+' | Where-Object { $_.Length -ge 3 }
            $targetCleanLower = $target.ToLower() -replace '[^a-z0-9]', ''

            $Script:TitleMatchesTarget = {
                param($t)
                if ([string]::IsNullOrWhiteSpace($t)) { return $false }
                if (Test-IsProtectedTab $t) { return $false }
                $tl = $t.ToLower()
                foreach ($w in $targetWords) {
                    if ($tl -like "*$w*") { return $true }
                }
                if ($targetCleanLower.Length -ge 3 -and $tl -like "*$targetCleanLower*") { return $true }
                return $false
            }

            $targetFound = $false

            foreach ($bHwnd in $orderedWindows) {
                if (-not [TabCloserNative]::IsWindow($bHwnd)) { continue }
                [TabCloserNative]::ForceForeground($bHwnd)
                Start-Sleep -Milliseconds 250

                # Check active tab first
                $curTitle = [TabCloserNative]::GetHwndTitle($bHwnd)
                if (& $Script:TitleMatchesTarget $curTitle) {
                    [TabCloserNative]::SendCtrlW()
                    $closedTotal++
                    Write-Output "CLOSED_TAB:$target (Closed: $curTitle)"
                    $targetFound = $true
                    Start-Sleep -Milliseconds 350
                    break
                }

                # Tab cycling search via Ctrl+Tab
                $startTitle = $curTitle
                $seen = @($startTitle)
                $maxCycles = 25

                for ($cycle = 0; $cycle -lt $maxCycles; $cycle++) {
                    [TabCloserNative]::SendCtrlTab()
                    Start-Sleep -Milliseconds 200
                    $activeTitle = [TabCloserNative]::GetHwndTitle($bHwnd)

                    if (& $Script:TitleMatchesTarget $activeTitle) {
                        [TabCloserNative]::SendCtrlW()
                        $closedTotal++
                        Write-Output "CLOSED_TAB:$target (Closed: $activeTitle)"
                        $targetFound = $true
                        Start-Sleep -Milliseconds 350
                        break
                    }

                    if ($activeTitle -eq $startTitle -and $cycle -gt 0) { break }
                    if ($seen.Count -gt 1 -and $activeTitle -eq $seen[0]) { break }
                    $seen += $activeTitle
                }

                if ($targetFound) { break }

                # Fallback via Chromium Tab Search (Ctrl+Shift+A)
                Write-Output "FALLBACK_TAB_SEARCH:$target"
                [TabCloserNative]::SendCtrlShiftA()
                Start-Sleep -Milliseconds 450
                $wshell.SendKeys($target)
                Start-Sleep -Milliseconds 550
                [TabCloserNative]::SendEnter()
                Start-Sleep -Milliseconds 550

                $titleAfter = [TabCloserNative]::GetHwndTitle($bHwnd)
                if (& $Script:TitleMatchesTarget $titleAfter) {
                    [TabCloserNative]::SendCtrlW()
                    $closedTotal++
                    Write-Output "CLOSED_TAB:$target (Closed: $titleAfter)"
                    $targetFound = $true
                    Start-Sleep -Milliseconds 350
                    break
                } else {
                    [TabCloserNative]::SendEscape()
                    Start-Sleep -Milliseconds 100
                }
            }

            if (-not $targetFound) {
                Write-Output "TAB_NOT_FOUND:$target"
                break
            }
        }
    }

    if ($jarvisHwnd -ne [IntPtr]::Zero -and [TabCloserNative]::IsWindow($jarvisHwnd)) {
        [TabCloserNative]::ForceForeground($jarvisHwnd)
    }
    Write-Output "TOTAL_CLOSED:$closedTotal"
}
finally {
    [TabCloserNative]::ReleaseDesktop()
}
