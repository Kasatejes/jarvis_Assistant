$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinKeyWidgets {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Trigger() {
        keybd_event(0x5B, 0, 0, UIntPtr.Zero);
        keybd_event(0x57, 0, 0, UIntPtr.Zero);
        keybd_event(0x57, 2, 0, UIntPtr.Zero);
        keybd_event(0x5B, 2, 0, UIntPtr.Zero);
    }
}
'@
try {
    Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue
} catch {}
[WinKeyWidgets]::Trigger()
Write-Output "WIDGETS_TOGGLED"
