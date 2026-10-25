param(
    [Parameter(Mandatory=$true)][string]$PicoSdkPath,
    [Parameter(Mandatory=$true)][string]$ArmToolchainPath
)
$ErrorActionPreference = 'Stop'
$env:SOURCE_DATE_EPOCH = '1792713600'
$buildDirectory = Join-Path $PSScriptRoot 'build'
cmake -S $PSScriptRoot -B $buildDirectory -G Ninja `
    "-DPICO_SDK_PATH=$PicoSdkPath" "-DPICO_TOOLCHAIN_PATH=$ArmToolchainPath" `
    -DPICO_BOARD=pico -DCMAKE_BUILD_TYPE=Release
if ($LASTEXITCODE -ne 0) { throw 'CMake configure failed.' }
cmake --build $buildDirectory --parallel 4
if ($LASTEXITCODE -ne 0) { throw 'Firmware build failed.' }
Copy-Item (Join-Path $buildDirectory 'EE3600_Practical_2_Pico.uf2') $PSScriptRoot
Write-Host 'Built firmware. Copy the UF2 only after entering Pico BOOTSEL mode.'
