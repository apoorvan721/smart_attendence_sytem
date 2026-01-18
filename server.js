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
let attendanceService = null;

// Initialize database first
db.init().then(() => {
  attendanceService = new AttendanceService(db, io);
  
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
      console.log('📝 BACKEND: Marking attendance', { studentId, classId, subjectId, status, date });
      
      const attendance = await attendanceService.markAttendance(studentId, classId, subjectId, status, date);
      console.log('✅ BACKEND: Attendance marked successfully', attendance);
      
      // Verify the record was actually saved
      const attendanceDate = date || new Date().toISOString().split('T')[0];
      const verification = await db.all(`
        SELECT * FROM attendance 
        WHERE student_id = ? AND class_id = ? AND subject_id = ? AND date = ?
      `, [studentId, classId, subjectId, attendanceDate]);
      
      console.log(`✅ VERIFICATION: Found ${verification.length} record(s) in database for this attendance`);
      if (verification.length > 0) {
        console.log(`   Record details:`, verification[0]);
      }
      
      res.json({ success: true, attendance, verified: verification.length > 0 });
    } catch (error) {
      console.error('❌ BACKEND: Error marking attendance:', error.message);
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

  // Get latest attendance date
  app.get('/api/attendance/latest-date', async (req, res) => {
    try {
      const result = await db.get(`
        SELECT COALESCE(MAX(date), DATE('now')) as date FROM attendance
      `);
      res.json({ date: result?.date || new Date().toISOString().split('T')[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check raw attendance data
  app.get('/api/debug/attendance', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allAttendance = await db.all(`
        SELECT * FROM attendance WHERE date = ? ORDER BY subject_id, student_id
      `, [today]);
      
      const subjectBreakdown = await db.all(`
        SELECT 
          s.name as subject_name,
          s.id as subject_id,
          a.status,
          COUNT(DISTINCT a.student_id) as count
        FROM subjects s
        LEFT JOIN attendance a ON s.id = a.subject_id AND a.date = ?
        GROUP BY s.id, a.status
        ORDER BY s.id, a.status
      `, [today]);
      
      res.json({
        today,
        totalAttendanceRecords: allAttendance.length,
        allAttendance,
        subjectBreakdown
      });
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

  // Get daily attendance details for Excel export
  app.get('/api/attendance/daily-export', async (req, res) => {
    try {
      const { classId, subjectId, date } = req.query;
      const exportDate = date || new Date().toISOString().split('T')[0];
      
      console.log(`📋 Daily Export Request: classId=${classId}, subjectId=${subjectId}, date=${exportDate}`);
      
      let query = `
        SELECT 
          s.id as student_id,
          s.roll_number,
          s.name as student_name,
          c.name as class_name,
          sub.name as subject_name,
          a.status,
          a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON a.class_id = c.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE a.date = ?
      `;
      const params = [exportDate];

      if (classId) {
        query += ' AND a.class_id = ?';
        params.push(classId);
      }
      if (subjectId) {
        query += ' AND a.subject_id = ?';
        params.push(subjectId);
      }

      query += ' ORDER BY s.roll_number';
      const records = await db.all(query, params);
      
      console.log(`✅ Found ${records.length} records for date: ${exportDate}`);
      if (records.length === 0) {
        console.log(`⚠️ No records found. Query params:`, params);
      }
      
      res.json({
        date: exportDate,
        records: records,
        count: records.length
      });
    } catch (error) {
      console.error('❌ Error in daily-export:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Authentication endpoints
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.login(email, password);
      
      if (user) {
        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            roll_number: user.roll_number
          }
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Student endpoints
  app.get('/api/student/:studentId', async (req, res) => {
    try {
      const student = await db.getStudentById(req.params.studentId);
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/student/:studentId/attendance/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendance = await db.getStudentAttendanceForDay(req.params.studentId, today);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/student/:studentId/attendance/history', async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const history = await db.getStudentAttendanceHistory(req.params.studentId, parseInt(days));
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Lookup student by roll number (for face recognition)
  app.get('/api/student/by-roll/:rollNumber', async (req, res) => {
    try {
      console.log(`🔍 BACKEND: Looking up student with roll_number: ${req.params.rollNumber}`);
      const student = await db.get('SELECT id, name, roll_number FROM students WHERE roll_number = ?', [req.params.rollNumber]);
      if (student) {
        console.log(`✅ BACKEND: Found student: ${student.name} (DB ID: ${student.id})`);
        res.json(student);
      } else {
        console.log(`❌ BACKEND: Student not found with roll_number: ${req.params.rollNumber}`);
        res.status(404).json({ error: 'Student not found' });
      }
    } catch (error) {
      console.error('❌ BACKEND: Error looking up student:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve React app (only in production)
  const buildPath = path.join(__dirname, 'client/build/index.html');
  const fs = require('fs');
  
  if (fs.existsSync(buildPath)) {
    app.get('*', (req, res) => {
      res.sendFile(buildPath);
    });
  } else {
    // In development, React dev server handles the UI
    app.get('/', (req, res) => {
      res.json({ message: 'API Server Running. Visit http://localhost:3000 for the UI (React dev server)' });
    });
  }

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

  // DEBUG ENDPOINT: Get all attendance records
  app.get('/api/debug/all-attendance', async (req, res) => {
    try {
      const records = await db.all(`
        SELECT 
          s.name as student_name, 
          s.roll_number,
          sub.name as subject_name, 
          a.status, 
          a.date,
          a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        ORDER BY a.date DESC, s.name
      `);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});