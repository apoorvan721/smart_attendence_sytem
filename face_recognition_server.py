import cv2
import face_recognition
import numpy as np
import os
import json
import requests
from datetime import datetime
import threading
import time
from flask import Flask, render_template, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class FaceRecognitionAttendance:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_student_ids = []
        self.attendance_records = {}
        self.camera = None
        self.is_running = False
        self.current_class_id = None
        self.current_subject_id = None
        
        # Node.js server URL
        self.node_server_url = "http://localhost:5000"
        
        # Load known faces
        self.load_known_faces()
        
    def load_known_faces(self):
        """Load known faces from the faces directory"""
        faces_dir = "faces"
        if not os.path.exists(faces_dir):
            os.makedirs(faces_dir)
            print(f"Created {faces_dir} directory. Please add student photos here.")
            return
            
        print("Loading known faces...")
        for filename in os.listdir(faces_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                # Extract student info from filename: "StudentName_StudentID_ClassID.jpg"
                name_parts = filename.split('_')
                if len(name_parts) >= 2:
                    student_name = name_parts[0].replace('-', ' ')
                    student_id = name_parts[1]
                    
                    # Load and encode the face
                    image_path = os.path.join(faces_dir, filename)
                    image = face_recognition.load_image_file(image_path)
                    
                    # Get face encodings
                    face_encodings = face_recognition.face_encodings(image)
                    
                    if face_encodings:
                        self.known_face_encodings.append(face_encodings[0])
                        self.known_face_names.append(student_name)
                        self.known_student_ids.append(student_id)
                        print(f"Loaded face for {student_name} (ID: {student_id})")
                    else:
                        print(f"No face found in {filename}")
                else:
                    print(f"Invalid filename format: {filename}. Use format: StudentName_StudentID.jpg")
        
        print(f"Loaded {len(self.known_face_encodings)} known faces")
    
    def start_camera(self):
        """Start the camera for face recognition"""
        if self.camera is None:
            self.camera = cv2.VideoCapture(0)
            if not self.camera.isOpened():
                print("Error: Could not open camera")
                return False
        self.is_running = True
        return True
    
    def stop_camera(self):
        """Stop the camera"""
        self.is_running = False
        if self.camera:
            self.camera.release()
            self.camera = None
    
    def mark_attendance_in_node(self, student_id, status="present"):
        """Send attendance data to Node.js server"""
        if not self.current_class_id or not self.current_subject_id:
            print("Class ID and Subject ID must be set before marking attendance")
            return False
            
        try:
            attendance_data = {
                "studentId": int(student_id),
                "classId": self.current_class_id,
                "subjectId": self.current_subject_id,
                "status": status,
                "date": datetime.now().strftime("%Y-%m-%d")
            }
            
            response = requests.post(
                f"{self.node_server_url}/api/attendance",
                json=attendance_data,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"Attendance marked for student ID {student_id}")
                return True
            else:
                print(f"Failed to mark attendance: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to Node.js server: {e}")
            return False
    
    def process_frame(self):
        """Process a single frame for face recognition"""
        if not self.camera or not self.is_running:
            return None
            
        ret, frame = self.camera.read()
        if not ret:
            return None
        
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = small_frame[:, :, ::-1]
        
        # Find faces in the current frame
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        face_names = []
        for face_encoding in face_encodings:
            # Check if face matches any known faces
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
            name = "Unknown"
            student_id = None
            
            # Use the known face with the smallest distance
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index] and face_distances[best_match_index] < 0.6:
                name = self.known_face_names[best_match_index]
                student_id = self.known_student_ids[best_match_index]
                
                # Mark attendance if not already marked today
                today = datetime.now().strftime("%Y-%m-%d")
                attendance_key = f"{student_id}_{today}"
                
                if attendance_key not in self.attendance_records:
                    self.attendance_records[attendance_key] = True
                    self.mark_attendance_in_node(student_id)
            
            face_names.append(name)
        
        # Draw rectangles and labels on faces
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Scale back up face locations
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            # Draw rectangle around face
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            
            # Draw label
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.6, (255, 255, 255), 1)
        
        return frame
    
    def generate_frames(self):
        """Generate frames for video streaming"""
        while self.is_running:
            frame = self.process_frame()
            if frame is not None:
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.1)

# Global face recognition instance
face_recognition_system = FaceRecognitionAttendance()

@app.route('/')
def index():
    """Main page for face recognition interface"""
    return render_template('face_recognition.html')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(face_recognition_system.generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_recognition', methods=['POST'])
def start_recognition():
    """Start face recognition"""
    data = request.get_json()
    
    # Set class and subject for attendance marking
    face_recognition_system.current_class_id = data.get('classId')
    face_recognition_system.current_subject_id = data.get('subjectId')
    
    if face_recognition_system.start_camera():
        return jsonify({"status": "success", "message": "Face recognition started"})
    else:
        return jsonify({"status": "error", "message": "Failed to start camera"})

@app.route('/stop_recognition', methods=['POST'])
def stop_recognition():
    """Stop face recognition"""
    face_recognition_system.stop_camera()
    return jsonify({"status": "success", "message": "Face recognition stopped"})

@app.route('/get_classes')
def get_classes():
    """Get classes from Node.js server"""
    try:
        response = requests.get(f"{face_recognition_system.node_server_url}/api/classes")
        return jsonify(response.json())
    except:
        return jsonify([])

@app.route('/get_subjects')
def get_subjects():
    """Get subjects from Node.js server"""
    try:
        response = requests.get(f"{face_recognition_system.node_server_url}/api/subjects")
        return jsonify(response.json())
    except:
        return jsonify([])

@app.route('/attendance_status')
def attendance_status():
    """Get current attendance status"""
    return jsonify({
        "is_running": face_recognition_system.is_running,
        "known_faces": len(face_recognition_system.known_face_encodings),
        "current_class": face_recognition_system.current_class_id,
        "current_subject": face_recognition_system.current_subject_id,
        "today_attendance": len([k for k in face_recognition_system.attendance_records.keys() 
                               if datetime.now().strftime("%Y-%m-%d") in k])
    })

if __name__ == '__main__':
    print("Face Recognition Attendance System")
    print("=" * 50)
    print("Setup Instructions:")
    print("1. Create a 'faces' directory")
    print("2. Add student photos with format: StudentName_StudentID.jpg")
    print("3. Example: John-Doe_1.jpg, Jane-Smith_2.jpg")
    print("4. Make sure Node.js server is running on port 5000")
    print("5. Access face recognition at http://localhost:5001")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5001, debug=True)