# Installation Troubleshooting Guide

## Common Issues and Solutions

### 1. **Start with Core Dependencies Only**
```bash
# Install basic dependencies first
pip install flask flask-cors requests pillow numpy
```

### 2. **OpenCV Installation**
```bash
# Try different OpenCV versions
pip install opencv-python
# OR if that fails:
pip install opencv-python-headless
```

### 3. **Face Recognition Issues**
Face recognition can be problematic. Try these approaches:

#### Option A: Use conda (Recommended)
```bash
conda install -c conda-forge dlib
pip install face-recognition
```

#### Option B: Pre-built wheels
```bash
pip install --upgrade pip
pip install dlib
pip install face-recognition
```

#### Option C: Skip face recognition for now
You can run the attendance system without face recognition and add it later.

### 4. **Windows-Specific Issues**

#### Install Visual Studio Build Tools
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Install "C++ build tools"

#### Use pre-compiled packages
```bash
# For Windows, try these specific versions
pip install dlib==19.22.0
pip install face-recognition==1.3.0
```

### 5. **Alternative: Run Without Face Recognition**

The main attendance dashboard works perfectly without face recognition:
- Manual attendance marking
- Real-time dashboard
- Reports and analytics
- All core features

## Quick Test
Let's test what you can install:

```bash
# Test basic Python packages
python -c "import flask; print('Flask OK')"
python -c "import requests; print('Requests OK')"
python -c "import numpy; print('Numpy OK')"
```