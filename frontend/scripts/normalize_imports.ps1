# Script para normalizar imports en Villa Luz
# Elimina extensiones .ts y .tsx de las sentencias de importación

$srcPath = "src"

Get-ChildItem -Path $srcPath -Filter "*.tsx" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Regex para buscar imports/exports con .ts o .tsx
    $newContent = $content -replace "from\s+(['\""])(.*?)\.tsx?(['\""])", "from `$1`$2`$3"
    $newContent = $newContent -replace "import\((['\""])(.*?)\.tsx?(['\""])", "import(`$1`$2`$3"
    
    if ($content -ne $newContent) {
        Write-Host "Normalizando: $($_.FullName)"
        Set-Content $_.FullName $newContent -NoNewline
    }
}

Get-ChildItem -Path $srcPath -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $newContent = $content -replace "from\s+(['\""])(.*?)\.tsx?(['\""])", "from `$1`$2`$3"
    $newContent = $newContent -replace "import\((['\""])(.*?)\.tsx?(['\""])", "import(`$1`$2`$3"
    
    if ($content -ne $newContent) {
        Write-Host "Normalizando: $($_.FullName)"
        Set-Content $_.FullName $newContent -NoNewline
    }
}
