const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('attendance.db', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        section TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        roll_number TEXT UNIQUE,
        class_id INTEGER,
        email TEXT,
        password TEXT,
        role TEXT DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        class_id INTEGER,
        subject_id INTEGER,
        date DATE,
        status TEXT CHECK(status IN ('present', 'absent', 'late')),
        marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        UNIQUE(student_id, class_id, subject_id, date)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Insert sample data
    await this.insertSampleData();
  }

  async insertSampleData() {
    // Check if data already exists
    const classCount = await this.get('SELECT COUNT(*) as count FROM classes');
    if (classCount.count > 0) return;

    // Insert MCA class only
    const classes = [
      ['MCA', 'MCA', 'A']
    ];

    for (const [name, grade, section] of classes) {
      await this.run('INSERT INTO classes (name, grade, section) VALUES (?, ?, ?)', [name, grade, section]);
    }

    // Insert MCA subjects
    const subjects = [
      ['DBMS', 'DBMS'],
      ['Maths', 'MATHS'],
      ['Web Technology', 'WEBTEC'],
      ['C Programming', 'CPROG'],
      ['OS', 'OS'],
      ['Web Laboratory', 'WEBLAB'],
      ['DBMS Lab', 'DBMSLAB'],
      ['C Lab', 'CLAB']
    ];

    for (const [name, code] of subjects) {
      await this.run('INSERT INTO subjects (name, code) VALUES (?, ?)', [name, code]);
    }

    // Insert sample MCA students
    const students = [
      ['Ashritha', 'MCA001', 1, 'ashritha@MCA001', 'MCA001', 'student'],
      ['Joycil', 'MCA004', 1, 'joycil@MCA004', 'MCA004', 'student'],
      ['Bhavish', 'MCA002', 1, 'bhavish@MCA002', 'MCA002', 'student'],
      ['Deepak', 'MCA003', 1, 'deepak@MCA003', 'MCA003', 'student'],
      ['Admin User', 'ADMIN001', 1, 'admin@ADMIN001', 'ADMIN001', 'admin'],
      ['Faculty User', 'FAC001', 1, 'faculty@FAC001', 'FAC001', 'faculty']
    ];

    for (const [name, rollNumber, classId, email, password, role] of students) {
      await this.run('INSERT INTO students (name, roll_number, class_id, email, password, role) VALUES (?, ?, ?, ?, ?, ?)', [name, rollNumber, classId, email, password, role]);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getClasses() {
    return this.all('SELECT * FROM classes ORDER BY grade, section');
  }

  async getSubjects() {
    return this.all('SELECT * FROM subjects ORDER BY name');
  }

  async getStudentsByClass(classId) {
    return this.all('SELECT * FROM students WHERE class_id = ? ORDER BY name', [classId]);
  }

  async markAttendance(studentId, classId, subjectId, status, date) {
    return this.run(
      `INSERT OR REPLACE INTO attendance (student_id, class_id, subject_id, date, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, classId, subjectId, date, status]
    );
  }

  async getAttendanceStats(classId, subjectId, date) {
    let query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (classId) {
      query += ' AND a.class_id = ?';
      params.push(classId);
    }
    if (subjectId) {
      query += ' AND a.subject_id = ?';
      params.push(subjectId);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }

    query += ' GROUP BY status';
    return this.all(query, params);
  }

  async getLiveAttendanceData() {
    // Get the most recent date with attendance data, or today if no data yet
    const latestDate = await this.get(`
      SELECT COALESCE(MAX(date), DATE('now')) as date FROM attendance
    `);
    
    const queryDate = latestDate?.date || new Date().toISOString().split('T')[0];
    
    const classWise = await this.all(`
      SELECT 
        c.name as class_name,
        c.id as class_id,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(*) as total
      FROM classes c
      LEFT JOIN attendance a ON c.id = a.class_id AND a.date = ?
      GROUP BY c.id, c.name
      ORDER BY c.name
    `, [queryDate]);

    const subjectWise = await this.all(`
      SELECT 
        s.name as subject_name,
        s.id as subject_id,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(DISTINCT CASE WHEN a.student_id IS NOT NULL THEN a.student_id END) as total
      FROM subjects s
      LEFT JOIN attendance a ON s.id = a.subject_id AND a.date = ?
      GROUP BY s.id, s.name
      ORDER BY s.name
    `, [queryDate]);

    return { classWise, subjectWise, date: queryDate };
  }

  // Authentication methods
  async login(email, password) {
    try {
      const user = await this.get('SELECT * FROM students WHERE email = ? AND password = ?', [email, password]);
      return user;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getStudentById(studentId) {
    try {
      return await this.get('SELECT * FROM students WHERE id = ?', [studentId]);
    } catch (error) {
      throw new Error(`Failed to get student: ${error.message}`);
    }
  }

  async getStudentAttendanceForDay(studentId, date) {
    try {
      return await this.all(`
        SELECT 
          a.id,
          s.name as subject_name,
          a.status,
          a.date,
          a.marked_at
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ? AND a.date = ?
        ORDER BY s.name
      `, [studentId, date]);
    } catch (error) {
      throw new Error(`Failed to get attendance: ${error.message}`);
    }
  }

  async getStudentAttendanceHistory(studentId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const formattedStartDate = startDate.toISOString().split('T')[0];

      return await this.all(`
        SELECT 
          a.date,
          s.name as subject_name,
          a.status
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ? AND a.date >= ?
        ORDER BY a.date DESC, s.name
      `, [studentId, formattedStartDate]);
    } catch (error) {
      throw new Error(`Failed to get attendance history: ${error.message}`);
    }
  }
}

module.exports = Database;