import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AttendanceMarker from './components/AttendanceMarker';
import Reports from './components/Reports';
import FaceRecognition from './components/FaceRecognition';
import Navigation from './components/Navigation';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import { SocketProvider } from './context/SocketContext';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Student view
  if (user.role === 'student') {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  // Faculty view
  if (user.role === 'faculty') {
    return <FacultyDashboard user={user} onLogout={handleLogout} />;
  }

  // Admin view (use existing dashboard)
  return (
    <SocketProvider>
      <Router>
        <div className="App">
          <Navigation user={user} onLogout={handleLogout} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/mark-attendance" element={<AttendanceMarker />} />
              <Route path="/face-recognition" element={<FaceRecognition />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;