# 🚀 Quick Start Guide - WebSocket Mode

## Installation

### 1. Backend Setup
```bash
cd backend

# Activate virtual environment (if already created)
source venv/bin/activate

# Install NEW dependencies (flask-socketio, python-socketio)
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend

# Install NEW dependency (socket.io-client)
npm install
```

---

## Running the Application

### Terminal 1 - Backend (Port 8000)
```bash
cd backend
source venv/bin/activate
python app.py
```

**Expected output:**
```
🚀 LiveDance Python Backend Starting (WebSocket Mode)...
📡 Server running at http://localhost:8000
💃 Ready to track dance poses with latest-wins buffer!
🎯 Features: LIVE_STREAM mode | EMA smoothing | Frame downscaling | Monotonic timestamps
```

### Terminal 2 - Frontend (Port 3000)
```bash
cd frontend
npm start
```

Browser will automatically open at `http://localhost:3000`

---

## What to Expect

### ✅ Success Indicators

1. **Backend Console:**
   ```
   🔌 Client connected via WebSocket
   ⚡ Backend [Frame 30]: Decode: 2.1ms | Downscale: 0.8ms | Pose: 14.5ms | 3D: 0.5ms | Hands: 10.2ms | Smooth: 0.3ms | TOTAL: 28.4ms | Dropped: 35
   ```
   - ✅ "Dropped: X" is GOOD - means buffer is working
   - ✅ Total should be 25-35ms
   - ✅ NO "timestamp mismatch" errors

2. **Frontend Performance Overlay (top-right):**
   ```
   ⚡ Performance Monitor
   FPS: 24
   Total Latency: 45ms
   
   Network (WebSocket):
     Latency: 10ms
   
   Backend (28ms):
     • Decode: 2.1ms
     • Downscale: 0.8ms
     • Pose: 14.5ms
     • 3D Angles: 0.5ms
     • Hands: 10.2ms
     • Smoothing: 0.3ms
   ```

3. **Visual Output:**
   - ✅ Smooth skeleton tracking (no jitter)
   - ✅ Pink dots on body joints
   - ✅ Teal dots on hands
   - ✅ Gold angles displayed in data panel
   - ✅ Smooth movement (60 FPS rendering)

---

## Key Differences from HTTP Version

| Feature | HTTP (Old) | WebSocket (New) |
|---------|-----------|-----------------|
| **Transport** | Request/Response | Persistent connection |
| **Frame Rate** | Limited by latency | 60 FPS send, ~24 FPS process |
| **Latency** | ~50-80ms | ~40-60ms |
| **Frame Drops** | None (bottleneck) | Many (by design!) |
| **Rendering** | Choppy | Smooth (interpolated) |
| **Timestamp Errors** | N/A | **ELIMINATED** |
| **Smoothing** | None | EMA (α=0.7) |
| **Downscaling** | None | 384px |

---

## Performance Tips

### If Backend is Too Slow:
1. Reduce model complexity:
   ```python
   # In app.py, change:
   model_complexity=1  → model_complexity=0
   ```

2. Increase downscaling:
   ```python
   # In app.py, change:
   target_short_side=384  → target_short_side=320
   ```

### If Output is Too Jittery:
1. Increase smoothing:
   ```python
   # In app.py, change:
   smoother = PoseSmoothing(alpha=0.7)  → alpha=0.5
   ```

### If Network Latency is High:
1. Reduce JPEG quality:
   ```javascript
   // In PoseEstimationService.js, change:
   toDataURL('image/jpeg', 0.8)  → 0.6
   ```

---

## Troubleshooting

### "WebSocket connection failed"
**Cause:** Backend not running or firewall blocking
**Fix:**
```bash
# Make sure backend is running:
cd backend
source venv/bin/activate
python app.py
```

### "Module 'flask_socketio' not found"
**Cause:** New dependencies not installed
**Fix:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "socket.io-client not found"
**Cause:** Frontend dependency not installed
**Fix:**
```bash
cd frontend
npm install
```

### Skeleton not appearing
1. **Check camera permissions** - Allow browser to access webcam
2. **Check backend console** - Should show "Client connected"
3. **Check for errors** - Open browser console (F12)

---

## Next Steps

Once everything is working:

1. **Test different poses** - Try occlusions, fast movements
2. **Check 3D angles** - Click "Show Data" to see joint angles
3. **Monitor performance** - Watch the overlay for bottlenecks
4. **Export data** - Click "Export Data" to save pose coordinates

---

## Support

If you encounter issues:
1. Check both terminal outputs for error messages
2. Open browser DevTools (F12) and check Console tab
3. Verify all dependencies are installed
4. Make sure ports 8000 and 3000 are not in use

Enjoy your real-time pose estimation! 💃🕺

