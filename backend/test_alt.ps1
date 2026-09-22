$code = @'
using System;
using System.Runtime.InteropServices;

public class TestAltFocus {
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();

    public static bool Focus(IntPtr hWnd) {
        ShowWindow(hWnd, 9); // SW_RESTORE
        keybd_event(0x12, 0, 0, UIntPtr.Zero); // ALT down
        bool res = SetForegroundWindow(hWnd);
        keybd_event(0x12, 0, 2, UIntPtr.Zero); // ALT up
        return res;
    }
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$hwnd = [IntPtr]196904
$res = [TestAltFocus]::Focus($hwnd)
Write-Output "Focus result: $res"
Write-Output "Current foreground: $([TestAltFocus]::GetForegroundWindow())"
