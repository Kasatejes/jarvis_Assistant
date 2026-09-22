$code = @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class AllWindowFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static List<string> GetAllWindows() {
        var results = new List<string>();
        EnumWindows((hWnd, lParam) => {
            int length = GetWindowTextLength(hWnd);
            if (length > 0) {
                var builder = new StringBuilder(length + 1);
                GetWindowText(hWnd, builder, builder.Capacity);
                uint pid = 0;
                GetWindowThreadProcessId(hWnd, out pid);
                string procName = "unknown";
                try {
                    procName = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
                } catch {}
                string title = builder.ToString();
                if (!string.IsNullOrWhiteSpace(title) && title.Length > 2) {
                    results.Add(procName + " ::: " + title);
                }
            }
            return true;
        }, IntPtr.Zero);
        return results;
    }
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$windows = [AllWindowFinder]::GetAllWindows()
foreach ($w in $windows) {
    if ($w -match 'spot|atlantis|seafret|music|chrome|edge') {
        Write-Output "WIN: $w"
    }
}
Write-Output "TOTAL: $($windows.Count)"
