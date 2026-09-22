param(
    [string]$Action = "get",
    [int]$Level = 50
)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int f();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }

public class AudioMaster {
    public static float GetVolume() {
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        for (int r = 0; r < 3; r++) {
            try {
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, r, out dev);
                if (dev != null) {
                    IAudioEndpointVolume epv = null;
                    System.Guid epvid = typeof(IAudioEndpointVolume).GUID;
                    dev.Activate(ref epvid, 23, 0, out epv);
                    if (epv != null) {
                        float vol = 0;
                        epv.GetMasterVolumeLevelScalar(out vol);
                        return (float)Math.Round(vol * 100);
                    }
                }
            } catch {}
        }
        return 50;
    }
    public static float SetVolume(float level) {
        if (level < 0) level = 0;
        if (level > 100) level = 100;
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        for (int r = 0; r < 3; r++) {
            try {
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, r, out dev);
                if (dev != null) {
                    IAudioEndpointVolume epv = null;
                    System.Guid epvid = typeof(IAudioEndpointVolume).GUID;
                    dev.Activate(ref epvid, 23, 0, out epv);
                    if (epv != null) {
                        epv.SetMute(false, System.Guid.Empty);
                        epv.SetMasterVolumeLevelScalar(level / 100.0f, System.Guid.Empty);
                    }
                }
            } catch {}
        }
        return (float)Math.Round(level);
    }
    public static bool GetMute() {
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        for (int r = 0; r < 3; r++) {
            try {
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, r, out dev);
                if (dev != null) {
                    IAudioEndpointVolume epv = null;
                    System.Guid epvid = typeof(IAudioEndpointVolume).GUID;
                    dev.Activate(ref epvid, 23, 0, out epv);
                    if (epv != null) {
                        bool muted = false;
                        epv.GetMute(out muted);
                        return muted;
                    }
                }
            } catch {}
        }
        return false;
    }
    public static void SetMute(bool mute) {
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        for (int r = 0; r < 3; r++) {
            try {
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, r, out dev);
                if (dev != null) {
                    IAudioEndpointVolume epv = null;
                    System.Guid epvid = typeof(IAudioEndpointVolume).GUID;
                    dev.Activate(ref epvid, 23, 0, out epv);
                    if (epv != null) {
                        epv.SetMute(mute, System.Guid.Empty);
                    }
                }
            } catch {}
        }
    }
}
'@

$curr = [AudioMaster]::GetVolume()

if ($Action -eq "get") {
    $muted = [AudioMaster]::GetMute()
    Write-Output "STATUS:${curr}:${muted}"
    Write-Output "CURRENT:$curr"
} elseif ($Action -eq "set") {
    $res = [AudioMaster]::SetVolume($Level)
    Write-Output "STATUS:${res}:False"
    Write-Output "SET:$res"
} elseif ($Action -eq "increase") {
    $target = [Math]::Min(100, $curr + $Level)
    $res = [AudioMaster]::SetVolume($target)
    Write-Output "STATUS:${res}:False"
    Write-Output "INCREASED:$res"
} elseif ($Action -eq "decrease") {
    $target = [Math]::Max(0, $curr - $Level)
    $res = [AudioMaster]::SetVolume($target)
    Write-Output "STATUS:${res}:False"
    Write-Output "DECREASED:$res"
} elseif ($Action -eq "mute") {
    [AudioMaster]::SetMute($true)
    Write-Output "STATUS:${curr}:True"
    Write-Output "MUTED:$curr"
} elseif ($Action -eq "unmute") {
    [AudioMaster]::SetMute($false)
    Write-Output "STATUS:${curr}:False"
    Write-Output "UNMUTED:$curr"
}

# Trigger Windows native desktop on-screen volume HUD (only for volume changes, not mute/get)
if ($Action -ne "mute" -and $Action -ne "unmute" -and $Action -ne "get") {
    try {
        $wshell = New-Object -ComObject WScript.Shell
        $wshell.SendKeys([char]175)
        $wshell.SendKeys([char]174)
    } catch {}
}
