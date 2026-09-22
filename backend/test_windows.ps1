$code = @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinProc {
    [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static void ListDetails() {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        SetThreadDesktop(hDesk);
        EnumDesktopWindows(hDesk, (hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                var sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string t = sb.ToString();
                if (!string.IsNullOrWhiteSpace(t)) {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    try {
                        var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                        Console.WriteLine("HWND: " + hWnd + " | PROC: " + proc.ProcessName + " | TITLE: " + t);
                    } catch {
                        Console.WriteLine("HWND: " + hWnd + " | PID: " + pid + " | TITLE: " + t);
                    }
                }
            }
            return true;
        }, IntPtr.Zero);
        CloseDesktop(hDesk);
    }
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
[WinProc]::ListDetails()
