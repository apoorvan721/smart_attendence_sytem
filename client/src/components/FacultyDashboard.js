import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';

const FacultyDashboard = ({ user, onLogout }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [events, setEvents] = useState({});
  const [newEvent, setNewEvent] = useState({ date: '', title: '', description: '' });

  const backendUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : '';

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    loadEvents();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/classes`);
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/subjects`);
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedClass) {
      setMessage('❌ Please select a class first');
      return;
    }

    setLoading(true);
    try {
      console.log('Loading attendance for:', { selectedClass, selectedDate, selectedSubject });
      const params = new URLSearchParams();
      params.append('classId', selectedClass);
      params.append('date', selectedDate);
      if (selectedSubject) params.append('subjectId', selectedSubject);

      const response = await axios.get(`${backendUrl}/api/attendance/daily-export?${params}`);
      console.log('Response:', response.data);
      
      if (!response.data.records || response.data.records.length === 0) {
        setMessage(`⚠️ No attendance records found for ${selectedDate}. Make sure students have been recognized or manually marked.`);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords(response.data.records || []);
        setMessage(`✅ Loaded ${response.data.records.length} records for ${selectedDate}`);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (recordId, newStatus) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.roll_number === recordId ? { ...record, status: newStatus } : record
      )
    );
  };

  const saveAttendanceChanges = async () => {
    setLoading(true);
    try {
      for (const record of attendanceRecords) {
        await axios.post(`${backendUrl}/api/attendance`, {
          studentId: record.student_id || 1, // Will be updated by backend
          classId: selectedClass,
          subjectId: selectedSubject || 1,
          status: record.status,
          date: selectedDate
        });
      }
      setMessage('✅ Attendance updated successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('❌ Error updating attendance');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append('classId', selectedClass);
      params.append('date', selectedDate);
      if (selectedSubject) params.append('subjectId', selectedSubject);

      const response = await axios.get(`${backendUrl}/api/attendance/daily-export?${params}`);
      const { records, date } = response.data;

      if (records.length === 0) {
        alert('No attendance records found');
        return;
      }

      const headers = ['Roll Number', 'Student Name', 'Class', 'Subject', 'Status', 'Marked At'];
      const csvContent = [
        headers,
        ...records.map(record => [
          record.roll_number,
          record.student_name,
          record.class_name,
          record.subject_name,
          record.status.toUpperCase(),
          moment(record.marked_at).format('YYYY-MM-DD HH:mm:ss')
        ])
      ];

      const csvString = csvContent.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance-${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Error downloading file');
    }
  };

  const loadEvents = () => {
    const stored = localStorage.getItem('facultyEvents');
    if (stored) {
      setEvents(JSON.parse(stored));
    }
  };

  const addEvent = () => {
    if (!newEvent.date || !newEvent.title) {
      setMessage('Please fill in date and title');
      return;
    }

    const dateKey = newEvent.date;
    const updatedEvents = {
      ...events,
      [dateKey]: [...(events[dateKey] || []), { title: newEvent.title, description: newEvent.description }]
    };
    setEvents(updatedEvents);
    localStorage.setItem('facultyEvents', JSON.stringify(updatedEvents));
    setNewEvent({ date: '', title: '', description: '' });
    setMessage('✅ Event added');
    setTimeout(() => setMessage(''), 2000);
  };

  const getDaysInMonth = () => {
    const days = [];
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    let day = startOfMonth.clone();

    while (day <= endOfMonth) {
      days.push(day.clone());
      day.add(1, 'day');
    }
    return days;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '30px',
      borderRadius: '8px',
      marginBottom: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '2rem'
    },
    logoutBtn: {
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '1rem'
    },
    section: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      marginBottom: '20px',
      color: '#333'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333'
    },
    select: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd'
    },
    input: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      boxSizing: 'border-box'
    },
    button: {
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '10px',
      fontSize: '1rem'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px'
    },
    th: {
      backgroundColor: '#f5f5f5',
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #ddd'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #ddd'
    },
    calendar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '10px',
      marginTop: '20px'
    },
    dayCell: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      minHeight: '80px',
      cursor: 'pointer'
    },
    eventDayCell: {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👨‍🏫 Faculty Dashboard</h1>
          <p style={{ margin: '5px 0', fontSize: '1.1rem' }}>Welcome, {user.name}</p>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
          color: message.includes('✅') ? '#2e7d32' : '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {/* Attendance Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 Manage Attendance</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Class</label>
            <select 
              style={styles.select}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Subject (Optional)</label>
            <select 
              style={styles.select}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Date</label>
            <input 
              type="date"
              style={styles.input}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <button style={styles.button} onClick={loadAttendanceData} disabled={loading}>
            {loading ? 'Loading...' : '📥 Load Attendance'}
          </button>
          <button style={{ ...styles.button, backgroundColor: '#4caf50' }} onClick={downloadExcel}>
            📥 Download Excel
          </button>
          {attendanceRecords.length > 0 && (
            <button style={{ ...styles.button, backgroundColor: '#2196f3' }} onClick={saveAttendanceChanges}>
              💾 Save Changes
            </button>
          )}
        </div>

        {/* Attendance Table */}
        {attendanceRecords.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Roll Number</th>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.roll_number}>
                    <td style={styles.td}>{record.roll_number}</td>
                    <td style={styles.td}>{record.student_name}</td>
                    <td style={styles.td}>{record.subject_name}</td>
                    <td style={styles.td}>
                      <select 
                        value={record.status}
                        onChange={(e) => handleAttendanceChange(record.roll_number, e.target.value)}
                        style={{
                          padding: '5px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          backgroundColor: 
                            record.status === 'present' ? '#e8f5e9' :
                            record.status === 'absent' ? '#ffebee' : '#fff3e0'
                        }}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events Calendar Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📅 Monthly Events Calendar</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button style={styles.button} onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, 'month'))}>
            ← Previous
          </button>
          <h3>{currentMonth.format('MMMM YYYY')}</h3>
          <button style={styles.button} onClick={() => setCurrentMonth(currentMonth.clone().add(1, 'month'))}>
            Next →
          </button>
        </div>

        {/* Add Event Form */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Add Event</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date</label>
              <input 
                type="date"
                style={styles.input}
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Event Title</label>
              <input 
                type="text"
                style={styles.input}
                placeholder="e.g., Exam, Holiday"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <input 
                type="text"
                style={styles.input}
                placeholder="Optional description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
            </div>
          </div>
          <button style={styles.button} onClick={addEvent}>Add Event</button>
        </div>

        {/* Calendar Grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px' }}>
                {day}
              </div>
            ))}
          </div>
          <div style={styles.calendar}>
            {getDaysInMonth().map((day, index) => {
              const dateKey = day.format('YYYY-MM-DD');
              const dayEvents = events[dateKey] || [];
              const isCurrentMonth = day.isSame(currentMonth, 'month');

              return (
                <div
                  key={index}
                  style={{
                    ...styles.dayCell,
                    ...(dayEvents.length > 0 ? styles.eventDayCell : {}),
                    opacity: isCurrentMonth ? 1 : 0.3,
                    backgroundColor: isCurrentMonth 
                      ? (dayEvents.length > 0 ? '#e3f2fd' : 'white')
                      : '#f9f9f9'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{day.date()}</div>
                  {dayEvents.map((event, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: '#1976d2', marginTop: '3px' }}>
                      📌 {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
