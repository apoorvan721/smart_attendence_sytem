import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AttendanceMarker from './components/AttendanceMarker';
import Reports from './components/Reports';
import FaceRecognition from './components/FaceRecognition';
import Navigation from './components/Navigation';
import { SocketProvider } from './context/SocketContext';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="App">
          <Navigation />
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