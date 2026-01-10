import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FaceRecognition = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState({
    known_faces: 0,
    current_class: null,
    current_subject: null,
    today_attendance: 0
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Python server URL
  const pythonServerUrl = 'http://localhost:5001';

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    updateStatus();
    
    // Update status every 2 seconds
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

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

  const updateStatus = async () => {
    try {
      const response = await axios.get(`${pythonServerUrl}/attendance_status`);
      setStatus(response.data);
      setIsRunning(response.data.is_running);
    } catch (error) {
      // Python server might not be running
      console.log('Python server not available');
    }
  };

  const startRecognition = async () => {
    if (!selectedClass || !selectedSubject) {
      setMessage('Please select both class and subject before starting recognition.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${pythonServerUrl}/start_recognition`, {
        classId: parseInt(selectedClass),
        subjectId: parseInt(selectedSubject)
      });

      if (response.data.status === 'success') {
        setIsRunning(true);
        setMessage('Face recognition started successfully! Students will be automatically marked present when detected.');
      } else {
        setMessage(`Failed to start face recognition: ${response.data.message}`);
      }
    } catch (error) {
      setMessage('Error: Make sure the Python face recognition server is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  const stopRecognition = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${pythonServerUrl}/stop_recognition`);
      
      if (response.data.status === 'success') {
        setIsRunning(false);
        setMessage('Face recognition stopped.');
      } else {
        setMessage(`Failed to stop face recognition: ${response.data.message}`);
      }
    } catch (error) {
      setMessage('Error stopping recognition.');
    } finally {
      setLoading(false);
    }
  };

  const openFaceRecognitionInterface = () => {
    window.open(`${pythonServerUrl}`, '_blank');
  };

  return (
    <div className="face-recognition">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🎥 Face Recognition Attendance</h1>
        <p className="dashboard-subtitle">
          Automatic attendance marking using facial recognition technology
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="form-section">
        <h3 style={{ marginBottom: '1rem', color: '#2196f3' }}>📋 Setup Instructions</h3>
        <div style={{ 
          background: '#e3f2fd', 
          padding: '1.5rem', 
          borderRadius: '8px',
          borderLeft: '4px solid #2196f3',
          marginBottom: '2rem'
        }}>
          <ol style={{ marginLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Create a <strong>'faces'</strong> directory in the project root
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Add student photos with format: <strong>StudentName_StudentID.jpg</strong>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Example: <code>John-Doe_1.jpg</code>, <code>Jane-Smith_2.jpg</code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Install Python dependencies: <code>pip install -r requirements.txt</code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Start Python server: <code>python face_recognition_server.py</code>
            </li>
          </ol>
        </div>
      </div>

      {/* Controls */}
      <div className="form-section">
        <h3 style={{ marginBottom: '1.5rem' }}>🎛️ Recognition Controls</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Select Class</label>
            <select 
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={isRunning}
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
              disabled={isRunning}
            >
              <option value="">Choose a subject...</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={startRecognition}
            disabled={loading || isRunning || !selectedClass || !selectedSubject}
          >
            {loading ? 'Starting...' : '🎥 Start Recognition'}
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={stopRecognition}
            disabled={loading || !isRunning}
          >
            {loading ? 'Stopping...' : '⏹️ Stop Recognition'}
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={openFaceRecognitionInterface}
            style={{ background: '#ff9800' }}
          >
            📹 Open Camera Interface
          </button>
        </div>

        {message && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1rem', 
            padding: '1rem',
            backgroundColor: message.includes('Error') || message.includes('Failed') ? '#ffebee' : '#e8f5e8',
            color: message.includes('Error') || message.includes('Failed') ? '#c62828' : '#2e7d32',
            borderRadius: '8px'
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Status Panel */}
      <div className="form-section">
        <h3 style={{ marginBottom: '1.5rem' }}>📊 Recognition Status</h3>
        
        <div className="stats-overview">
          <div className={`stat-card ${isRunning ? 'present' : 'absent'}`}>
            <div className="stat-number">{isRunning ? 'RUNNING' : 'STOPPED'}</div>
            <div className="stat-label">Recognition Status</div>
          </div>
          
          <div className="stat-card total">
            <div className="stat-number">{status.known_faces}</div>
            <div className="stat-label">Known Faces</div>
          </div>
          
          <div className="stat-card present">
            <div className="stat-number">{status.today_attendance}</div>
            <div className="stat-label">Today's Attendance</div>
          </div>
          
          <div className="stat-card late">
            <div className="stat-number">
              {status.current_class && status.current_subject ? 'SET' : 'NOT SET'}
            </div>
            <div className="stat-label">Class & Subject</div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginTop: '2rem'
        }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <strong>Current Class:</strong><br />
            {status.current_class || 'None Selected'}
          </div>
          
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <strong>Current Subject:</strong><br />
            {status.current_subject || 'None Selected'}
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="form-section">
        <h3 style={{ marginBottom: '1rem', color: '#4caf50' }}>🔧 How It Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: '#f0f8ff', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid #e3f2fd'
          }}>
            <h4 style={{ color: '#1976d2', marginBottom: '0.5rem' }}>1. Face Detection</h4>
            <p>Camera captures live video and detects faces in real-time using OpenCV.</p>
          </div>
          
          <div style={{ 
            background: '#f0f8ff', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid #e3f2fd'
          }}>
            <h4 style={{ color: '#1976d2', marginBottom: '0.5rem' }}>2. Face Recognition</h4>
            <p>Detected faces are compared with known student faces using face_recognition library.</p>
          </div>
          
          <div style={{ 
            background: '#f0f8ff', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid #e3f2fd'
          }}>
            <h4 style={{ color: '#1976d2', marginBottom: '0.5rem' }}>3. Auto Attendance</h4>
            <p>When a student is recognized, attendance is automatically marked in the system.</p>
          </div>
          
          <div style={{ 
            background: '#f0f8ff', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid #e3f2fd'
          }}>
            <h4 style={{ color: '#1976d2', marginBottom: '0.5rem' }}>4. Real-time Updates</h4>
            <p>Dashboard updates instantly showing live attendance statistics.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;