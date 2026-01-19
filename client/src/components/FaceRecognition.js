import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FaceDetectionNotification from './FaceDetectionNotification';

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
  const [dataLoading, setDataLoading] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [lowConfidenceFaces, setLowConfidenceFaces] = useState([]);

  // Python server URL
  const pythonServerUrl = 'http://localhost:5001';
  
  // Node backend URL
  const backendUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : '';

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    updateStatus();
    
    // Update status every 2 seconds
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      console.log('Detection effect: recognition not running');
      return;
    }

    let previousCount = 0;
    let previousUnknownCount = 0;

    // Fetch detected faces and update UI
    const detectionInterval = setInterval(() => {
      try {
        axios.get(`${pythonServerUrl}/attendance_status`)
          .then(response => {
            const records = response.data.attendance_records || {};
            const unknownFaces = response.data.unknown_faces || {};
            const today = new Date().toISOString().split('T')[0];
            
            console.log('📊 Status check:', {
              records: Object.keys(records),
              unknown: Object.keys(unknownFaces),
              today
            });
            
            // Get recognized faces detected today
            const newFaces = Object.keys(records)
              .filter(key => key.includes(today))
              .map(key => {
                const studentId = key.split('_')[0];
                return studentId;
              });

            // Get unknown/low-confidence faces
            const unknownKeys = Object.keys(unknownFaces)
              .filter(key => key.includes(today));

            // If new students detected, trigger notification
            if (newFaces.length > previousCount) {
              console.log('🎓 New face detected! Total:', newFaces.length, 'Previous:', previousCount);
              console.log('Setting detected faces to:', newFaces);
              setDetectedFaces([...newFaces]);
              previousCount = newFaces.length;
            }

            // If new unknown faces detected, trigger warning
            if (unknownKeys.length > previousUnknownCount) {
              console.log('⚠️ Unknown face detected! Total:', unknownKeys.length);
              const unknownData = unknownKeys.map(key => ({
                id: key,
                data: unknownFaces[key]
              }));
              setLowConfidenceFaces(unknownData);
              previousUnknownCount = unknownKeys.length;
            }
          })
          .catch(err => {
            console.error('Error fetching face detection status:', err);
          });
      } catch (error) {
        console.error('Detection interval error:', error);
      }
    }, 1000); // Check every 1 second

    return () => clearInterval(detectionInterval);
  }, [isRunning, pythonServerUrl]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/classes`);
      console.log('Classes fetched:', response.data);
      setClasses(response.data || []);
      setDataLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setDataLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/subjects`);
      console.log('Subjects fetched:', response.data);
      setSubjects(response.data || []);
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
    setDetectedFaces([]); // Reset detected faces

    try {
      const response = await axios.post(`${pythonServerUrl}/start_recognition`, {
        classId: parseInt(selectedClass),
        subjectId: parseInt(selectedSubject)
      });

      if (response.data.status === 'success') {
        setIsRunning(true);
        console.log('🎬 Face recognition started - listening for detections...');
        setMessage('Face recognition started successfully! Students will be automatically marked present when detected.');
      } else {
        setMessage(`Failed to start face recognition: ${response.data.message}`);
      }
    } catch (error) {
      setMessage('Error: Make sure the Python face recognition server is running on port 5001.');
      console.error('Start recognition error:', error);
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
      console.error('Stop recognition error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFaceRecognitionInterface = () => {
    window.open(`${pythonServerUrl}`, '_blank');
  };

  return (
    <div className="face-recognition">
      <FaceDetectionNotification faces={detectedFaces} />
      {/* Low Confidence Notification */}
      {lowConfidenceFaces.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9998,
          maxWidth: '300px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '1rem',
          borderRadius: '8px',
          border: '2px solid #ffc107',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'slideInWarning 0.5s ease-out'
        }}>
          <strong>⚠️ Unknown Face Detected!</strong>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Low confidence face detected. Confidence: {lowConfidenceFaces[0]?.data?.confidence 
              ? (lowConfidenceFaces[0].data.confidence * 100).toFixed(1) 
              : 'N/A'}%
          </div>
          <style>{`
            @keyframes slideInWarning {
              from {
                transform: translateX(-400px);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
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
        
        {dataLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '1rem',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            Loading classes and subjects...
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Select Class</label>
            <select 
              className="form-select"
              value={selectedClass}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedClass(value);
                console.log('Selected class:', value, 'Classes available:', classes);
              }}
              disabled={isRunning || classes.length === 0}
            >
              <option value="">
                {classes.length === 0 ? 'No classes available' : 'Choose a class...'}
              </option>
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
              onChange={(e) => {
                const value = e.target.value;
                setSelectedSubject(value);
                console.log('Selected subject:', value, 'Subjects available:', subjects);
              }}
              disabled={isRunning || subjects.length === 0}
            >
              <option value="">
                {subjects.length === 0 ? 'No subjects available' : 'Choose a subject...'}
              </option>
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

        {/* Face Detection Notifications */}
        {isRunning && detectedFaces.length > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#e8f5e9',
            border: '2px solid #4caf50',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#2e7d32', marginBottom: '0.5rem' }}>✅ Recently Detected Students</h4>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {detectedFaces.map((face, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    animation: 'slideIn 0.5s ease-out'
                  }}
                >
                  🎓 Student ID: {face}
                </div>
              ))}
            </div>
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