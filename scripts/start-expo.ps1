# Start KindPlate Expo pointed at this PC's hotspot/LAN IP
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '10.223.208.19'
Set-Location $PSScriptRoot\..\mobile
npx expo start --lan
