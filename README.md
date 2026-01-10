# Smart Real-Time Attendance Dashboard

A comprehensive attendance management system with real-time tracking, live dashboard, and detailed reporting capabilities.

## Features

### 🔴 Live Dashboard
- Real-time attendance tracking with WebSocket updates
- Class-wise and subject-wise attendance statistics
- Interactive charts and visualizations
- Live connection status indicator

### 📝 Attendance Management
- Quick attendance marking interface
- Bulk operations (mark all present/absent)
- Individual student status tracking
- Date-specific attendance records

### 🎥 Face Recognition (NEW!)
- Automatic attendance marking using facial recognition
- Real-time face detection and recognition
- Integration with existing attendance system
- Live camera feed with face detection overlay
- Automatic prevention of duplicate marking

### 📊 Reports & Analytics
- Detailed attendance reports with filters
- Attendance trends and analytics
- CSV export functionality
- Attendance rate calculations
- Quick insights and alerts

### 🏗️ Technical Features
- SQLite database for data persistence
- RESTful API with Express.js
- Real-time updates via Socket.IO
- React frontend with responsive design
- Chart.js for data visualization
- Python-based face recognition server
- OpenCV and face_recognition integration

## Project Structure

```
smart-attendance-dashboard/
├── server.js                 # Main server file
├── database.js              # Database configuration and queries
├── services/
│   └── attendanceService.js # Business logic for attendance
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Socket context
│   │   └── App.js          # Main app component
│   └── package.json
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Python 3.7+ (for face recognition)
- npm or yarn
- Webcam (for face recognition)

### Quick Start (Windows)
```bash
# Run the automated setup script
start.bat
```

### Manual Setup

#### 1. Backend Setup
```bash
# Install Node.js dependencies
npm install

# Start the server
npm run dev
```
Server runs on `http://localhost:5000`

#### 2. Frontend Setup
```bash
# Navigate to client directory
cd client

# Install client dependencies
npm install

# Start React development server
npm start
```
Client runs on `http://localhost:3000`

#### 3. Face Recognition Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Setup face recognition
python setup_faces.py

# Add student photos to 'faces' directory
# Format: StudentName_StudentID.jpg
# Example: John-Doe_1.jpg

# Start face recognition server
python face_recognition_server.py
```
Face recognition runs on `http://localhost:5001`

## API Endpoints

### Classes
- `GET /api/classes` - Get all classes
- `GET /api/students/:classId` - Get students by class

### Subjects
- `GET /api/subjects` - Get all subjects

### Attendance
- `POST /api/attendance` - Mark attendance for a student
- `GET /api/attendance/stats` - Get attendance statistics
- `GET /api/attendance/live` - Get live attendance data

## Database Schema

### Classes Table
- `id` - Primary key
- `name` - Class name (e.g., "Grade 10 A")
- `grade` - Grade level
- `section` - Class section

### Students Table
- `id` - Primary key
- `name` - Student name
- `roll_number` - Unique roll number
- `class_id` - Foreign key to classes table

### Subjects Table
- `id` - Primary key
- `name` - Subject name
- `code` - Subject code

### Attendance Table
- `id` - Primary key
- `student_id` - Foreign key to students table
- `class_id` - Foreign key to classes table
- `subject_id` - Foreign key to subjects table
- `date` - Attendance date
- `status` - Attendance status (present/absent/late)
- `marked_at` - Timestamp when marked

## Usage

### 1. Dashboard
- View real-time attendance statistics
- Monitor class-wise and subject-wise data
- See live updates as attendance is marked

### 2. Mark Attendance
- Select class and subject
- Choose date (defaults to today)
- Mark individual student attendance
- Use bulk actions for efficiency
- Submit attendance records

### 3. Reports
- Generate filtered reports by class, subject, and date range
- View attendance trends over time
- Export data to CSV
- Get insights and recommendations

## Sample Data

The system comes with pre-populated sample data:
- 4 classes (Grade 10 A, 10 B, 11 A, 12 A)
- 6 subjects (Mathematics, Physics, Chemistry, Biology, English, History)
- 8 sample students across different classes

## Real-Time Features

The dashboard uses WebSocket connections to provide:
- Live attendance updates
- Real-time statistics refresh
- Connection status monitoring
- Automatic data synchronization

## Development

### Adding New Features

1. **Backend**: Add routes in `server.js` and business logic in `services/`
2. **Frontend**: Create components in `client/src/components/`
3. **Database**: Modify schema in `database.js`

### Environment Variables

Create a `.env` file for configuration:
```
PORT=5000
DB_PATH=./attendance.db
```

## Troubleshooting

### Common Issues

1. **Database not initializing**: Check file permissions for SQLite database
2. **WebSocket connection failed**: Ensure both server and client are running
3. **CORS errors**: Verify the proxy setting in client package.json

### Logs

Check console output for:
- Server startup messages
- Database connection status
- WebSocket connection events
- API request/response logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for educational or commercial purposes.