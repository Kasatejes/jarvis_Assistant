const { exec } = require('child_process');

function runPowerShell(script) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function test() {
  const ps = `
    Add-Type @"
      using System;
      using System.Text;
      using System.Runtime.InteropServices;
      using System.Collections.Generic;

      public class WinFinder {
        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        public static List<string> GetTitles() {
          List<string> titles = new List<string>();
          EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
              StringBuilder sb = new StringBuilder(256);
              GetWindowText(hWnd, sb, 256);
              string t = sb.ToString();
              if (!string.IsNullOrEmpty(t)) {
                titles.Add(t);
              }
            }
            return true;
          }, IntPtr.Zero);
          return titles;
        }
      }
"@
    [WinFinder]::GetTitles() | Out-String
  `;
  const r = await runPowerShell(ps);
  console.log('STDOUT:', r.stdout);
  console.log('STDERR:', r.stderr);
}

test();
