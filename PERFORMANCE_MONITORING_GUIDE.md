# Performance Monitoring Implementation Guide

## Overview

Comprehensive performance monitoring has been added to track the entire pose estimation pipeline from frontend to backend and back.

## What Was Implemented

### 1. Backend Timing (`backend/app.py`)

**Added timing for:**
- Image decoding
- Pose detection (MediaPipe)
- 3D angle calculations
- Hand detection
- Total backend processing time

**Console Output Example:**
```
🔥 Backend: Decode: 12.3ms | Pose: 45.6ms | 3D: 8.2ms | Hands: 23.1ms | TOTAL: 89.2ms
```

**API Response includes:**
```json
{
  "timings": {
    "image_decode": 12.3,
    "pose_detection": 45.6,
    "3d_calculation": 8.2,
    "hand_detection": 23.1,
    "total_backend": 89.2
  }
}
```

### 2. Frontend Timing (`frontend/src/services/PoseEstimationService.js`)

**Added timing for:**
- Image capture from video
- Network request (total)
- Network latency (calculated)
- JSON parsing
- Total frontend processing time

**Console Output (every 30 frames):**
```
📊 Performance Breakdown (30 frame average):
┌──────────────────┬────────┐
│ Image Capture    │ 15.2ms │
│ Network + Backend│ 95.3ms │
│ JSON Parsing     │ 2.1ms  │
│ TOTAL Pipeline   │ 112.6ms│
│ Estimated FPS    │ 8.9    │
└──────────────────┴────────┘
```

### 3. Real-time Performance Overlay (Frontend UI)

**Displays on screen (top-right corner):**

```
⚡ Performance Monitor
FPS: 8.9
Total Latency: 113ms

Frontend:
  Image Capture: 15ms

Network:
  Latency: 5ms

Backend (89ms):
  • Decode: 12.3ms
  • Pose: 45.6ms
  • 3D Angles: 8.2ms
  • Hands: 23.1ms
```

## Performance Metrics Explained

### Total Latency
**What it is:** Time from capturing frame to displaying results
**Formula:** Image Capture + Network Latency + Backend Processing + JSON Parsing
**Good:** < 50ms (20+ FPS)
**Needs Work:** > 100ms (< 10 FPS)

### FPS (Frames Per Second)
**What it is:** How many frames processed per second
**Formula:** 1000 / Total Latency
**Good:** > 20 FPS
**Acceptable:** 10-20 FPS
**Needs Work:** < 10 FPS

### Frontend - Image Capture
**What it is:** Time to capture frame from video and convert to JPEG
**Typical:** 10-20ms
**If High:** Reduce image resolution or quality

### Network Latency
**What it is:** Pure network transfer time (excluding backend processing)
**Formula:** Network Total - Backend Time - JSON Parsing
**Typical:** 2-10ms (localhost)
**If High:** Use WebSocket or reduce image size

### Backend - Image Decode
**What it is:** Time to decode JPEG and convert to OpenCV format
**Typical:** 5-15ms
**If High:** Send smaller images or use lower quality JPEG

### Backend - Pose Detection
**What it is:** Time for MediaPipe to detect body pose
**Typical:** 20-50ms
**If High:** Use `model_complexity=0` or skip frames

### Backend - 3D Calculation
**What it is:** Time to calculate 3D angles and coordinates
**Typical:** 5-15ms
**If High:** Optimize angle calculations or cache results

### Backend - Hand Detection
**What it is:** Time for MediaPipe to detect hands
**Typical:** 15-30ms
**If High:** Skip hand tracking or reduce frequency

## How to Use

### 1. Monitor Console Logs

**Backend Terminal:**
- Shows detailed timing for each backend process
- Updates every frame

**Frontend Console (Browser DevTools):**
- Shows average timing every 30 frames
- Includes table breakdown

### 2. Watch On-Screen Overlay

The performance monitor in the top-right corner shows:
- Real-time FPS
- Current latency
- Breakdown of where time is spent

### 3. Identify Bottlenecks

**If FPS is low, check:**

1. **High Image Capture?** (>20ms)
   - Lower resolution
   - Reduce JPEG quality

2. **High Network Latency?** (>10ms on localhost)
   - Implement WebSocket
   - Reduce image size

3. **High Pose Detection?** (>50ms)
   - Use `model_complexity=0`
   - Skip every other frame

4. **High Hand Detection?** (>30ms)
   - Set `TRACK_HANDS = False`
   - Process hands less frequently

5. **High 3D Calculation?** (>15ms)
   - Cache calculations
   - Optimize angle computations

## Optimization Checklist

Based on metrics, apply these optimizations:

### Quick Wins (5 minutes)
- [ ] Reduce image resolution to 320x240
- [ ] Lower JPEG quality to 0.6
- [ ] Use model_complexity=0
- [ ] Skip every other frame

### Medium Effort (30 minutes)
- [ ] Implement frame skipping for hands
- [ ] Cache canvas element in frontend
- [ ] Skip 3D calculations when not visible

### Advanced (1+ hour)
- [ ] Implement WebSocket communication
- [ ] Add async processing pipeline
- [ ] Use Web Workers for image capture

## Expected Performance

### Good Setup:
```
FPS: 20-30
Total Latency: 33-50ms
Backend: 25-35ms
Network: 3-8ms
Frontend: 5-10ms
```

### Optimized Setup:
```
FPS: 30-60
Total Latency: 16-33ms
Backend: 10-20ms
Network: 2-5ms
Frontend: 3-8ms
```

### Current Default (Unoptimized):
```
FPS: 8-15
Total Latency: 66-125ms
Backend: 50-90ms
Network: 5-15ms
Frontend: 10-20ms
```

## Troubleshooting

### Metrics not showing?
- Check browser console for errors
- Ensure backend is running
- Refresh the page

### Wildly varying numbers?
- Normal - first few frames are slower
- Look at 30-frame averages in console
- Check CPU usage (other apps may slow system)

### Backend timing missing?
- Check Terminal 1 for errors
- Ensure Python backend restarted after changes

### Network latency negative?
- Timing precision issue, ignore if small
- Usually resolves after a few frames

## Files Modified

1. `backend/app.py` - Added timing instrumentation
2. `frontend/src/services/PoseEstimationService.js` - Added detailed timing
3. `frontend/src/controllers/PoseDetectorController.js` - Added metrics state
4. `frontend/src/views/PoseDetectorView.js` - Added performance overlay

## Next Steps

1. Run the application
2. Watch the performance overlay
3. Check console logs for detailed breakdowns
4. Identify your biggest bottleneck
5. Apply relevant optimizations from the checklist
6. Measure improvement!

