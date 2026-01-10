const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const AttendanceService = require('./services/attendanceService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Initialize database and services
const db = new Database();
const attendanceService = new AttendanceService(db, io);

// Routes
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await db.getClasses();
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await db.getSubjects();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:classId', async (req, res) => {
  try {
    const students = await db.getStudentsByClass(req.params.classId);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { studentId, classId, subjectId, status, date } = req.body;
    const attendance = await attendanceService.markAttendance(studentId, classId, subjectId, status, date);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/stats', async (req, res) => {
  try {
    const { classId, subjectId, date } = req.query;
    const stats = await attendanceService.getAttendanceStats(classId, subjectId, date);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/live', async (req, res) => {
  try {
    const liveData = await attendanceService.getLiveAttendanceData();
    res.json(liveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/trends', async (req, res) => {
  try {
    const { classId, days = 7 } = req.query;
    const trends = await attendanceService.getAttendanceTrends(classId, parseInt(days));
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    console.log('Client joined dashboard room');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Initialize database and start server
db.init().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});