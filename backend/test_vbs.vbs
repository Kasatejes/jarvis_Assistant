Set WshShell = CreateObject("WScript.Shell")
WScript.Echo "AppActivate J.A.R.V.I.S.: " & WshShell.AppActivate("J.A.R.V.I.S.")
WScript.Echo "AppActivate Chrome: " & WshShell.AppActivate("Chrome")
WScript.Echo "AppActivate PID 196904: " & WshShell.AppActivate(196904)
