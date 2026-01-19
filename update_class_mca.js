const Database = require('./database.js');

async function updateToMCA() {
  const db = new Database();
  await db.init();

  // Check if MCA A class exists
  let mcaClass = await db.get('SELECT * FROM classes WHERE name = ?', ['MCA A']);
  
  if (!mcaClass) {
    console.log('Creating MCA A class...');
    const result = await db.run(
      'INSERT INTO classes (name, grade, section) VALUES (?, ?, ?)',
      ['MCA A', 'MCA', 'A']
    );
    mcaClass = { id: result.id };
    console.log(`✓ Created MCA A class with ID: ${mcaClass.id}`);
  } else {
    console.log(`MCA A class already exists with ID: ${mcaClass.id}`);
  }

  // Update students ST001-ST004 to MCA A class
  const rollNumbers = ['ST001', 'ST002', 'ST003', 'ST004'];
  
  for (const rollNumber of rollNumbers) {
    await db.run(
      'UPDATE students SET class_id = ? WHERE roll_number = ?',
      [mcaClass.id, rollNumber]
    );
    console.log(`✓ Updated ${rollNumber} to MCA A`);
  }

  // Show updated students
  const students = await db.all(
    'SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.roll_number IN (?, ?, ?, ?)',
    rollNumbers
  );
  
  console.log('\n=== Updated Students ===');
  students.forEach(s => {
    console.log(`${s.roll_number}: ${s.name} - ${s.class_name}`);
  });

  console.log('\n✓ All students moved to MCA A successfully!');
  process.exit(0);
}

updateToMCA().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
