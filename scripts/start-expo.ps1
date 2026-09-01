# Start Buddi Expo on LAN.
# Set REACT_NATIVE_PACKAGER_HOSTNAME to your PC's Wi-Fi IPv4 before starting
# (ipconfig → Wireless LAN adapter → IPv4 Address), or leave unset to use Expo defaults.
# Example: $env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.1.20'
Set-Location $PSScriptRoot\..\mobile
npx expo start --lan
