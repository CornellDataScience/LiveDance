# ✅ Installation & Testing Checklist

Use this checklist to set up and verify the WebSocket pose estimation system.

---

## 📋 Pre-Installation

- [ ] You have Python 3.8+ installed
- [ ] You have Node.js and npm installed
- [ ] You're in the `LiveDance` project directory
- [ ] You're on the `pose_estimation` branch

---

## 🔧 Backend Installation

### Step 1: Navigate to Backend
```bash
cd backend
```
- [ ] You're in the `backend` directory

### Step 2: Activate Virtual Environment
```bash
source venv/bin/activate
```
- [ ] Virtual environment is activated (you see `(venv)` in your prompt)

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```
- [ ] Installation completes without errors
- [ ] You see `flask-socketio` and `python-socketio` in the installation output

### Step 4: Verify Installation
```bash
python -c "import flask_socketio; print('✅ flask-socketio installed')"
```
- [ ] You see "✅ flask-socketio installed"

---

## 🎨 Frontend Installation

### Step 1: Navigate to Frontend
```bash
cd ../frontend  # or just: cd frontend (from project root)
```
- [ ] You're in the `frontend` directory

### Step 2: Install Dependencies
```bash
npm install
```
- [ ] Installation completes
- [ ] You see `socket.io-client` in the dependency tree
- [ ] Ignore any vulnerability warnings (they're in dev dependencies)

### Step 3: Verify Installation
```bash
npm list socket.io-client
```
- [ ] You see `socket.io-client@4.5.4` (or similar version)

---

## 🚀 First Run

### Terminal 1: Start Backend

1. **Navigate and activate:**
   ```bash
   cd backend
   source venv/bin/activate
   ```
   - [ ] In backend directory
   - [ ] Virtual environment active

2. **Start server:**
   ```bash
   python app.py
   ```
   - [ ] Server starts without errors
   - [ ] You see: "🚀 LiveDance Python Backend Starting (WebSocket Mode)..."
   - [ ] You see: "📡 Server running at http://localhost:8000"
   - [ ] You see: "🎯 Features: LIVE_STREAM mode | EMA smoothing | Frame downscaling | Monotonic timestamps"

### Terminal 2: Start Frontend

1. **Navigate:**
   ```bash
   cd frontend
   ```
   - [ ] In frontend directory

2. **Start dev server:**
   ```bash
   npm start
   ```
   - [ ] Server starts without errors
   - [ ] Browser opens automatically at http://localhost:3000
   - [ ] You see the LiveDance interface

---

## 🎥 Camera & Connection Test

### In the Browser:

1. **Camera Permission:**
   - [ ] Browser asks for camera permission
   - [ ] You click "Allow"
   - [ ] Webcam feed appears in the UI

2. **Backend Connection:**
   - [ ] Status shows "Connecting to pose estimation server..."
   - [ ] Then changes to "Ready to dance!"
   - [ ] Backend terminal shows: "🔌 Client connected via WebSocket"

3. **Performance Overlay:**
   - [ ] Top-right corner shows "⚡ Performance Monitor"
   - [ ] FPS counter appears (should reach ~24)
   - [ ] Latency metrics appear
   - [ ] Backend breakdown shows timing for each step

---

## 🕺 Pose Tracking Test

### Stand in front of camera:

1. **Body Tracking:**
   - [ ] Pink dots appear on your body joints
   - [ ] Dots follow your movements smoothly
   - [ ] Lines connect the dots to form a skeleton
   - [ ] No jittering or stuttering

2. **Hand Tracking:**
   - [ ] Hold your hands in view
   - [ ] Teal dots appear on hand landmarks
   - [ ] Hand tracking is responsive

3. **3D Angles:**
   - [ ] Click "Show Data" button
   - [ ] "3D Joint Angles" section appears (gold)
   - [ ] Angles update as you move
   - [ ] Try bending elbow - angle changes
   - [ ] Try bending knee - angle changes

4. **3D Coordinates:**
   - [ ] "3D Joint Coordinates" section appears (pink)
   - [ ] X, Y, Z values update as you move
   - [ ] Coordinates are reasonable (-1 to 1 range typically)

---

## 📊 Performance Verification

### Check Backend Console:

Every 30 frames, you should see output like:
```
⚡ Backend [Frame 30]: Decode: 2.1ms | Downscale: 0.8ms | Pose: 14.5ms | 3D: 0.5ms | Hands: 10.2ms | Smooth: 0.3ms | TOTAL: 28.4ms | Dropped: 35
```

**Verify:**
- [ ] Logs appear regularly
- [ ] Total time is 25-40ms
- [ ] Dropped count increases (this is GOOD!)
- [ ] **NO "timestamp mismatch" errors**
- [ ] **NO "too many open files" errors**

### Check Frontend Overlay:

**Verify:**
- [ ] FPS: ~24
- [ ] Total Latency: 40-60ms
- [ ] Network Latency: 5-20ms
- [ ] Backend breakdown shows all 6 steps:
  - [ ] Decode: ~2ms
  - [ ] Downscale: ~1ms
  - [ ] Pose: ~12-15ms
  - [ ] 3D Angles: ~1ms
  - [ ] Hands: ~10ms
  - [ ] Smoothing: ~1ms

---

## 🧪 Feature Tests

### Data Export:
1. Click "Export Data" button
   - [ ] JSON file downloads
   - [ ] File contains body, hands, pose3DAngles, pose3DCoords
   - [ ] Data looks reasonable

### Panel Toggle:
1. Click "Show Data" / "Hide Data"
   - [ ] Panel appears/disappears smoothly
   - [ ] Data updates in real-time when visible

### Multiple Movements:
1. Try different poses:
   - [ ] Arms up - tracks correctly
   - [ ] Arms to sides - tracks correctly
   - [ ] Squat - tracks knees
   - [ ] Jumping - handles fast movement
   - [ ] Spin around - handles occlusions

---

## 🐛 Common Issues & Fixes

### ❌ "Module 'flask_socketio' not found"
**Fix:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ "Cannot find module 'socket.io-client'"
**Fix:**
```bash
cd frontend
npm install
```

### ❌ "WebSocket connection failed"
**Check:**
- [ ] Backend is running (terminal 1)
- [ ] Backend shows port 8000
- [ ] No firewall blocking connections
- [ ] Try restarting backend

### ❌ No pose tracking visible
**Check:**
- [ ] Camera permission granted
- [ ] Backend console shows "Client connected"
- [ ] Browser console (F12) for errors
- [ ] Stand 3-5 feet from camera
- [ ] Ensure good lighting

### ❌ High latency (>100ms)
**Try:**
1. Reduce model complexity in `backend/app.py`:
   ```python
   model_complexity=1  →  model_complexity=0
   ```
2. Reduce downscale size:
   ```python
   target_short_side=384  →  target_short_side=320
   ```

---

## ✅ Success Criteria

You've successfully installed and verified the system when:

- [x] Backend starts without errors
- [x] Frontend connects via WebSocket
- [x] Camera feed appears
- [x] Pink skeleton tracks your body
- [x] Teal dots track your hands
- [x] 3D angles update correctly
- [x] Performance metrics show ~24 FPS
- [x] Latency is 40-60ms
- [x] NO timestamp errors in console
- [x] Smooth rendering (no stuttering)
- [x] Data export works

---

## 🎉 You're Ready!

If all boxes are checked, your WebSocket pose estimation system is:
- ✅ Installed correctly
- ✅ Running smoothly
- ✅ Tracking poses accurately
- ✅ Performing optimally

**Next steps:**
1. Read `WEBSOCKET_LATEST_WINS_IMPLEMENTATION.md` for technical details
2. See `ARCHITECTURE_DIAGRAM.md` for system architecture
3. Use the system for your dance application!

Happy dancing! 💃🕺

