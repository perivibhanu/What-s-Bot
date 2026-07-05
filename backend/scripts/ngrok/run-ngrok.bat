@echo off
echo ========================================
echo   NGROK SETUP FOR WHATSAPP AUTOMATION
echo ========================================
echo.
echo Step 1: Get your authtoken from:
echo https://dashboard.ngrok.com/get-started/your-authtoken
echo.
set /p AUTHTOKEN="Paste your authtoken here and press Enter: "
echo.
echo Adding authtoken...
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken %AUTHTOKEN%
echo.
echo ========================================
echo   STARTING NGROK TUNNEL ON PORT 5000
echo ========================================
echo.
echo Your callback URL will be shown below.
echo Look for the "Forwarding" line with HTTPS URL
echo Add "/webhook" at the end of that URL
echo.
echo Example: https://abc123.ngrok-free.app/webhook
echo.
pause
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 5000
