$code = @'
using System;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;

public class TabCheck {
    [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public const byte VK_CONTROL = 0x11;
    public const byte VK_TAB     = 0x09;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    public static string GetTitle(IntPtr hWnd) {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        SetThreadDesktop(hDesk);
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, 512);
        CloseDesktop(hDesk);
        return sb.ToString();
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

$hwnd = [IntPtr]4196174
[TabCheck]::BringWindowToTop($hwnd)
[TabCheck]::ShowWindow($hwnd, 9)
[TabCheck]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 300

Write-Output ("Initial: " + [TabCheck]::GetTitle($hwnd))
for ($i = 0; $i -lt 5; $i++) {
    [TabCheck]::SendCtrlTab()
    Start-Sleep -Milliseconds 250
    Write-Output ("After Ctrl+Tab " + $i + ": " + [TabCheck]::GetTitle($hwnd))
}
