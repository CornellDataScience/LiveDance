"""
LiveDance Backend - Python Pose Estimation Server with WebSocket
Flask-SocketIO server with latest-wins buffer for stable real-time pose estimation
Uses MediaPipe for both body and hand tracking with LIVE_STREAM mode
"""

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import mediapipe as mp
import cv2
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from collections import deque
import math
import time
import base64
import threading
from io import BytesIO

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', ping_timeout=60, ping_interval=25)

# =============================================================================
# LATEST-WINS BUFFER - Core of the optimization
# =============================================================================
class LatestFrameBuffer:
    """
    Single-slot buffer that only keeps the newest frame.
    Older frames are discarded by design to prevent queue buildup.
    """
    def __init__(self):
        self.frame_data = None
        self.lock = threading.Lock()
        self.dropped_count = 0
        
    def put(self, frame_bytes, timestamp, sequence, use3D=True):
        """Store new frame, discarding any previous frame"""
        with self.lock:
            if self.frame_data is not None:
                self.dropped_count += 1
            self.frame_data = {
                'bytes': frame_bytes,
                'timestamp': timestamp,
                'sequence': sequence,
                'use3D': use3D
            }
    
    def get(self):
        """Get and clear the latest frame"""
        with self.lock:
            data = self.frame_data
            self.frame_data = None
            return data
    
    def get_stats(self):
        """Get dropped frame count"""
        with self.lock:
            count = self.dropped_count
            self.dropped_count = 0
            return count

# Global buffer instance
frame_buffer = LatestFrameBuffer()

# =============================================================================
# MediaPipe Setup for LIVE_STREAM mode
# =============================================================================
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

# Initialize detectors
pose = mp_pose.Pose(
    static_image_mode=False,  # LIVE_STREAM mode
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

hands = mp_hands.Hands(
    static_image_mode=False,  # LIVE_STREAM mode
    max_num_hands=2,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# Monotonic timestamp generator
class TimestampGenerator:
    def __init__(self):
        self.last_timestamp = 0
        self.lock = threading.Lock()
    
    def get_next(self):
        """Generate strictly monotonic increasing timestamps"""
        with self.lock:
            current = int(time.monotonic() * 1000000)  # microseconds
            if current <= self.last_timestamp:
                current = self.last_timestamp + 1
            self.last_timestamp = current
            return current

timestamp_gen = TimestampGenerator()

# =============================================================================
# Landmark names
# =============================================================================
BODY_KEYPOINT_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
]

MOVENET_INDICES = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
MOVENET_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

HAND_LANDMARK_NAMES = [
    "wrist", "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip",
    "index_mcp", "index_pip", "index_dip", "index_tip",
    "middle_mcp", "middle_pip", "middle_dip", "middle_tip",
    "ring_mcp", "ring_pip", "ring_dip", "ring_tip",
    "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip",
]

# =============================================================================
# 3D Pose Estimation - MediaPipe World Landmarks
# =============================================================================
def calculate_angle_3d(p1, p2, p3):
    """Calculate angle between three 3D points (in degrees)"""
    v1 = np.array([p1.x - p2.x, p1.y - p2.y, p1.z - p2.z])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y, p3.z - p2.z])
    
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    
    if norm_v1 < 1e-6 or norm_v2 < 1e-6:
        return 0.0
    
    v1_normalized = v1 / norm_v1
    v2_normalized = v2 / norm_v2
    
    cos_angle = np.clip(np.dot(v1_normalized, v2_normalized), -1.0, 1.0)
    angle_rad = np.arccos(cos_angle)
    angle_deg = np.degrees(angle_rad)
    
    return round(angle_deg, 1)

def calculate_3d_angles_mediapipe(world_landmarks):
    """Calculate joint angles from MediaPipe 3D world landmarks"""
    angles = {}
    coords = {}
    
    if len(world_landmarks) >= 33:
        # Left elbow
        angles['left_elbow'] = calculate_angle_3d(
            world_landmarks[11], world_landmarks[13], world_landmarks[15]
        )
        # Right elbow
        angles['right_elbow'] = calculate_angle_3d(
            world_landmarks[12], world_landmarks[14], world_landmarks[16]
        )
        # Left knee
        angles['left_knee'] = calculate_angle_3d(
            world_landmarks[23], world_landmarks[25], world_landmarks[27]
        )
        # Right knee
        angles['right_knee'] = calculate_angle_3d(
            world_landmarks[24], world_landmarks[26], world_landmarks[28]
        )
        # Left shoulder
        angles['left_shoulder'] = calculate_angle_3d(
            world_landmarks[13], world_landmarks[11], world_landmarks[23]
        )
        # Right shoulder
        angles['right_shoulder'] = calculate_angle_3d(
            world_landmarks[14], world_landmarks[12], world_landmarks[24]
        )
        # Left hip
        angles['left_hip'] = calculate_angle_3d(
            world_landmarks[11], world_landmarks[23], world_landmarks[25]
        )
        # Right hip
        angles['right_hip'] = calculate_angle_3d(
            world_landmarks[12], world_landmarks[24], world_landmarks[26]
        )
        
        # Extract 3D coordinates for key joints
        key_joints = {
            'left_shoulder': 11, 'right_shoulder': 12,
            'left_elbow': 13, 'right_elbow': 14,
            'left_wrist': 15, 'right_wrist': 16,
            'left_hip': 23, 'right_hip': 24,
            'left_knee': 25, 'right_knee': 26,
            'left_ankle': 27, 'right_ankle': 28,
        }
        
        for joint_name, idx in key_joints.items():
            lm = world_landmarks[idx]
            coords[joint_name] = {
                'x': round(lm.x, 3),
                'y': round(lm.y, 3),
                'z': round(lm.z, 3)
            }
    
    return angles, coords

# =============================================================================
# EMA Smoothing for pose stability
# =============================================================================
class PoseSmoothing:
    """Exponential Moving Average smoothing for pose keypoints"""
    def __init__(self, alpha=0.7):
        self.alpha = alpha  # Higher = more weight to new values
        self.smoothed_body = None
        self.smoothed_hands = {'left': None, 'right': None}
        self.smoothed_3d_angles = None
        self.smoothed_3d_coords = None
    
    def smooth_body(self, landmarks):
        """Smooth body landmarks"""
        if not landmarks:
            return landmarks
        
        if self.smoothed_body is None:
            self.smoothed_body = landmarks
            return landmarks
        
        smoothed = []
        for i, lm in enumerate(landmarks):
            if i < len(self.smoothed_body):
                prev = self.smoothed_body[i]
                smoothed.append({
                    'name': lm['name'],
                    'x': self.alpha * lm['x'] + (1 - self.alpha) * prev['x'],
                    'y': self.alpha * lm['y'] + (1 - self.alpha) * prev['y'],
                    'confidence': lm['confidence'],
                    'visible': lm['visible']
                })
            else:
                smoothed.append(lm)
        
        self.smoothed_body = smoothed
        return smoothed
    
    def smooth_hands(self, hands_data):
        """Smooth hand landmarks"""
        smoothed_hands = {'left': [], 'right': []}
        
        for side in ['left', 'right']:
            landmarks = hands_data.get(side, [])
            if not landmarks:
                self.smoothed_hands[side] = None
                continue
            
            if self.smoothed_hands[side] is None:
                self.smoothed_hands[side] = landmarks
                smoothed_hands[side] = landmarks
                continue
            
            smoothed = []
            for i, lm in enumerate(landmarks):
                if i < len(self.smoothed_hands[side]):
                    prev = self.smoothed_hands[side][i]
                    smoothed.append({
                        'name': lm['name'],
                        'x': self.alpha * lm['x'] + (1 - self.alpha) * prev['x'],
                        'y': self.alpha * lm['y'] + (1 - self.alpha) * prev['y'],
                        'z': lm.get('z', 0),
                        'normalized_x': lm.get('normalized_x', 0),
                        'normalized_y': lm.get('normalized_y', 0)
                    })
                else:
                    smoothed.append(lm)
            
            self.smoothed_hands[side] = smoothed
            smoothed_hands[side] = smoothed
        
        return smoothed_hands
    
    def smooth_3d_angles(self, angles):
        """Smooth 3D angles"""
        if not angles:
            return angles
        
        if self.smoothed_3d_angles is None:
            self.smoothed_3d_angles = angles
            return angles
        
        smoothed = {}
        for key, value in angles.items():
            if key in self.smoothed_3d_angles:
                smoothed[key] = self.alpha * value + (1 - self.alpha) * self.smoothed_3d_angles[key]
            else:
                smoothed[key] = value
        
        self.smoothed_3d_angles = smoothed
        return smoothed
    
    def smooth_3d_coords(self, coords):
        """Smooth 3D coordinates"""
        if not coords:
            return coords
        
        if self.smoothed_3d_coords is None:
            self.smoothed_3d_coords = coords
            return coords
        
        smoothed = {}
        for joint, coord in coords.items():
            if joint in self.smoothed_3d_coords:
                smoothed[joint] = {
                    'x': self.alpha * coord['x'] + (1 - self.alpha) * self.smoothed_3d_coords[joint]['x'],
                    'y': self.alpha * coord['y'] + (1 - self.alpha) * self.smoothed_3d_coords[joint]['y'],
                    'z': self.alpha * coord['z'] + (1 - self.alpha) * self.smoothed_3d_coords[joint]['z']
                }
            else:
                smoothed[joint] = coord
        
        self.smoothed_3d_coords = smoothed
        return smoothed

# Global smoothing instance
smoother = PoseSmoothing(alpha=0.7)

# =============================================================================
# Frame downscaling for performance
# =============================================================================
def downscale_frame(image, target_short_side=384):
    """Downscale image to target short side while maintaining aspect ratio"""
    height, width = image.shape[:2]
    
    if height < width:
        if height <= target_short_side:
            return image
        scale = target_short_side / height
    else:
        if width <= target_short_side:
            return image
        scale = target_short_side / width
    
    new_width = int(width * scale)
    new_height = int(height * scale)
    
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)

# =============================================================================
# Inference Thread - Consumes frames from latest-wins buffer
# =============================================================================
inference_running = False
inference_thread = None
processed_frame_count = 0

def inference_loop():
    """Main inference loop that processes frames from the buffer"""
    global processed_frame_count
    
    print("🔄 Inference thread started")
    
    while inference_running:
        # Get the latest frame from buffer
        frame_data = frame_buffer.get()
        
        if frame_data is None:
            time.sleep(0.001)  # 1ms sleep if no frame available
            continue
        
        try:
            # Timing instrumentation
            timings = {}
            process_start = time.perf_counter()
            
            # Decode image
            decode_start = time.perf_counter()
            image_bytes = base64.b64decode(frame_data['bytes'])
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            timings['image_decode'] = (time.perf_counter() - decode_start) * 1000
            
            if image is None:
                continue
            
            # Store original dimensions BEFORE downscaling (FIX for skeleton offset)
            original_height, original_width = image.shape[:2]
            
            # Downscale for performance
            downscale_start = time.perf_counter()
            image = downscale_frame(image, target_short_side=384)
            timings['downscale'] = (time.perf_counter() - downscale_start) * 1000
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image.shape[:2]  # Downscaled dimensions
            
            # Process pose
            pose_start = time.perf_counter()
            pose_results = pose.process(image_rgb)
            timings['pose_detection'] = (time.perf_counter() - pose_start) * 1000
            
            # Process hands
            hands_start = time.perf_counter()
            hand_results = hands.process(image_rgb)
            timings['hand_detection'] = (time.perf_counter() - hands_start) * 1000
            
            # Extract body landmarks
            body_landmarks = []
            keypoints_2d = []
            pose_3d_angles = {}
            pose_3d_coords = {}
            
            if pose_results.pose_landmarks:
                landmarks = pose_results.pose_landmarks.landmark
                
                for idx, name in zip(MOVENET_INDICES, MOVENET_NAMES):
                    if idx < len(landmarks):
                        lm = landmarks[idx]
                        body_landmarks.append({
                            "name": name,
                            "x": round(lm.x * original_width, 1),  # Use ORIGINAL dimensions
                            "y": round(lm.y * original_height, 1),  # Use ORIGINAL dimensions
                            "confidence": round(lm.visibility * 100),
                            "visible": lm.visibility > 0.3,
                        })
                        keypoints_2d.append([lm.x, lm.y])
                
                # 3D pose estimation using MediaPipe world landmarks (only if use3D is True)
                use3D = frame_data.get('use3D', True)
                angles_start = time.perf_counter()
                if use3D and pose_results.pose_world_landmarks:
                    world_landmarks = pose_results.pose_world_landmarks.landmark
                    pose_3d_angles, pose_3d_coords = calculate_3d_angles_mediapipe(world_landmarks)
                timings['3d_calculation'] = (time.perf_counter() - angles_start) * 1000
            
            # Extract hand landmarks
            hand_landmarks = {"left": [], "right": []}
            
            if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
                for hand_idx, hand_lms in enumerate(hand_results.multi_hand_landmarks):
                    handedness = hand_results.multi_handedness[hand_idx].classification[0].label
                    hand_side = handedness.lower()
                    
                    hand_data = []
                    for lm_idx, lm in enumerate(hand_lms.landmark):
                        hand_data.append({
                            "name": HAND_LANDMARK_NAMES[lm_idx],
                            "x": round(lm.x * original_width, 1),  # Use ORIGINAL dimensions
                            "y": round(lm.y * original_height, 1),  # Use ORIGINAL dimensions
                            "z": round(lm.z, 3),
                            "normalized_x": round(lm.x, 3),
                            "normalized_y": round(lm.y, 3),
                        })
                    
                    hand_landmarks[hand_side] = hand_data
            
            # Apply EMA smoothing
            smooth_start = time.perf_counter()
            body_landmarks = smoother.smooth_body(body_landmarks)
            hand_landmarks = smoother.smooth_hands(hand_landmarks)
            if use3D:
                pose_3d_angles = smoother.smooth_3d_angles(pose_3d_angles)
                pose_3d_coords = smoother.smooth_3d_coords(pose_3d_coords)
            timings['smoothing'] = (time.perf_counter() - smooth_start) * 1000
            
            # Total backend time
            total_backend_time = (time.perf_counter() - process_start) * 1000
            timings['total_backend'] = total_backend_time
            
            processed_frame_count += 1
            
            # Get dropped frame stats
            dropped = frame_buffer.get_stats()
            
            # Log performance every 30 frames
            if processed_frame_count % 30 == 0:
                print(f"⚡ Backend [Frame {processed_frame_count}]: "
                      f"Decode: {timings['image_decode']:.1f}ms | "
                      f"Downscale: {timings['downscale']:.1f}ms | "
                      f"Pose: {timings['pose_detection']:.1f}ms | "
                      f"3D: {timings.get('3d_calculation', 0):.1f}ms | "
                      f"Hands: {timings['hand_detection']:.1f}ms | "
                      f"Smooth: {timings['smoothing']:.1f}ms | "
                      f"TOTAL: {total_backend_time:.1f}ms | "
                      f"Dropped: {dropped}")
            
            # Emit result back to client via WebSocket
            socketio.emit('pose_result', {
                'body': body_landmarks,
                'hands': hand_landmarks,
                'pose_3d_angles': pose_3d_angles if use3D else {},
                'pose_3d_coords': pose_3d_coords if use3D else {},
                'timings': timings,
                'sequence': frame_data['sequence'],
                'mode': '3D' if use3D else '2D'
            })
            
        except Exception as e:
            print(f"❌ Error in inference loop: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print("🛑 Inference thread stopped")

# =============================================================================
# WebSocket Event Handlers
# =============================================================================
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    global inference_running, inference_thread
    
    print("🔌 Client connected via WebSocket")
    
    # Start inference thread if not running
    if not inference_running:
        inference_running = True
        inference_thread = threading.Thread(target=inference_loop, daemon=True)
        inference_thread.start()

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print("🔌 Client disconnected")

@socketio.on('frame')
def handle_frame(data):
    """
    Receive frame from client and put in latest-wins buffer.
    Old frames are automatically discarded.
    """
    try:
        frame_bytes = data.get('image')
        timestamp = data.get('timestamp', time.time())
        sequence = data.get('sequence', 0)
        use3D = data.get('use3D', True)  # Get mode from client
        
        # Put frame in buffer (overwrites any existing frame)
        frame_buffer.put(frame_bytes, timestamp, sequence, use3D)
        
    except Exception as e:
        print(f"❌ Error receiving frame: {e}")

# =============================================================================
# Health Check Endpoint
# =============================================================================
@socketio.on('health')
def handle_health():
    """Health check endpoint"""
    emit('health_response', {'status': 'ok'})

# =============================================================================
# Server Startup
# =============================================================================
if __name__ == "__main__":
    print("🚀 LiveDance Python Backend Starting (WebSocket Mode)...")
    print("📡 Server running at http://localhost:8000")
    print("💃 Ready to track dance poses with latest-wins buffer!")
    print("🎯 Features: LIVE_STREAM mode | EMA smoothing | Frame downscaling | Coordinate fixes")
    socketio.run(app, host="0.0.0.0", port=8000, debug=False, allow_unsafe_werkzeug=True)
