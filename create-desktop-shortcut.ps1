$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "ClipForge AI.lnk"

$BaseDir = "d:\clipping"
$BatPath = Join-Path -Path $BaseDir -ChildPath "launch-desktop.bat"
$VbsPath = Join-Path -Path $BaseDir -ChildPath "silent-runner.vbs"
$IconPath = Join-Path -Path $BaseDir -ChildPath "app_icon.ico"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
# Run via wscript silent runner to avoid CMD console popup
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$VbsPath`" `"$BatPath`""
$Shortcut.WorkingDirectory = $BaseDir
$Shortcut.Description = "Launch ClipForge AI Video Repurposing Studio"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
}
$Shortcut.Save()

Write-Output "[v] Desktop shortcut successfully created at: $ShortcutPath"
