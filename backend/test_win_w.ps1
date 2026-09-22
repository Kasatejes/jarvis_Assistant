$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinKey {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void OpenWidgets() {
        keybd_event(0x5B, 0, 0, UIntPtr.Zero); // Win down
        keybd_event(0x57, 0, 0, UIntPtr.Zero); // W down
        keybd_event(0x57, 0, 2, UIntPtr.Zero); // W up
        keybd_event(0x5B, 0, 2, UIntPtr.Zero); // Win up
    }
}
'@
Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue
[WinKey]::OpenWidgets()
Write-Output 'TRIGGERED_WIN_W'
