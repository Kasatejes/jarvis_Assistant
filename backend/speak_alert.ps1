param(
  [string]$Title = "Reminder",
  [string]$TimeStr = ""
)

try {
  [console]::beep(880, 180)
  [console]::beep(1320, 260)
} catch {}

try {
  Add-Type -AssemblyName System.Speech
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Rate = 0
  $text = "Sir, scheduled reminder: $Title."
  if ($TimeStr) {
    $text = "$text Scheduled for $TimeStr."
  }
  $synth.Speak($text)
} catch {
  Write-Warning $_.Exception.Message
}

try {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show("Reminder: $Title`nScheduled for: $TimeStr", "J.A.R.V.I.S. Reminder Alert", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
} catch {}
