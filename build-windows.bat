@echo off
echo Building Model Judge MVP and copying to Desktop...
wsl -e bash -c "cd /home/user/Browser-plugin && npm run build:windows"
pause
