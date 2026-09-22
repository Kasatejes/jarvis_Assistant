const { exec } = require('child_process');

function runPowerShell(script) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function testCloseLogic() {
  const target = 'youtube';
  const cleanName = 'youtube';
  
  const ps = `
    $wshell = New-Object -ComObject WScript.Shell
    Start-Sleep -Milliseconds 100

    # Step 1: Search all running processes with a MainWindowTitle containing the target (case-insensitive)
    $found = $false
    $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowHandle -ne 0 -and ($_.MainWindowTitle -match '${target}' -or $_.MainWindowTitle -match '${cleanName}')
    }

    foreach ($p in $procs) {
      if ($p.ProcessName -notmatch 'node|electron') {
        Write-Output "FOUND_PROCESS_TITLE:$($p.ProcessName):$($p.MainWindowTitle)"
        # Activate via PID
        $act = $wshell.AppActivate($p.Id)
        if ($act) {
          Write-Output "ACTIVATED_PID:$($p.Id)"
          $found = $true
          break
        }
      }
    }

    if (-not $found) {
      Write-Output "NO_MATCHING_WINDOW_TITLE"
    }
  `;

  const res = await runPowerShell(ps);
  console.log('PowerShell Output:');
  console.log(res.stdout);
  if (res.stderr) console.error('PowerShell Stderr:', res.stderr);
}

testCloseLogic();
