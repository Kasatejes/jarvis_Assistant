Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$chromeProc = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
if (-not $chromeProc) {
    # If MainWindowTitle is empty on processes, find window via EnumWindows
    Write-Output "Finding Chrome via EnumWindows..."
}

$root = [System.Windows.Automation.AutomationElement]::RootElement
$chromeCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, "Chrome_WidgetWin_1")
$windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $chromeCondition)

Write-Output "Found Chrome windows: $($windows.Count)"
foreach ($w in $windows) {
    Write-Output "Window: $($w.Current.Name)"
    # Search for TabItem controls
    $tabCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
    $tabs = $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabCondition)
    Write-Output "  Tabs found: $($tabs.Count)"
    foreach ($tab in $tabs) {
        Write-Output "    Tab Name: $($tab.Current.Name)"
    }
}
