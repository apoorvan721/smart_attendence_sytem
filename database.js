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

    // Insert sample classes
    const classes = [
      ['Grade 10 A', '10', 'A'],
      ['Grade 10 B', '10', 'B'],
      ['Grade 11 A', '11', 'A'],
      ['Grade 12 A', '12', 'A']
    ];

    for (const [name, grade, section] of classes) {
      await this.run('INSERT INTO classes (name, grade, section) VALUES (?, ?, ?)', [name, grade, section]);
    }

    // Insert sample subjects
    const subjects = [
      ['Mathematics', 'MATH'],
      ['Physics', 'PHY'],
      ['Chemistry', 'CHEM'],
      ['Biology', 'BIO'],
      ['English', 'ENG'],
      ['History', 'HIST']
    ];

    for (const [name, code] of subjects) {
      await this.run('INSERT INTO subjects (name, code) VALUES (?, ?)', [name, code]);
    }

    // Insert sample students
    const students = [
      ['John Doe', 'ST001', 1],
      ['Jane Smith', 'ST002', 1],
      ['Mike Johnson', 'ST003', 1],
      ['Sarah Wilson', 'ST004', 1],
      ['David Brown', 'ST005', 2],
      ['Lisa Davis', 'ST006', 2],
      ['Tom Miller', 'ST007', 2],
      ['Emma Garcia', 'ST008', 2]
    ];

    for (const [name, rollNumber, classId] of students) {
      await this.run('INSERT INTO students (name, roll_number, class_id) VALUES (?, ?, ?)', [name, rollNumber, classId]);
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
    const today = new Date().toISOString().split('T')[0];
    
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
    `, [today]);

    const subjectWise = await this.all(`
      SELECT 
        s.name as subject_name,
        s.id as subject_id,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(*) as total
      FROM subjects s
      LEFT JOIN attendance a ON s.id = a.subject_id AND a.date = ?
      GROUP BY s.id, s.name
      ORDER BY s.name
    `, [today]);

    return { classWise, subjectWise, date: today };
  }
}

module.exports = Database;