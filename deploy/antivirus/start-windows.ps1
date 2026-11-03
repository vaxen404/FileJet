[CmdletBinding()]
param(
    [string]$ClamAvDirectory = (Join-Path $env:LOCALAPPDATA 'FileJet/Antivirus/clamav'),
    [string]$RuntimeDirectory = (Join-Path $env:LOCALAPPDATA 'FileJet/Antivirus/runtime'),
    [int]$Port = 3310
)
$ErrorActionPreference = 'Stop'
$clamExecutable = Join-Path $ClamAvDirectory 'clamd.exe'
$freshExecutable = Join-Path $ClamAvDirectory 'freshclam.exe'
if (-not (Test-Path -LiteralPath $clamExecutable) -or -not (Test-Path -LiteralPath $freshExecutable)) {
    throw 'Install the official ClamAV Windows ZIP and pass its directory with -ClamAvDirectory. See deploy/antivirus/README.md.'
}
New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null
$databaseDirectory = Join-Path $RuntimeDirectory 'database'
New-Item -ItemType Directory -Path $databaseDirectory -Force | Out-Null
$databaseSetting = $databaseDirectory.Replace('\', '/')
$clamConfigPath = Join-Path $RuntimeDirectory 'clamd.conf'
$freshConfigPath = Join-Path $RuntimeDirectory 'freshclam.conf'
@"
DatabaseDirectory "$databaseSetting"
DatabaseMirror database.clamav.net
Checks 12
ConnectTimeout 20
ReceiveTimeout 120
LogTime yes
"@ | Set-Content -LiteralPath $freshConfigPath -Encoding utf8
@"
Foreground yes
DatabaseDirectory "$databaseSetting"
TCPSocket $Port
TCPAddr 127.0.0.1
MaxThreads 2
MaxQueue 16
StreamMaxLength 1024M
MaxFileSize 1024M
MaxScanSize 1536M
MaxRecursion 16
MaxFiles 10000
MaxScanTime 120000
ReadTimeout 180
AlertExceedsMax yes
AlertEncrypted yes
SelfCheck 600
LogTime yes
"@ | Set-Content -LiteralPath $clamConfigPath -Encoding utf8
& $freshExecutable "--config-file=$freshConfigPath" --quiet
if ($LASTEXITCODE -ne 0) { throw 'ClamAV signature update failed. The antivirus service was not started.' }
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Port $Port is already in use. Check the existing antivirus service before starting another." }
Start-Process -FilePath $clamExecutable -ArgumentList "--config-file=`"$clamConfigPath`"" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $RuntimeDirectory 'clamd-output.log') -RedirectStandardError (Join-Path $RuntimeDirectory 'clamd-error.log')
Start-Process -FilePath $freshExecutable -ArgumentList "--config-file=`"$freshConfigPath`" --daemon --quiet" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $RuntimeDirectory 'freshclam-output.log') -RedirectStandardError (Join-Path $RuntimeDirectory 'freshclam-error.log')
Write-Output "ClamAV starting on 127.0.0.1:$Port. Runtime and logs: $RuntimeDirectory"
