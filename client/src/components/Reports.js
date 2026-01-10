import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import moment from 'moment';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Reports = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateRange, setDateRange] = useState({
    start: moment().subtract(7, 'days').format('YYYY-MM-DD'),
    end: moment().format('YYYY-MM-DD')
  });
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
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

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('classId', selectedClass);
      if (selectedSubject) params.append('subjectId', selectedSubject);
      params.append('date', dateRange.end);

      const response = await axios.get(`/api/attendance/stats?${params}`);
      setReportData(response.data);

      // Generate trend data for the selected period
      if (selectedClass) {
        const days = moment(dateRange.end).diff(moment(dateRange.start), 'days') + 1;
        const trendResponse = await axios.get(`/api/attendance/trends?classId=${selectedClass}&days=${days}`);
        setTrendData(trendResponse.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['Metric', 'Count'],
      ['Present', reportData.present],
      ['Absent', reportData.absent],
      ['Late', reportData.late],
      ['Total', reportData.total]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Prepare trend chart data
  const trendChartData = trendData ? {
    labels: trendData.map(item => moment(item.date).format('MMM DD')),
    datasets: [
      {
        label: 'Present',
        data: trendData.map(item => item.present),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Absent',
        data: trendData.map(item => item.absent),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Late',
        data: trendData.map(item => item.late),
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Attendance Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="reports">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Attendance Reports</h1>
        <p className="dashboard-subtitle">
          Generate detailed attendance reports and analytics
        </p>
      </div>

      {/* Report Filters */}
      <div className="form-section">
        <h3 style={{ marginBottom: '1.5rem' }}>Report Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Class (Optional)</label>
            <select 
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject (Optional)</label>
            <select 
              className="form-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input 
              type="date"
              className="form-input"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <input 
              type="date"
              className="form-input"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            className="btn btn-primary"
            onClick={generateReport}
            disabled={loading}
            style={{ marginRight: '1rem' }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <button 
              className="btn btn-success"
              onClick={exportReport}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
          <div className="stats-overview">
            <div className="stat-card present">
              <div className="stat-number">{reportData.present}</div>
              <div className="stat-label">Present</div>
            </div>
            <div className="stat-card absent">
              <div className="stat-number">{reportData.absent}</div>
              <div className="stat-label">Absent</div>
            </div>
            <div className="stat-card late">
              <div className="stat-number">{reportData.late}</div>
              <div className="stat-label">Late</div>
            </div>
            <div className="stat-card total">
              <div className="stat-number">{reportData.total}</div>
              <div className="stat-label">Total Records</div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="form-section">
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Attendance Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <h4>Overall Attendance Rate</h4>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: 'bold',
                  color: reportData.total > 0 && (reportData.present / reportData.total) >= 0.8 ? '#4caf50' : 
                         reportData.total > 0 && (reportData.present / reportData.total) >= 0.6 ? '#ff9800' : '#f44336'
                }}>
                  {reportData.total > 0 ? ((reportData.present / reportData.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4>Punctuality Rate</h4>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: 'bold',
                  color: reportData.total > 0 && ((reportData.present + reportData.late) / reportData.total) >= 0.9 ? '#4caf50' : 
                         reportData.total > 0 && ((reportData.present + reportData.late) / reportData.total) >= 0.7 ? '#ff9800' : '#f44336'
                }}>
                  {reportData.total > 0 ? (((reportData.present + reportData.late) / reportData.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trend Chart */}
      {trendChartData && (
        <div className="form-section">
          <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Attendance Trends</h3>
          <div style={{ height: '400px' }}>
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Quick Insights */}
      {reportData && (
        <div className="form-section">
          <h3 style={{ marginBottom: '1.5rem' }}>Quick Insights</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {reportData.total === 0 && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                color: '#856404'
              }}>
                📊 No attendance records found for the selected criteria.
              </div>
            )}
            
            {reportData.total > 0 && (reportData.present / reportData.total) >= 0.9 && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#d4edda', 
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                color: '#155724'
              }}>
                🎉 Excellent attendance! Over 90% of students are present.
              </div>
            )}
            
            {reportData.total > 0 && (reportData.absent / reportData.total) > 0.2 && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#f8d7da', 
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                color: '#721c24'
              }}>
                ⚠️ High absenteeism detected. More than 20% of students are absent.
              </div>
            )}
            
            {reportData.total > 0 && (reportData.late / reportData.total) > 0.1 && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                color: '#856404'
              }}>
                ⏰ Punctuality concern: More than 10% of students are arriving late.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;