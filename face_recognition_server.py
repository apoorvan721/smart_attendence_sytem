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
        self.unknown_faces = {}  # Track unknown/low-confidence faces
        self.camera = None
        self.is_running = False
        self.current_class_id = None
        self.current_subject_id = None
        
        # Node.js server URL
        self.node_server_url = "http://localhost:3001"
        
        # Load known faces
        self.load_known_faces()
        
    def load_known_faces(self):
        """Load known faces from the faces directory"""
        faces_dir = "faces"
        if not os.path.exists(faces_dir):
            os.makedirs(faces_dir)
            print(f"Created {faces_dir} directory. Please add student photos here.", flush=True)
            return
            
        print(f"📂 Loading known faces from '{faces_dir}'...", flush=True)
        face_count = 0
        for filename in os.listdir(faces_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                # Extract student info from filename: "StudentName_StudentID.jpg"
                # Remove extension first
                name_without_ext = os.path.splitext(filename)[0]
                name_parts = name_without_ext.split('_')
                
                if len(name_parts) >= 2:
                    student_name = name_parts[0].replace('-', ' ')
                    student_id = '_'.join(name_parts[1:])  # Handle IDs like MCA001, 02, 03, etc.
                    
                    # Load and encode the face
                    image_path = os.path.join(faces_dir, filename)
                    try:
                        print(f"   📥 Loading {filename}...", flush=True)
                        image = face_recognition.load_image_file(image_path)
                        print(f"   ✅ Image loaded, encoding...", flush=True)
                        
                        # Get face encodings
                        face_encodings = face_recognition.face_encodings(image)
                        
                        if face_encodings:
                            self.known_face_encodings.append(face_encodings[0])
                            self.known_face_names.append(student_name)
                            self.known_student_ids.append(student_id)
                            face_count += 1
                            print(f"✅ Loaded face for {student_name} (ID: {student_id})", flush=True)
                        else:
                            print(f"⚠️ No face found in {filename} - image quality may be poor", flush=True)
                    except Exception as e:
                        print(f"❌ Error loading {filename}: {str(e)}", flush=True)
                else:
                    print(f"❌ Invalid filename format: {filename}. Use format: StudentName_StudentID.jpg", flush=True)
        
        print(f"\n{'='*50}", flush=True)
        print(f"✅ FACE LOADING COMPLETE: {len(self.known_face_encodings)} faces loaded", flush=True)
        print(f"   Loaded students: {list(zip(self.known_face_names, self.known_student_ids))}", flush=True)
        print(f"{'='*50}\n", flush=True)
    
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
            print(f"❌ Class ID ({self.current_class_id}) or Subject ID ({self.current_subject_id}) not set", flush=True)
            return False
            
        try:
            print(f"🔍 Looking up student: {student_id}", flush=True)
            # First, get the actual database ID from roll_number
            lookup_url = f"{self.node_server_url}/api/student/by-roll/{student_id}"
            print(f"   URL: {lookup_url}", flush=True)
            
            student_lookup_response = requests.get(lookup_url, timeout=5)
            print(f"   Lookup Response: {student_lookup_response.status_code}", flush=True)
            
            if student_lookup_response.status_code != 200:
                print(f"❌ Student {student_id} not found in database", flush=True)
                print(f"   Response: {student_lookup_response.text}", flush=True)
                return False
            
            student_data = student_lookup_response.json()
            db_student_id = student_data['id']
            print(f"✅ Found student in DB: {student_data['name']} (DB ID: {db_student_id})", flush=True)
            
            attendance_data = {
                "studentId": db_student_id,
                "classId": self.current_class_id,
                "subjectId": self.current_subject_id,
                "status": status,
                "date": datetime.now().strftime("%Y-%m-%d")
            }
            print(f"📤 Sending attendance: {attendance_data}", flush=True)
            
            response = requests.post(
                f"{self.node_server_url}/api/attendance",
                json=attendance_data,
                timeout=5
            )
            
            print(f"   POST Response: {response.status_code}", flush=True)
            if response.status_code == 200:
                print(f"✅ ATTENDANCE SAVED for student ID {student_id}", flush=True)
                return True
            else:
                print(f"❌ Failed to mark attendance: {response.status_code}", flush=True)
                print(f"   Response text: {response.text}", flush=True)
                return False
                
        except Exception as e:
            print(f"❌ EXCEPTION in mark_attendance_in_node: {type(e).__name__}: {str(e)}", flush=True)
            import traceback
            traceback.print_exc()
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
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Find faces in the current frame
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        if len(face_locations) > 0:
            print(f"📷 Detected {len(face_locations)} face(s) in frame", flush=True)
        
        face_names = []
        for face_encoding in face_encodings:
            # Check if face matches any known faces
            name = "Unknown"
            student_id = None
            confidence = 0
            
            # Use the known face with the smallest distance
            if len(self.known_face_encodings) > 0:
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                confidence = 1 - face_distances[best_match_index]
                
                print(f"   Face distance: {face_distances[best_match_index]:.4f}, Confidence: {confidence:.2%}", flush=True)
                
                # STRICTER THRESHOLD: 0.4 is very strict (0.6 is default, lower = stricter)
                if face_distances[best_match_index] < 0.4:
                    name = self.known_face_names[best_match_index]
                    student_id = self.known_student_ids[best_match_index]
                    print(f"✅ MATCHED: {name} (ID: {student_id}) with confidence {confidence:.2%}", flush=True)
                    
                    # Mark attendance if not already marked for this subject today
                    today = datetime.now().strftime("%Y-%m-%d")
                    attendance_key = f"{student_id}_{self.current_subject_id}_{today}"
                    
                    if attendance_key not in self.attendance_records:
                        self.attendance_records[attendance_key] = True
                        print(f"📝 Marking attendance for {name}...", flush=True)
                        result = self.mark_attendance_in_node(student_id)
                        print(f"   Result: {'✅ Success - Attendance Updated' if result else '❌ Failed - Database Error'}", flush=True)
                    else:
                        print(f"⏭️ Attendance already marked for {name} for this subject today", flush=True)
                else:
                    # Track unknown/low-confidence face
                    today = datetime.now().strftime("%Y-%m-%d")
                    unknown_key = f"unknown_{today}_{int(datetime.now().timestamp() * 1000)}"
                    self.unknown_faces[unknown_key] = {
                        "confidence": confidence,
                        "closest_match": self.known_face_names[best_match_index] if len(self.known_face_encodings) > 0 else "None",
                        "timestamp": datetime.now().isoformat()
                    }
                    print(f"⚠️ UNKNOWN PERSON DETECTED: Confidence too low ({confidence:.2%}) - Not marking attendance", flush=True)
            else:
                # Track unknown face when no known faces loaded
                today = datetime.now().strftime("%Y-%m-%d")
                unknown_key = f"unknown_{today}_{int(datetime.now().timestamp() * 1000)}"
                self.unknown_faces[unknown_key] = {
                    "confidence": 0,
                    "closest_match": "None",
                    "timestamp": datetime.now().isoformat()
                }
                print(f"⚠️ UNKNOWN PERSON DETECTED: No known faces loaded", flush=True)
            
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
        print(f"📹 generate_frames called, is_running: {self.is_running}")
        frame_count = 0
        while self.is_running:
            frame = self.process_frame()
            if frame is not None:
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    frame_count += 1
                    if frame_count % 30 == 0:  # Log every 30 frames
                        print(f"   📹 Streaming frame #{frame_count}")
                    
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.1)
        print(f"📹 generate_frames stopped, total frames: {frame_count}")

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
    
    print(f"\n{'='*50}")
    print(f"🎬 START RECOGNITION REQUEST")
    print(f"   Class ID: {data.get('classId')}")
    print(f"   Subject ID: {data.get('subjectId')}")
    
    # Set class and subject for attendance marking
    face_recognition_system.current_class_id = data.get('classId')
    face_recognition_system.current_subject_id = data.get('subjectId')
    
    print(f"   Starting camera...")
    if face_recognition_system.start_camera():
        print(f"✅ Camera started successfully")
        print(f"   is_running: {face_recognition_system.is_running}")
        return jsonify({"status": "success", "message": "Face recognition started"})
    else:
        print(f"❌ Failed to start camera")
        return jsonify({"status": "error", "message": "Failed to start camera"})

@app.route('/stop_recognition', methods=['POST'])
def stop_recognition():
    """Stop face recognition"""
    print(f"\n{'='*50}")
    print(f"⏹️ STOP RECOGNITION")
    print(f"   is_running before: {face_recognition_system.is_running}")
    
    face_recognition_system.stop_camera()
    
    print(f"   is_running after: {face_recognition_system.is_running}")
    print(f"{'='*50}\n")
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
    # Clean old unknown faces (keep only recent ones from last minute)
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().timestamp()
    recent_unknown = {
        k: v for k, v in face_recognition_system.unknown_faces.items()
        if today in k and (current_time - datetime.fromisoformat(v["timestamp"]).timestamp()) < 60
    }
    
    return jsonify({
        "is_running": face_recognition_system.is_running,
        "known_faces": len(face_recognition_system.known_face_encodings),
        "loaded_students": list(zip(face_recognition_system.known_face_names, face_recognition_system.known_student_ids)),
        "current_class": face_recognition_system.current_class_id,
        "current_subject": face_recognition_system.current_subject_id,
        "today_attendance": len([k for k in face_recognition_system.attendance_records.keys() 
                               if datetime.now().strftime("%Y-%m-%d") in k]),
        "attendance_records": face_recognition_system.attendance_records,
        "unknown_faces": recent_unknown
    })

if __name__ == '__main__':
    print("Face Recognition Attendance System")
    print("=" * 50)
    print("Setup Instructions:")
    print("1. Create a 'faces' directory")
    print("2. Add student photos with format: StudentName_StudentID.jpg")
    print("3. Example: John-Doe_1.jpg, Jane-Smith_2.jpg")
    print("4. Make sure Node.js server is running on port 3001")
    print("5. Access face recognition at http://localhost:5001")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5001, debug=True)