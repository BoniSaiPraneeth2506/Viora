@echo off
echo Starting ngrok tunnel for Socket.IO server...
echo.
echo The HTTPS URL will appear below.
echo Copy it and update your .env file with:
echo EXPO_PUBLIC_SOCKET_URL=https://xxxx-yyyy.ngrok-free.app
echo.
ngrok http 3000
