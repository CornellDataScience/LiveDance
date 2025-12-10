# 🏗️ System Architecture Diagram

## High-Level Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                            USER'S BROWSER                              │
│                          (localhost:3000)                              │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket
                                    │ (bidirectional)
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│                          PYTHON BACKEND                                │
│                          (localhost:8000)                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Frontend Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐         ┌────────────────────┐                  │
│  │  Video Element   │────────▶│ requestAnimation   │                  │
│  │  (Webcam 640x480)│  60 FPS │ Frame Loop         │                  │
│  └──────────────────┘         └────────────────────┘                  │
│                                        │                                │
│                                        ▼                                │
│                              ┌──────────────────┐                      │
│                              │  Capture Frame   │                      │
│                              │  • Draw to canvas│                      │
│                              │  • toDataURL()   │                      │
│                              │  • Base64 encode │                      │
│                              └──────────────────┘                      │
│                                        │                                │
│                                        ▼                                │
│                         ┌─────────────────────────────┐                │
│                         │  socket.emit('frame', {})   │                │
│                         │  • Fire and forget          │                │
│                         │  • Non-blocking             │                │
│                         │  • Sequence number          │                │
│                         └─────────────────────────────┘                │
│                                        │                                │
│                                        │ WebSocket                      │
│                                        ▼                                │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                 Asynchronous Flow                        │          │
│  │  (Frame sent, loop continues immediately)                │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                        │                                │
│                                        ▼                                │
│              ┌──────────────────────────────────────┐                  │
│              │  getInterpolatedResult()             │                  │
│              │  • Blend last 2 results              │                  │
│              │  • Calculate time factor (t)         │                  │
│              │  • Linear interpolation              │                  │
│              └──────────────────────────────────────┘                  │
│                                        │                                │
│                                        ▼                                │
│                         ┌──────────────────────────┐                   │
│                         │  drawSkeleton()          │                   │
│                         │  • Draw body (pink_primary)      │                   │
│                         │  • Draw hands (teal)     │                   │
│                         │  • Draw connections      │                   │
│                         └──────────────────────────┘                   │
│                                        │                                │
│                                        │                                │
│              ┌─────────────────────────┴─────────┐                     │
│              │  Result arrives via WebSocket     │                     │
│              │  socket.on('pose_result', ...)    │                     │
│              └─────────────────────────────────┬─┘                     │
│                                        │        │                       │
│                                        ▼        │                       │
│              ┌────────────────────────────┐    │                       │
│              │  Store as latestResult     │    │                       │
│              │  Store as previousResult   │    │                       │
│              │  Update performance metrics│    │                       │
│              └────────────────────────────┘    │                       │
│                                                 │                       │
│                                        Loop back to top @ 60 FPS       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Backend Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Flask-SocketIO)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │              RECEIVER THREAD (Main Thread)                 │        │
│  ├────────────────────────────────────────────────────────────┤        │
│  │                                                             │        │
│  │  @socketio.on('frame')                                     │        │
│  │         │                                                   │        │
│  │         ▼                                                   │        │
│  │  ┌──────────────────┐                                      │        │
│  │  │ Receive frame    │◀──── WebSocket from frontend         │        │
│  │  │ • image (base64) │                                      │        │
│  │  │ • timestamp      │                                      │        │
│  │  │ • sequence       │                                      │        │
│  │  └──────────────────┘                                      │        │
│  │         │                                                   │        │
│  │         ▼                                                   │        │
│  │  ┌──────────────────────────────────┐                      │        │
│  │  │  frame_buffer.put()              │                      │        │
│  │  │  • Overwrites old frame          │                      │        │
│  │  │  • Thread-safe (mutex lock)      │                      │        │
│  │  │  • Increments dropped counter    │                      │        │
│  │  └──────────────────────────────────┘                      │        │
│  │         │                                                   │        │
│  │         │ Returns immediately (non-blocking)               │        │
│  │                                                             │        │
│  └─────────────────────────────────────────────────────────────        │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │          LATEST-WINS BUFFER (Thread-Safe)                  │        │
│  ├────────────────────────────────────────────────────────────┤        │
│  │                                                             │        │
│  │  ┌─────────────────────────────────────────┐              │        │
│  │  │  Single Slot: [frame_data or None]     │              │        │
│  │  │  • Lock: threading.Lock()                │              │        │
│  │  │  • dropped_count: int                    │              │        │
│  │  └─────────────────────────────────────────┘              │        │
│  │              ▲                    │                         │        │
│  │              │ put()              │ get()                  │        │
│  │              │                    ▼                         │        │
│  └──────────────┼────────────────────────────────────────────┘        │
│                 │                                                       │
│  ┌──────────────┴──────────────────────────────────────────────┐      │
│  │           INFERENCE THREAD (Separate Thread)                │      │
│  ├─────────────────────────────────────────────────────────────┤      │
│  │                                                              │      │
│  │  while inference_running:                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ frame_data = buffer  │                                   │      │
│  │  │         .get()       │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      │ if None: sleep(1ms) and continue                     │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ Decode base64        │  ~2ms                             │      │
│  │  │ • np.frombuffer()    │                                   │      │
│  │  │ • cv2.imdecode()     │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ Downscale            │  ~1ms                             │      │
│  │  │ • Target: 384px      │                                   │      │
│  │  │ • cv2.resize()       │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ Convert to RGB       │                                   │      │
│  │  │ Generate monotonic   │                                   │      │
│  │  │ timestamp            │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ pose.process()       │  ~15ms                            │      │
│  │  │ • LIVE_STREAM mode   │                                   │      │
│  │  │ • Returns landmarks  │                                   │      │
│  │  │ • Returns world 3D   │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ Calculate 3D angles  │  ~1ms                             │      │
│  │  │ • Elbow, knee, hip   │                                   │      │
│  │  │ • Extract 3D coords  │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ hands.process()      │  ~10ms                            │      │
│  │  │ • Detect both hands  │                                   │      │
│  │  │ • 21 landmarks each  │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ EMA Smoothing        │  ~1ms                             │      │
│  │  │ • Body (α=0.7)       │                                   │      │
│  │  │ • Hands (α=0.7)      │                                   │      │
│  │  │ • 3D angles (α=0.7)  │                                   │      │
│  │  │ • 3D coords (α=0.7)  │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      ▼                                                       │      │
│  │  ┌──────────────────────┐                                   │      │
│  │  │ socketio.emit        │                                   │      │
│  │  │ ('pose_result')      │                                   │      │
│  │  │ • body landmarks     │                                   │      │
│  │  │ • hand landmarks     │                                   │      │
│  │  │ • 3D angles          │                                   │      │
│  │  │ • 3D coords          │                                   │      │
│  │  │ • timings            │                                   │      │
│  │  │ • sequence           │                                   │      │
│  │  └──────────────────────┘                                   │      │
│  │      │                                                       │      │
│  │      │ WebSocket                                            │      │
│  │      ▼                                                       │      │
│  │  Back to frontend ───────────────────────────────────────▶  │      │
│  │                                                              │      │
│  │  Loop back to get() @ ~24 FPS                               │      │
│  │                                                              │      │
│  └──────────────────────────────────────────────────────────────      │
│                                                                         │
│  Total Backend Time: ~30ms (≈ 33 FPS max, runs at ~24 FPS)             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Timing Diagram

```
Time (ms)  Frontend                   Buffer        Backend
────────────────────────────────────────────────────────────────────
0          Capture frame
2          Send via WebSocket ────────▶ put() ────▶ [waiting...]

           Continue loop...
           getInterpolated()
           drawSkeleton()
16         Capture frame (60 FPS)
18         Send via WebSocket ────────▶ put() ────▶ [waiting...]
                                      (drops prev)

32         Capture frame
34         Send via WebSocket ────────▶ put() ────▶ get() ────┐
                                                               │
                                                               ▼
                                                          Decode (2ms)
                                                          Downscale (1ms)
                                                          Pose (15ms)
                                                          3D (1ms)
                                                          Hands (10ms)
                                                          Smooth (1ms)
                                                               │
48         Capture frame                                       │
50         Send via WebSocket ────────▶ put() ────▶ [busy...] │
                                      (drops prev)             │
                                                               │
64         Capture frame                                       │
66         Send via WebSocket ────────▶ put() ────▶ [busy...] │
                                      (drops prev)             │
                                                               ▼
68         ◀──────────────────────────────────── Result! (30ms total)
           Update latestResult
           Continue interpolating...


Timeline Summary:
• Frontend sends every ~16ms (60 FPS)
• Backend processes every ~40ms (24 FPS)
• Buffer drops ~60% of frames (by design!)
• Frontend interpolates for smooth 60 FPS display
```

---

## Thread Safety

```
┌──────────────────────────────────────────────────────────────┐
│                    Thread Synchronization                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Main Thread                    Inference Thread            │
│  (WebSocket Receiver)           (Pose Processing)           │
│  ───────────────────            ────────────────            │
│         │                              │                     │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌─────────────┐              ┌─────────────┐              │
│  │ Acquire lock│              │ Acquire lock│              │
│  │ Write buffer│              │ Read buffer │              │
│  │ Release lock│              │ Clear buffer│              │
│  └─────────────┘              │ Release lock│              │
│         │                      └─────────────┘              │
│         │                              │                     │
│         │                              │                     │
│         ▼                              ▼                     │
│   Return fast                    Process slow               │
│   (~0.1ms)                        (~30ms)                   │
│                                                              │
│  No blocking! Threads never wait for each other.            │
│  Lock held for microseconds only.                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Why This Works

### ✅ No Timestamp Errors

```
Backend generates monotonic timestamps:
  Frame 1: timestamp = 1000000
  Frame 2: timestamp = 1000001
  Frame 3: timestamp = 1000002

MediaPipe receives strictly increasing timestamps ✓
No "packet timestamp mismatch" errors ✓
```

### ✅ No Buffer Overflow

```
Buffer size = 1 (not 10, not 100, just 1)

When full: overwrite old frame
  put(frame_1) → buffer = [frame_1]
  put(frame_2) → buffer = [frame_2]  (frame_1 dropped)
  put(frame_3) → buffer = [frame_3]  (frame_2 dropped)

No unbounded growth ✓
Intentional controlled dropping ✓
```

### ✅ Smooth Rendering

```
Inference:  24 FPS (updates every ~40ms)
Rendering:  60 FPS (updates every ~16ms)

Between inference results, interpolate:
  t=0.00 → 100% previous result
  t=0.25 → 75% previous + 25% latest
  t=0.50 → 50% previous + 50% latest
  t=0.75 → 25% previous + 75% latest
  t=1.00 → 100% latest result

Smooth motion despite slower inference ✓
```

---

## Summary

This architecture achieves:

- ✅ **Stability:** No timestamp errors, no crashes
- ✅ **Performance:** 40-60ms latency, ~24 FPS inference
- ✅ **Quality:** Smooth 60 FPS rendering, EMA smoothing
- ✅ **Simplicity:** Clean separation of concerns
- ✅ **Scalability:** Can handle faster inputs gracefully

**Production ready!** 🚀
