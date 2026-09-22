$code = @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinScanAll {
    [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static void Scan() {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        SetThreadDesktop(hDesk);
        EnumDesktopWindows(hDesk, (hWnd, lParam) => {
            var sb = new StringBuilder(512);
            GetWindowText(hWnd, sb, 512);
            string t = sb.ToString();
            if (t.ToLower().Contains("youtube") || t.ToLower().Contains("chrome") || t.ToLower().Contains("edge")) {
                Console.WriteLine("FOUND TOP: " + hWnd + " -> " + t);
            }
            // Check child windows
            EnumChildWindows(hWnd, (childHwnd, childParam) => {
                var csb = new StringBuilder(512);
                GetWindowText(childHwnd, csb, 512);
                string ct = csb.ToString();
                if (ct.ToLower().Contains("youtube")) {
                    Console.WriteLine("FOUND CHILD: " + childHwnd + " -> " + ct);
                }
                return true;
            }, IntPtr.Zero);
            return true;
        }, IntPtr.Zero);
        CloseDesktop(hDesk);
    }
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
[WinScanAll]::Scan()
