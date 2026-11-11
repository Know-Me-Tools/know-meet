# Gate 16.1 window-state stager for the Tauri spike shell on Windows (WebView2).
# Windows counterpart of window-stage.swift; prints one JSON sample per second with the same fields,
# so summarize-window-states.ts can judge state compliance.
#
#   pwsh -File gates/scripts/window-stage.ps1 -Mode focused|unfocused|occluded|minimised -Owner km-spike-own-gate
#
#   focused    SetForegroundWindow(target) whenever another window is in the foreground;
#   unfocused  a small form of this script holds the foreground, placed so it does not overlap the target;
#              if anything covers the target it is brought to the top and focus is handed back;
#   occluded   a TopMost opaque form covering the target plus a 60 px margin holds the foreground;
#   minimised  ShowWindow(target, SW_MINIMIZE), re-applied if the window is restored.
param(
  [Parameter(Mandatory = $true)][ValidateSet('focused', 'unfocused', 'occluded', 'minimised')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$Owner
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class KmWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int value, int size);
  public static bool Cloaked(IntPtr h) { int v; return DwmGetWindowAttribute(h, 14, out v, 4) == 0 && v != 0; }
}
'@

function Get-Target {
  $p = Get-Process -Name $Owner -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
  if ($null -eq $p) { return $null }
  return @{ Pid = $p.Id; Hwnd = $p.MainWindowHandle }
}

function Get-Rect([IntPtr]$h) {
  $r = New-Object KmWin+RECT
  [void][KmWin]::GetWindowRect($h, [ref]$r)
  return [System.Drawing.Rectangle]::FromLTRB($r.Left, $r.Top, $r.Right, $r.Bottom)
}

function Get-ProcName([IntPtr]$h) {
  $procId = [uint32]0
  [void][KmWin]::GetWindowThreadProcessId($h, [ref]$procId)
  try { return (Get-Process -Id $procId).ProcessName } catch { return '?' }
}

# Fraction of the target rect covered by visible, uncloaked, non-minimised windows above it (40 x 24 grid).
function Get-Coverage([IntPtr]$target, [System.Drawing.Rectangle]$rect, [ref]$owners) {
  $above = @()
  $h = [KmWin]::GetWindow($target, 3) # GW_HWNDPREV: next window above in z-order
  while ($h -ne [IntPtr]::Zero) {
    if ([KmWin]::IsWindowVisible($h) -and -not [KmWin]::IsIconic($h) -and -not [KmWin]::Cloaked($h)) {
      $r = Get-Rect $h
      if ($r.Width -gt 20 -and $r.Height -gt 20 -and $r.IntersectsWith($rect)) { $above += , @($r, (Get-ProcName $h)) }
    }
    $h = [KmWin]::GetWindow($h, 3)
  }
  $owners.Value = @($above | ForEach-Object { $_[1] } | Sort-Object -Unique)
  $covered = 0
  for ($i = 0; $i -lt 40; $i++) {
    for ($j = 0; $j -lt 24; $j++) {
      $pt = New-Object System.Drawing.Point ([int]($rect.Left + ($i + 0.5) * $rect.Width / 40)), ([int]($rect.Top + ($j + 0.5) * $rect.Height / 24))
      if ($above | Where-Object { $_[0].Contains($pt) }) { $covered++ }
    }
  }
  return [math]::Round($covered / 960, 3)
}

function New-HelperForm([System.Drawing.Rectangle]$bounds, [bool]$topMost, [string]$title) {
  $f = New-Object System.Windows.Forms.Form
  $f.Text = $title
  $f.StartPosition = 'Manual'
  $f.Bounds = $bounds
  $f.TopMost = $topMost
  $f.BackColor = [System.Drawing.Color]::Gainsboro
  $f.Show()
  return $f
}

$form = $null
while ($true) {
  $actions = @()
  $t = Get-Target
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if ($null -eq $t) {
    Write-Output (@{ t = $now; event = 'waiting-for-target' } | ConvertTo-Json -Compress)
  } else {
    $rect = Get-Rect $t.Hwnd
    switch ($Mode) {
      'focused' {
        if ([KmWin]::GetForegroundWindow() -ne $t.Hwnd) { $actions += "activate-target:$([KmWin]::SetForegroundWindow($t.Hwnd))" }
      }
      'occluded' {
        if ($null -eq $form) { $form = New-HelperForm ([System.Drawing.Rectangle]::Inflate($rect, 60, 60)) $true 'gate 16.1 occluder' }
        if ([KmWin]::GetForegroundWindow() -ne $form.Handle) { $form.Activate(); $actions += 'activate-helper' }
      }
      'unfocused' {
        if ($null -eq $form) {
          $screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
          $spots = @((New-Object System.Drawing.Rectangle ($screen.Left + 8), ($screen.Bottom - 128), 240, 120),
            (New-Object System.Drawing.Rectangle ($screen.Right - 248), ($screen.Bottom - 128), 240, 120))
          $spot = ($spots | Where-Object { -not $_.IntersectsWith($rect) } | Select-Object -First 1)
          if ($null -eq $spot) { $spot = $spots[0] }
          $form = New-HelperForm $spot $false 'gate 16.1 focus holder'
        }
        $o = @()
        if ((Get-Coverage $t.Hwnd $rect ([ref]$o)) -gt 0) { $actions += "repair-raise:$([KmWin]::BringWindowToTop($t.Hwnd))" }
        if ([KmWin]::GetForegroundWindow() -ne $form.Handle) { $form.Activate(); $actions += 'activate-helper' }
      }
      'minimised' {
        if (-not [KmWin]::IsIconic($t.Hwnd)) { $actions += "minimise:$([KmWin]::ShowWindow($t.Hwnd, 6))" }
      }
    }
    [System.Windows.Forms.Application]::DoEvents()
    $fg = [KmWin]::GetForegroundWindow()
    $owners = @()
    $cov = Get-Coverage $t.Hwnd $rect ([ref]$owners)
    $rec = [ordered]@{
      t = $now; mode = $Mode; frontmost = (Get-ProcName $fg); frontmostIsTarget = ($fg -eq $t.Hwnd)
      targetOnScreen = ([KmWin]::IsWindowVisible($t.Hwnd) -and -not [KmWin]::IsIconic($t.Hwnd)); targetHidden = $false
      targetRect = @($rect.Left, $rect.Top, $rect.Width, $rect.Height); coverage = $cov; coveredBy = $owners; actions = $actions
    }
    if ($Mode -eq 'minimised') { $rec.method = 'win32-minimised' }
    Write-Output ($rec | ConvertTo-Json -Compress)
  }
  for ($k = 0; $k -lt 10; $k++) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 100 }
}
