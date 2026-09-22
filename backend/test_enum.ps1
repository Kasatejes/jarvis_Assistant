$code = @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WindowFinder {
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

    public static List<string> GetSpotifyWindows() {
        var results = new List<string>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                int length = GetWindowTextLength(hWnd);
                if (length > 0) {
                    var builder = new StringBuilder(length + 1);
                    GetWindowText(hWnd, builder, builder.Capacity);
                    uint pid = 0;
                    GetWindowThreadProcessId(hWnd, out pid);
                    try {
                        var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                        if (proc.ProcessName.ToLower().Contains("spotify")) {
                            results.Add(builder.ToString());
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

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$titles = [WindowFinder]::GetSpotifyWindows()
foreach ($t in $titles) {
    Write-Output "FOUND_TITLE: '$t'"
}
if (-not $titles) {
    Write-Output "NO_WINDOW_FOUND"
}
