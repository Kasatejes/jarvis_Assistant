const { exec } = require('child_process');

function runPowerShell(script) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function main() {
  const ps = `
    $shell = New-Object -ComObject Shell.Application
    $count = 0
    foreach ($w in $shell.Windows()) {
      $count++
      Write-Output "EXPLORER WINDOW: Name=$($w.LocationName), URL=$($w.LocationURL), FullName=$($w.FullName)"
    }
    Write-Output "Total Explorer Windows: $count"

    Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object {
      Write-Output "APP: Name=$($_.ProcessName), Title=$($_.MainWindowTitle), Id=$($_.Id)"
    }
  `;
  const res = await runPowerShell(ps);
  console.log(res.stdout);
  if (res.stderr) console.error('ERR:', res.stderr);
}

main();
