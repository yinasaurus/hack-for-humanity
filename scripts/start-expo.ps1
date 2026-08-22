# Start Buddi Expo on LAN (set your PC IP below)
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '10.223.208.19'
Set-Location $PSScriptRoot\..\mobile
npx expo start --lan
