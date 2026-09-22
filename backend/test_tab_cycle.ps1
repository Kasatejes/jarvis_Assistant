$code = @'
using System;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;

public class NativeTabCycle {
    [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();

    public const byte VK_MENU = 0x12;
    public const byte VK_CONTROL = 0x11;
    public const byte VK_TAB = 0x09;
    public const byte VK_KEY_W = 0x57;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    public static IntPtr Attach() {
        IntPtr h = OpenInputDesktop(0, false, 0x01FF);
        if (h != IntPtr.Zero) {
            SetThreadDesktop(h);
        }
        return h;
    }

    public static string GetTitle(IntPtr hWnd) {
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, 512);
        return sb.ToString();
    }

    public static bool Focus(IntPtr hWnd) {
        IntPtr foreHwnd = GetForegroundWindow();
        uint forePid;
        uint foreThread = GetWindowThreadProcessId(foreHwnd, out forePid);
        uint curThread = GetCurrentThreadId();

        if (foreThread != curThread && foreThread != 0) {
            AttachThreadInput(curThread, foreThread, true);
        }

        keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
        BringWindowToTop(hWnd);
        ShowWindow(hWnd, 9);
        bool res = SetForegroundWindow(hWnd);
        SwitchToThisWindow(hWnd, true);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

        if (foreThread != curThread && foreThread != 0) {
            AttachThreadInput(curThread, foreThread, false);
        }
        return res;
    }

    public static void SendCtrlTab() {
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        keybd_event(VK_TAB, 0, 0, UIntPtr.Zero);
        Thread.Sleep(50);
        keybd_event(VK_TAB, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$h = [NativeTabCycle]::Attach()
$hwnd = [IntPtr]4196174
$focused = [NativeTabCycle]::Focus($hwnd)
Write-Output "Focus result: $focused"
Start-Sleep -Milliseconds 300

for ($i = 0; $i -lt 5; $i++) {
    [NativeTabCycle]::SendCtrlTab()
    Start-Sleep -Milliseconds 250
    Write-Output ("Step $i Title: " + [NativeTabCycle]::GetTitle($hwnd))
}

if ($h -ne [IntPtr]::Zero) {
    [NativeTabCycle]::CloseDesktop($h)
}
