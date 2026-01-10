# Face Recognition Setup

## Adding Student Photos

To set up face recognition for students, follow these steps:

### 1. Photo Requirements
- Use clear, front-facing photos of students
- Good lighting and minimal background
- Face should be clearly visible
- Supported formats: .jpg, .jpeg, .png

### 2. Naming Convention
Name your files using this format: `StudentName_StudentID.jpg`

Examples:
- `John-Doe_1.jpg` (for student John Doe with ID 1)
- `Jane-Smith_2.jpg` (for student Jane Smith with ID 2)
- `Mike-Johnson_3.jpg` (for student Mike Johnson with ID 3)

### 3. Student IDs
Make sure the student IDs in the filename match the IDs in your database:

Current students in database:
- John Doe (ID: 1) - Class: Grade 10 A
- Jane Smith (ID: 2) - Class: Grade 10 A  
- Mike Johnson (ID: 3) - Class: Grade 10 A
- Sarah Wilson (ID: 4) - Class: Grade 10 A
- David Brown (ID: 5) - Class: Grade 10 B
- Lisa Davis (ID: 6) - Class: Grade 10 B
- Tom Miller (ID: 7) - Class: Grade 10 B
- Emma Garcia (ID: 8) - Class: Grade 10 B

### 4. Testing
1. Add at least one student photo
2. Start the face recognition server: `python face_recognition_server.py`
3. Open http://localhost:5001 in your browser
4. Select class and subject
5. Start recognition and test with the camera

### 5. Tips for Best Results
- Ensure good lighting when taking photos
- Have students look directly at the camera
- Avoid glasses glare or shadows
- Take multiple photos if needed and use the clearest one
- Test recognition accuracy and retake photos if needed

### 6. Privacy Note
- Only use photos with proper consent
- Store photos securely
- Follow your institution's privacy policies
