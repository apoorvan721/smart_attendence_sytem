from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "Face Recognition Server (Stub Mode)"

@app.route('/start_recognition', methods=['POST'])
def start_recognition():
    return jsonify({"status": "success", "message": "Face recognition not available (stub mode)"})

@app.route('/stop_recognition', methods=['POST'])
def stop_recognition():
    return jsonify({"status": "success", "message": "Face recognition stopped"})

@app.route('/attendance_status')
def attendance_status():
    return jsonify({
        "is_running": False,
        "known_faces": 0,
        "current_class": None,
        "current_subject": None,
        "today_attendance": 0
    })

if __name__ == '__main__':
    print("Face Recognition Server (Stub Mode)")
    print("Running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
</text>
</invoke>