import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';

const AttendanceMarker = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('/api/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async (classId) => {
    try {
      const response = await axios.get(`/api/students/${classId}`);
      setStudents(response.data);
      
      // Initialize attendance data for all students
      const initialAttendance = {};
      response.data.forEach(student => {
        initialAttendance[student.id] = 'present'; // Default to present
      });
      setAttendanceData(initialAttendance);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllAttendance = (status) => {
    const newAttendanceData = {};
    students.forEach(student => {
      newAttendanceData[student.id] = status;
    });
    setAttendanceData(newAttendanceData);
  };

  const submitAttendance = async () => {
    if (!selectedClass || !selectedSubject) {
      setMessage('Please select both class and subject');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        classId: parseInt(selectedClass),
        subjectId: parseInt(selectedSubject),
        status,
        date: selectedDate
      }));

      // Submit each attendance record
      for (const record of attendanceRecords) {
        await axios.post('/api/attendance', record);
      }

      setMessage('Attendance marked successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error submitting attendance:', error);
      setMessage('Error marking attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const stats = { present: 0, absent: 0, late: 0 };
    Object.values(attendanceData).forEach(status => {
      stats[status]++;
    });
    return stats;
  };

  const stats = getAttendanceStats();

  return (
    <div className="attendance-marker">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Mark Attendance</h1>
        <p className="dashboard-subtitle">
          Select class, subject, and mark attendance for students
        </p>
      </div>

      <div className="form-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Select Class</label>
            <select 
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Subject</label>
            <select 
              className="form-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Choose a subject...</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input 
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {students.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-success"
                  onClick={() => markAllAttendance('present')}
                >
                  Mark All Present
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => markAllAttendance('absent')}
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Attendance Stats */}
            <div className="stats-overview" style={{ marginBottom: '2rem' }}>
              <div className="stat-card present">
                <div className="stat-number">{stats.present}</div>
                <div className="stat-label">Present</div>
              </div>
              <div className="stat-card absent">
                <div className="stat-number">{stats.absent}</div>
                <div className="stat-label">Absent</div>
              </div>
              <div className="stat-card late">
                <div className="stat-number">{stats.late}</div>
                <div className="stat-label">Late</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="form-section">
          <h3 style={{ marginBottom: '1.5rem' }}>Student Attendance</h3>
          <div className="student-list">
            {students.map(student => (
              <div key={student.id} className="student-item">
                <div className="student-info">
                  <h4>{student.name}</h4>
                  <p>Roll No: {student.roll_number}</p>
                </div>
                <div className="attendance-buttons">
                  <button
                    className={`btn ${attendanceData[student.id] === 'present' ? 'btn-success' : ''}`}
                    onClick={() => handleAttendanceChange(student.id, 'present')}
                    style={{ 
                      backgroundColor: attendanceData[student.id] === 'present' ? '#4caf50' : '#e0e0e0',
                      color: attendanceData[student.id] === 'present' ? 'white' : '#333'
                    }}
                  >
                    Present
                  </button>
                  <button
                    className={`btn ${attendanceData[student.id] === 'absent' ? 'btn-danger' : ''}`}
                    onClick={() => handleAttendanceChange(student.id, 'absent')}
                    style={{ 
                      backgroundColor: attendanceData[student.id] === 'absent' ? '#f44336' : '#e0e0e0',
                      color: attendanceData[student.id] === 'absent' ? 'white' : '#333'
                    }}
                  >
                    Absent
                  </button>
                  <button
                    className={`btn ${attendanceData[student.id] === 'late' ? 'btn-warning' : ''}`}
                    onClick={() => handleAttendanceChange(student.id, 'late')}
                    style={{ 
                      backgroundColor: attendanceData[student.id] === 'late' ? '#ff9800' : '#e0e0e0',
                      color: attendanceData[student.id] === 'late' ? 'white' : '#333'
                    }}
                  >
                    Late
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              className="btn btn-primary"
              onClick={submitAttendance}
              disabled={loading || !selectedClass || !selectedSubject}
              style={{ fontSize: '1.1rem', padding: '1rem 3rem' }}
            >
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>

          {message && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem', 
              padding: '1rem',
              backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e8',
              color: message.includes('Error') ? '#c62828' : '#2e7d32',
              borderRadius: '8px'
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceMarker;