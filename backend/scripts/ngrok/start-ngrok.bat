@echo off
echo Please paste your ngrok authtoken and press Enter:
set /p AUTHTOKEN=
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken %AUTHTOKEN%
echo.
echo Starting ngrok tunnel on port 5000...
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 5000
