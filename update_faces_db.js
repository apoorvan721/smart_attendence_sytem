const Database = require('./database.js');
const fs = require('fs');
const path = require('path');

async function updateFacesInDB() {
  const db = new Database();
  await db.init();

  // Read all face images from the faces directory
  const facesDir = './faces';
  const files = fs.readdirSync(facesDir);
  
  // Extract names from face image files (format: Name_MCAXXX.jpg)
  const faceData = files
    .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
    .map(file => {
      const match = file.match(/^(.+?)_(MCA\d+)\./);
      if (match) {
        return {
          name: match[1],
          rollNumber: match[2],
          filename: file
        };
      }
      return null;
    })
    .filter(data => data !== null);

  console.log('\nFound faces:', faceData);

  // Get existing students
  const existingStudents = await db.all('SELECT * FROM students');
  console.log('\nExisting students in DB:', existingStudents);

  // Add new students based on face images
  for (const face of faceData) {
    const existing = existingStudents.find(s => s.roll_number === face.rollNumber);
    
    if (!existing) {
      console.log(`\nAdding new student: ${face.name} (${face.rollNumber})`);
      await db.run(
        'INSERT INTO students (name, roll_number, class_id) VALUES (?, ?, ?)',
        [face.name, face.rollNumber, 1] // Default to class_id 1 (MCA)
      );
    } else {
      console.log(`\nStudent ${face.name} (${face.rollNumber}) already exists`);
      // Update name if different
      if (existing.name !== face.name) {
        console.log(`  Updating name from "${existing.name}" to "${face.name}"`);
        await db.run(
          'UPDATE students SET name = ? WHERE roll_number = ?',
          [face.name, face.rollNumber]
        );
      }
    }
  }

  // Show final list
  const updatedStudents = await db.all('SELECT * FROM students ORDER BY roll_number');
  console.log('\n=== Updated Students List ===');
  updatedStudents.forEach(s => {
    console.log(`${s.roll_number}: ${s.name} (Class ID: ${s.class_id})`);
  });

  console.log('\n✓ Database updated successfully!');
  process.exit(0);
}

updateFacesInDB().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
