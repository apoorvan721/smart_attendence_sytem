#!/usr/bin/env python3
"""
Setup script to create sample face images for testing face recognition.
This script creates placeholder instructions for setting up student faces.
"""

import os
import json

def create_faces_directory():
    """Create faces directory and setup instructions"""
    faces_dir = "faces"
    
    if not os.path.exists(faces_dir):
        os.makedirs(faces_dir)
        print(f"✅ Created '{faces_dir}' directory")
    else:
        print(f"📁 '{faces_dir}' directory already exists")
    
    # Create a README file with instructions
    readme_content = """# Face Recognition Setup

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
"""
    
    readme_path = os.path.join(faces_dir, "README.md")
    with open(readme_path, 'w') as f:
        f.write(readme_content)
    
    print(f"📝 Created setup instructions: {readme_path}")

def create_sample_config():
    """Create a sample configuration file"""
    config = {
        "face_recognition": {
            "confidence_threshold": 0.6,
            "camera_index": 0,
            "frame_resize_factor": 0.25,
            "recognition_interval": 0.1
        },
        "attendance": {
            "auto_mark_present": True,
            "prevent_duplicate_marking": True,
            "mark_late_threshold_minutes": 15
        },
        "server": {
            "node_server_url": "http://localhost:3001",
            "python_server_port": 5001
        }
    }
    
    config_path = "face_recognition_config.json"
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"⚙️ Created configuration file: {config_path}")

def main():
    print("🎥 Face Recognition Setup")
    print("=" * 50)
    
    create_faces_directory()
    create_sample_config()
    
    print("\n✅ Setup complete!")
    print("\nNext steps:")
    print("1. Add student photos to the 'faces' directory")
    print("2. Install Python dependencies: pip install -r requirements.txt")
    print("3. Start Node.js server: npm run dev")
    print("4. Start Python server: python face_recognition_server.py")
    print("5. Open React app: http://localhost:3000")
    print("6. Go to Face Recognition tab and test!")

if __name__ == "__main__":
    main()