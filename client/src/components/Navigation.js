import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          📊 Smart Attendance Dashboard
        </Link>
        <ul className="nav-links">
          <li>
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/mark-attendance" 
              className={location.pathname === '/mark-attendance' ? 'active' : ''}
            >
              Mark Attendance
            </Link>
          </li>
          <li>
            <Link 
              to="/face-recognition" 
              className={location.pathname === '/face-recognition' ? 'active' : ''}
            >
              Face Recognition
            </Link>
          </li>
          <li>
            <Link 
              to="/reports" 
              className={location.pathname === '/reports' ? 'active' : ''}
            >
              Reports
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;