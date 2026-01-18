import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = () => {
  const { isConnected, liveData, setLiveData } = useSocket();
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : '';

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    if (liveData) {
      setLoading(false);
    }
  }, [liveData]);

  useEffect(() => {
    // Fetch live data every 2 seconds for real-time polling
    const interval = setInterval(() => {
      fetchLiveData();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchLiveData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/attendance/live`);
      setLiveData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching live data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Loading Dashboard...</h1>
        </div>
      </div>
    );
  }

  const overall = liveData?.overall || { present: 0, absent: 0, late: 0, total: 0 };

  // Overall attendance chart data
  const overallChartData = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [
      {
        data: [overall.present, overall.absent, overall.late],
        backgroundColor: ['#4caf50', '#f44336', '#ff9800'],
        borderWidth: 0,
      },
    ],
  };

  // Class-wise chart data
  const classWiseData = {
    labels: liveData?.classWise?.map(cls => cls.class_name) || [],
    datasets: [
      {
        label: 'Present',
        data: liveData?.classWise?.map(cls => cls.present || 0) || [],
        backgroundColor: '#4caf50',
      },
      {
        label: 'Absent',
        data: liveData?.classWise?.map(cls => cls.absent || 0) || [],
        backgroundColor: '#f44336',
      },
      {
        label: 'Late',
        data: liveData?.classWise?.map(cls => cls.late || 0) || [],
        backgroundColor: '#ff9800',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Real-Time Attendance Dashboard</h1>
        <p className="dashboard-subtitle">
          Live monitoring of student attendance across all classes and subjects
        </p>
        <div className="live-indicator">
          <div className="live-dot"></div>
          {isConnected ? 'Live Connected' : 'Disconnected'}
        </div>
        {liveData?.lastUpdated && (
          <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
            Last updated: {new Date(liveData.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="chart-container">
          <h3 className="chart-title">Overall Attendance Distribution</h3>
          <Doughnut data={overallChartData} />
        </div>
        <div className="chart-container">
          <h3 className="chart-title">Class-wise Attendance</h3>
          <Bar data={classWiseData} options={chartOptions} />
        </div>
      </div>

      {/* Class-wise Data Table */}
      <div className="data-section">
        <div className="section-header">Class-wise Attendance Summary</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
              <th>Total</th>
              <th>Attendance Rate</th>
            </tr>
          </thead>
          <tbody>
            {liveData?.classWise?.map((cls) => {
              const attendanceRate = cls.total > 0 
                ? ((cls.present || 0) / cls.total * 100).toFixed(1)
                : '0.0';
              
              return (
                <tr key={cls.class_id}>
                  <td>{cls.class_name}</td>
                  <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {cls.present || 0}
                  </td>
                  <td style={{ color: '#f44336', fontWeight: 'bold' }}>
                    {cls.absent || 0}
                  </td>
                  <td style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {cls.late || 0}
                  </td>
                  <td>{cls.total || 0}</td>
                  <td>
                    <span style={{ 
                      color: attendanceRate >= 80 ? '#4caf50' : 
                             attendanceRate >= 60 ? '#ff9800' : '#f44336',
                      fontWeight: 'bold'
                    }}>
                      {attendanceRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Subject-wise Data Table */}
      <div className="data-section" style={{ marginTop: '2rem' }}>
        <div className="section-header">Subject-wise Attendance Summary</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
              <th>Total</th>
              <th>Attendance Rate</th>
            </tr>
          </thead>
          <tbody>
            {liveData?.subjectWise?.map((subject) => {
              const attendanceRate = subject.total > 0 
                ? ((subject.present || 0) / subject.total * 100).toFixed(1)
                : '0.0';
              
              return (
                <tr key={subject.subject_id}>
                  <td>{subject.subject_name}</td>
                  <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {subject.present || 0}
                  </td>
                  <td style={{ color: '#f44336', fontWeight: 'bold' }}>
                    {subject.absent || 0}
                  </td>
                  <td style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {subject.late || 0}
                  </td>
                  <td>{subject.total || 0}</td>
                  <td>
                    <span style={{ 
                      color: attendanceRate >= 80 ? '#4caf50' : 
                             attendanceRate >= 60 ? '#ff9800' : '#f44336',
                      fontWeight: 'bold'
                    }}>
                      {attendanceRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;