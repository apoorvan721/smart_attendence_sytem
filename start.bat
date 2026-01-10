@echo off
echo Starting Smart Attendance Dashboard with Face Recognition...
echo.

echo Installing backend dependencies...
call npm install

echo.
echo Installing frontend dependencies...
cd client
call npm install
cd ..

echo.
echo Setting up face recognition...
python setup_faces.py

echo.
echo Starting the application...
echo Backend Server: http://localhost:5000
echo Frontend Client: http://localhost:3000
echo Face Recognition: http://localhost:5001
echo.

start "Backend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend Client" cmd /k "cd client && npm start"
timeout /t 2 /nobreak > nul
start "Face Recognition Server" cmd /k "python face_recognition_server.py"

echo.
echo All servers are starting...
echo Please wait for the applications to load.
echo.
echo IMPORTANT: Add student photos to the 'faces' directory before using face recognition!
pause