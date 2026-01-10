const moment = require('moment');

class AttendanceService {
  constructor(database, io) {
    this.db = database;
    this.io = io;
  }

  async markAttendance(studentId, classId, subjectId, status, date = null) {
    const attendanceDate = date || moment().format('YYYY-MM-DD');
    
    try {
      const result = await this.db.markAttendance(studentId, classId, subjectId, status, attendanceDate);
      
      // Emit real-time update to all connected clients
      const liveData = await this.getLiveAttendanceData();
      this.io.to('dashboard').emit('attendance-update', liveData);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to mark attendance: ${error.message}`);
    }
  }

  async getAttendanceStats(classId, subjectId, date) {
    try {
      const stats = await this.db.getAttendanceStats(classId, subjectId, date);
      
      // Transform the data for better frontend consumption
      const result = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      };

      stats.forEach(stat => {
        result[stat.status] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get attendance stats: ${error.message}`);
    }
  }

  async getLiveAttendanceData() {
    try {
      const data = await this.db.getLiveAttendanceData();
      
      // Calculate overall statistics
      const overall = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      };

      data.classWise.forEach(cls => {
        overall.present += cls.present || 0;
        overall.absent += cls.absent || 0;
        overall.late += cls.late || 0;
        overall.total += cls.total || 0;
      });

      return {
        ...data,
        overall,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get live attendance data: ${error.message}`);
    }
  }

  async getAttendanceTrends(classId, days = 7) {
    try {
      const endDate = moment();
      const startDate = moment().subtract(days - 1, 'days');
      
      const trends = await this.db.all(`
        SELECT 
          a.date,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
          COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late
        FROM attendance a
        WHERE a.class_id = ? 
        AND a.date BETWEEN ? AND ?
        GROUP BY a.date
        ORDER BY a.date
      `, [classId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);

      return trends;
    } catch (error) {
      throw new Error(`Failed to get attendance trends: ${error.message}`);
    }
  }

  async getDailyReport(date = null) {
    const reportDate = date || moment().format('YYYY-MM-DD');
    
    try {
      const classWiseReport = await this.db.all(`
        SELECT 
          c.name as class_name,
          s.name as student_name,
          s.roll_number,
          sub.name as subject_name,
          a.status,
          a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON a.class_id = c.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE a.date = ?
        ORDER BY c.name, s.name, sub.name
      `, [reportDate]);

      return {
        date: reportDate,
        records: classWiseReport
      };
    } catch (error) {
      throw new Error(`Failed to generate daily report: ${error.message}`);
    }
  }

  // Bulk attendance marking for quick class-wide updates
  async markBulkAttendance(attendanceRecords) {
    try {
      const results = [];
      
      for (const record of attendanceRecords) {
        const { studentId, classId, subjectId, status, date } = record;
        const result = await this.markAttendance(studentId, classId, subjectId, status, date);
        results.push(result);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to mark bulk attendance: ${error.message}`);
    }
  }
}

module.exports = AttendanceService;