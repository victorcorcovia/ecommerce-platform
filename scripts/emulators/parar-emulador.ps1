$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sinal = Join-Path $raiz "backups\encerrar-emulador.sinal"

if (Test-Path $sinal) {
    throw "Ja existe uma solicitacao de encerramento."
}

"encerrar" | Set-Content -Path $sinal -Encoding UTF8

Write-Host "Solicitacao de encerramento registrada."
