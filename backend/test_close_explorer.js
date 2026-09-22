const { exec } = require('child_process');

function runPowerShell(script) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function testCloseExplorer() {
  console.log('Testing File Explorer closing via Shell.Application COM...');
  const ps = `
    $shell = New-Object -ComObject Shell.Application
    $closed = 0
    foreach ($w in @($shell.Windows())) {
      try {
        if ($w.FullName -match 'explorer\\.exe') {
          Write-Output "Closing Explorer window: $($w.LocationName)"
          $w.Quit()
          $closed++
        }
      } catch {
        Write-Output "Error closing window: $_"
      }
    }
    Write-Output "CLOSED_TOTAL: $closed"
  `;
  const res = await runPowerShell(ps);
  console.log(res.stdout);
}

testCloseExplorer();
