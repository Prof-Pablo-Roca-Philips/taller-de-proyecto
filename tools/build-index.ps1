<#
.SYNOPSIS
    Ensambla index.html desde los fragmentos por carpeta.

.DESCRIPTION
    index.html es un ARTEFACTO GENERADO. No se edita a mano.

    Cada pieza del trayecto vive junto a su contenido:
        unidades/{slug}/card.html + card.json
        capsulas/{slug}/card.html + card.json
        contenido/separadores/{slug}/card.html + card.json

    Un carril toca UNICAMENTE su propia carpeta, asi que N sesiones en paralelo
    nunca chocan en el mismo archivo. El orden lo fija el campo `orden` de cada
    card.json (multiplos de 10, para poder intercalar sin renumerar).

.PARAMETER Action
    build     Regenera index.html (por defecto).
    verificar Compara lo que se generaria contra el index.html actual. Exit 1 si difieren.
    listar    Muestra el trayecto ordenado sin escribir nada.
#>
param(
    [ValidateSet('build', 'verificar', 'listar')]
    [string]$Action = 'build'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$IndexFile = Join-Path $RepoRoot 'index.html'
$TemplateFile = Join-Path $RepoRoot 'contenido/index.template.html'

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Get-Cards {
    $globs = @(
        (Join-Path $RepoRoot 'unidades/*/card.json'),
        (Join-Path $RepoRoot 'capsulas/*/card.json'),
        (Join-Path $RepoRoot 'contenido/separadores/*/card.json')
    )

    $cards = @()
    foreach ($glob in $globs) {
        foreach ($meta in @(Get-ChildItem -Path $glob -File -ErrorAction SilentlyContinue)) {
            $dir = $meta.DirectoryName
            $html = Join-Path $dir 'card.html'
            if (-not (Test-Path $html)) {
                throw "Falta card.html junto a $($meta.FullName)"
            }

            $data = Read-Text -Path $meta.FullName | ConvertFrom-Json
            $visible = $true
            if ($null -ne $data.PSObject.Properties['visible']) { $visible = [bool]$data.visible }
            if (-not $visible) { continue }

            $cards += [pscustomobject]@{
                orden = [int]$data.orden
                tipo = [string]$data.tipo
                slug = [string]$data.slug
                titulo = [string]$data.titulo
                html = (Read-Text -Path $html).TrimEnd("`n")
                origen = $dir.Substring($RepoRoot.Length).TrimStart('\', '/')
            }
        }
    }

    if ($cards.Count -eq 0) { throw 'No se encontro ninguna card. Revisar contenido/ y unidades/.' }

    # Dos carriles que eligen el mismo `orden` producirian un trayecto ambiguo:
    # es un choque de contenido, no de git, y hay que verlo aca y no en produccion.
    $dup = @($cards | Group-Object orden | Where-Object { $_.Count -gt 1 })
    if ($dup.Count -gt 0) {
        $detalle = ($dup | ForEach-Object {
            "orden {0}: {1}" -f $_.Name, (($_.Group | ForEach-Object { $_.origen }) -join ' + ')
        }) -join "; "
        throw "Colision de orden entre cards -> $detalle"
    }

    return @($cards | Sort-Object orden)
}

function Build-Index {
    if (-not (Test-Path $TemplateFile)) { throw "Falta la plantilla: $TemplateFile" }

    $cards = @(Get-Cards)
    $track = (($cards | ForEach-Object { $_.html }) -join "`n`n")

    $out = Read-Text -Path $TemplateFile
    $out = $out.Replace('@@TRACK@@', $track)
    $out = $out.Replace('@@N_UNIDADES@@', [string]@($cards | Where-Object { $_.tipo -eq 'unidad' }).Count)
    $out = $out.Replace('@@N_CAPSULAS@@', [string]@($cards | Where-Object { $_.tipo -eq 'capsula' }).Count)

    return $out
}

switch ($Action) {
    'listar' {
        foreach ($card in @(Get-Cards)) {
            "{0,5}  {1,-10} {2}" -f $card.orden, $card.tipo, $card.titulo
        }
        break
    }

    'verificar' {
        $generado = Build-Index
        $actual = if (Test-Path $IndexFile) { Read-Text -Path $IndexFile } else { '' }

        if ($generado -ceq $actual) {
            Write-Host 'OK: index.html coincide byte a byte con lo que generan los fragmentos.'
            exit 0
        }

        Write-Host 'DIFERENCIA: index.html no coincide con los fragmentos.'
        Write-Host ("  generado: {0} chars / actual: {1} chars" -f $generado.Length, $actual.Length)
        exit 1
    }

    'build' {
        $generado = Build-Index
        [System.IO.File]::WriteAllText($IndexFile, $generado, $Utf8NoBom)
        $cards = @(Get-Cards)
        Write-Host ("index.html generado: {0} piezas ({1} unidades, {2} capsulas, {3} separadores)." -f `
            $cards.Count, `
            @($cards | Where-Object { $_.tipo -eq 'unidad' }).Count, `
            @($cards | Where-Object { $_.tipo -eq 'capsula' }).Count, `
            @($cards | Where-Object { $_.tipo -eq 'separador' }).Count)
        break
    }
}
