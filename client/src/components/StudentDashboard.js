import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';

const StudentDashboard = ({ user, onLogout }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('mark'); // 'mark' or 'view'
  const [successMessage, setSuccessMessage] = useState('');
  const [pythonServerStatus, setPythonServerStatus] = useState(null);
  const [events, setEvents] = useState({});
  const [currentMonth, setCurrentMonth] = useState(moment());

  const pythonServerUrl = 'http://localhost:5001';
  const backendUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : '';

  useEffect(() => {
    fetchSubjects();
    fetchTodayAttendance();
    fetchAttendanceHistory();
    fetchPythonStatus();
    loadEvents();
    
    // Refresh Python status every 2 seconds
    const statusInterval = setInterval(fetchPythonStatus, 2000);
    
    // Refresh events every 5 seconds to sync with faculty updates
    const eventsInterval = setInterval(loadEvents, 5000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(eventsInterval);
    };
  }, []);

  const fetchPythonStatus = async () => {
    try {
      const response = await axios.get(`${pythonServerUrl}/attendance_status`);
      setPythonServerStatus(response.data);
    } catch (error) {
      console.error('Python server not available');
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/subjects`);
      setSubjects(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedSubject(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      console.log('Fetching today attendance for student:', user.id);
      const response = await axios.get(`${backendUrl}/api/student/${user.id}/attendance/today`);
      console.log('Today attendance data:', response.data);
      console.log('Today attendance count:', response.data ? response.data.length : 0);
      setTodayAttendance(response.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/student/${user.id}/attendance/history?days=30`);
      setAttendanceHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleStartRecognition = async () => {
    if (!selectedSubject) {
      setMessage('Please select a subject');
      return;
    }

    setLoading(true);
    setMessage('');
    setSuccessMessage('');

    try {
      const response = await axios.post(`${pythonServerUrl}/start_recognition`, {
        classId: 1, // MCA is class 1
        subjectId: parseInt(selectedSubject)
      });

      if (response.data.status === 'success') {
        setIsRunning(true);
        setMessage('✅ Face recognition started! Look at the camera to mark attendance...');
        
        // Auto-refresh attendance after 10 seconds
        setTimeout(async () => {
          console.log('🛑 Stopping recognition...');
          await handleStopRecognition();
          
          // Wait longer to ensure attendance is saved to database
          console.log('⏳ Waiting 2 seconds for database to save...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Force refresh by fetching latest data
          console.log('📡 Fetching updated attendance from backend...');
          await fetchTodayAttendance();
          
          console.log('📊 Today attendance after refresh:', todayAttendance);
          
          if (todayAttendance && todayAttendance.length > 0) {
            setSuccessMessage('✅ Attendance marked successfully!');
          } else {
            setSuccessMessage('⚠️ Attendance processing - check View Attendance tab');
          }
          setMessage('');
          
          // Clear success message after 5 seconds
          setTimeout(() => setSuccessMessage(''), 5000);
        }, 10000);
      }
    } catch (error) {
      setMessage('❌ Error: Make sure the Python server is running on port 5001');
      console.error('Start error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecognition = async () => {
    try {
      await axios.post(`${pythonServerUrl}/stop_recognition`);
      setIsRunning(false);
    } catch (error) {
      console.error('Stop error:', error);
    }
  };

  const getTodayStatus = () => {
    const subject = subjects.find(s => s.id === parseInt(selectedSubject));
    const attendance = todayAttendance.find(a => a.subject_id === parseInt(selectedSubject));
    
    if (!attendance) return 'Not marked';
    return attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return '#4caf50';
      case 'absent': return '#f44336';
      case 'late': return '#ff9800';
      default: return '#999';
    }
  };

  const loadEvents = () => {
    const savedEvents = localStorage.getItem('facultyEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  };

  const getDaysInMonth = (date) => {
    return date.daysInMonth();
  };

  const getFirstDayOfMonth = (date) => {
    return date.clone().startOf('month').day();
  };

  const getEventsForDate = (day) => {
    const dateString = currentMonth.clone().date(day).format('YYYY-MM-DD');
    return events[dateString] || [];
  };

  const renderCalendarGrid = () => {
    const firstDay = getFirstDayOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} style={styles.emptyDay}></div>
      );
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateEvents = getEventsForDate(day);
      calendarDays.push(
        <div key={day} style={styles.calendarDay}>
          <div style={styles.dayNumber}>{day}</div>
          <div style={styles.eventsList}>
            {dateEvents.map((event, idx) => (
              <div key={idx} style={styles.eventItem} title={event.title}>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return calendarDays;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>👋 Welcome, {user.name}!</h1>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab('mark')}
          style={{ ...styles.tab, borderBottom: tab === 'mark' ? '3px solid #667eea' : 'none' }}
        >
          📸 Mark Attendance
        </button>
        <button
          onClick={() => setTab('view')}
          style={{ ...styles.tab, borderBottom: tab === 'view' ? '3px solid #667eea' : 'none' }}
        >
          📊 View Attendance
        </button>
        <button
          onClick={() => setTab('calendar')}
          style={{ ...styles.tab, borderBottom: tab === 'calendar' ? '3px solid #667eea' : 'none' }}
        >
          📅 Faculty Events
        </button>
      </div>

      {tab === 'mark' && (
        <div style={styles.section}>
          <h2>Mark Attendance</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={isRunning}
              style={styles.select}
            >
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStartRecognition}
            disabled={loading || isRunning || !selectedSubject}
            style={{ ...styles.button, ...styles.primaryButton }}
          >
            {loading ? 'Starting...' : isRunning ? 'Recognition Running...' : '📹 Start Face Recognition'}
          </button>

          <button
            onClick={() => {
              console.log('🔄 Manual refresh clicked');
              fetchTodayAttendance();
              setMessage('✅ Attendance data refreshed!');
              setTimeout(() => setMessage(''), 2000);
            }}
            style={{ ...styles.button, ...styles.secondaryButton, marginTop: '0.5rem' }}
          >
            🔄 Refresh Attendance Data
          </button>

          {/* Live Camera Feed */}
          {isRunning && (
            <div style={styles.cameraSection}>
              <h3 style={styles.cameraTitle}>📸 Live Camera Feed</h3>
              <img 
                src={`${pythonServerUrl}/video_feed`}
                alt="Live Camera Feed"
                style={styles.cameraFeed}
              />
              <p style={styles.cameraNote}>✨ Showing your face and recognition results...</p>
            </div>
          )}

          {successMessage && (
            <div style={{ 
              ...styles.message, 
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}>
              {successMessage}
            </div>
          )}

          {message && (
            <div style={{ 
              ...styles.message, 
              backgroundColor: message.includes('❌') ? '#ffebee' : '#fff3e0'
            }}>
              {message}
            </div>
          )}
        </div>
      )}

      {tab === 'view' && (
        <div style={styles.section}>
          <h2>Attendance History</h2>
          
          <div style={styles.historyContainer}>
            {attendanceHistory.length === 0 ? (
              <p style={styles.noData}>No attendance records found</p>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <div style={styles.tableCell}>Date</div>
                  <div style={styles.tableCell}>Subject</div>
                  <div style={styles.tableCell}>Status</div>
                </div>
                {attendanceHistory.map((record, idx) => (
                  <div key={idx} style={styles.tableRow}>
                    <div style={styles.tableCell}>{record.date}</div>
                    <div style={styles.tableCell}>{record.subject_name}</div>
                    <div style={{ ...styles.tableCell, color: getStatusColor(record.status), fontWeight: 'bold' }}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.stats}>
            <div style={styles.statCard}>
              <div style={{ fontSize: '2rem', color: '#4caf50' }}>
                {attendanceHistory.filter(r => r.status === 'present').length}
              </div>
              <div style={styles.statLabel}>Present</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '2rem', color: '#f44336' }}>
                {attendanceHistory.filter(r => r.status === 'absent').length}
              </div>
              <div style={styles.statLabel}>Absent</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: '2rem', color: '#ff9800' }}>
                {attendanceHistory.filter(r => r.status === 'late').length}
              </div>
              <div style={styles.statLabel}>Late</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div style={styles.section}>
          <h2>📅 Faculty Events Calendar</h2>
          
          <div style={styles.calendarHeader}>
            <button onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, 'month'))} style={styles.navBtn}>
              ← Previous
            </button>
            <h3>{currentMonth.format('MMMM YYYY')}</h3>
            <button onClick={() => setCurrentMonth(currentMonth.clone().add(1, 'month'))} style={styles.navBtn}>
              Next →
            </button>
          </div>

          <div style={styles.weekHeader}>
            <div style={styles.weekDay}>Sun</div>
            <div style={styles.weekDay}>Mon</div>
            <div style={styles.weekDay}>Tue</div>
            <div style={styles.weekDay}>Wed</div>
            <div style={styles.weekDay}>Thu</div>
            <div style={styles.weekDay}>Fri</div>
            <div style={styles.weekDay}>Sat</div>
          </div>

          <div style={styles.calendarGrid}>
            {renderCalendarGrid()}
          </div>

          {Object.keys(events).length === 0 && (
            <p style={styles.noData}>📭 No events scheduled by faculty</p>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'white',
    padding: '1.5rem',
    borderRadius: '10px',
    marginBottom: '2rem',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    background: 'white',
    borderRadius: '10px 10px 0 0',
    padding: '0 1rem'
  },
  tab: {
    padding: '1rem 1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#666'
  },
  section: {
    background: 'white',
    padding: '2rem',
    borderRadius: '0 0 10px 10px',
    marginBottom: '2rem',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#333'
  },
  debugPanel: {
    background: '#f0f4ff',
    border: '2px solid #667eea',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    fontFamily: 'monospace'
  },
  debugTitle: {
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '0.5rem'
  },
  debugData: {
    background: 'white',
    padding: '0.5rem',
    borderRadius: '4px',
    marginTop: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  statusBox: {
    background: '#f5f5f5',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  statusLabel: {
    color: '#666',
    marginBottom: '0.5rem'
  },
  statusValue: {
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  button: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },
  secondaryButton: {
    background: '#4caf50',
    color: 'white'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '1rem',
    textAlign: 'center'
  },
  cameraSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f9f9f9',
    borderRadius: '10px',
    border: '2px solid #667eea',
    textAlign: 'center'
  },
  cameraTitle: {
    color: '#667eea',
    marginBottom: '1rem'
  },
  cameraFeed: {
    width: '100%',
    maxWidth: '500px',
    height: 'auto',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    border: '3px solid #667eea'
  },
  cameraNote: {
    color: '#666',
    marginTop: '1rem',
    fontSize: '0.9rem',
    fontStyle: 'italic'
  },
  historyContainer: {
    marginTop: '1.5rem'
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    background: '#f0f0f0',
    fontWeight: '600',
    padding: '0.75rem',
    borderRadius: '6px'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    padding: '0.75rem',
    borderBottom: '1px solid #eee'
  },
  tableCell: {
    padding: '0.5rem'
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '2rem'
  },
  statCard: {
    background: '#f5f5f5',
    padding: '1.5rem',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statLabel: {
    color: '#666',
    marginTop: '0.5rem'
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1rem',
    background: '#f9f9f9',
    borderRadius: '8px'
  },
  navBtn: {
    padding: '0.5rem 1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  weekDay: {
    padding: '0.75rem',
    background: '#667eea',
    color: 'white',
    borderRadius: '5px'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.5rem'
  },
  calendarDay: {
    minHeight: '100px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    padding: '0.5rem',
    background: 'white',
    overflow: 'auto'
  },
  emptyDay: {
    minHeight: '100px',
    background: '#f5f5f5',
    borderRadius: '5px'
  },
  dayNumber: {
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '0.3rem'
  },
  eventsList: {
    fontSize: '0.75rem'
  },
  eventItem: {
    background: '#667eea',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '3px',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
};

export default StudentDashboard;
