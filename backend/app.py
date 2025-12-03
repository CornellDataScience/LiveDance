"""
LiveDance Backend - Python Pose Estimation Server with WebSocket
Flask-SocketIO server with latest-wins buffer for stable real-time pose estimation
Uses MediaPipe for both body and hand tracking with LIVE_STREAM mode
"""

from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import mediapipe as mp
import cv2
import numpy as np
from PIL import Image
from youtube_downloader import YouTubeDownloader
import os
import torch
import torch.nn as nn
from collections import deque
import math
import time
import base64
import threading
from io import BytesIO
import random # Needed for mock comparison function
from pathlib import Path
import json 
from datetime import datetime


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', ping_timeout=60, ping_interval=25)

# Initialize YouTube downloader
youtube_downloader = YouTubeDownloader(output_dir="downloads")

# =============================================================================
# ENHANCED ERROR TRACKING WITH SCREENSHOTS
# =============================================================================
class MistakeTracker:
    """
    Enhanced tracker that captures screenshots of major errors and generates
    comprehensive reports with visual comparisons.
    """
    def __init__(self, max_mistakes=1000, screenshot_dir="mistake_screenshots"):
        self.max_mistakes = max_mistakes
        self.screenshot_dir = Path(screenshot_dir)
        self.screenshot_dir.mkdir(exist_ok=True)
        
        # Stores: [{'joint': str, 'error_score': float, 'timestamp': float, 
        #           'frame': int, 'screenshot_path': str}, ...]
        self.error_history = deque(maxlen=max_mistakes)
        self.error_counts = {}  # {joint: count}
        self.major_errors = []  # Errors > 15 degrees for screenshots
        self.session_start_time = time.time()
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.lock = threading.Lock()
        
        # Thresholds
        self.ERROR_THRESHOLD = 5.0  # Minimum error to log
        self.SCREENSHOT_THRESHOLD = 15.0  # Minimum error for screenshot

    def log_error(self, joint_name, error_score, timestamp, sequence, frame_image=None):
        """
        Logs an error event. If error is severe (>15 degrees) and frame_image 
        is provided, saves a screenshot for later comparison.
        
        Args:
            joint_name: Name of the joint with error
            error_score: Angle difference in degrees
            timestamp: Time of error
            sequence: Frame sequence number
            frame_image: OpenCV image (BGR format) to save as screenshot
        """
        with self.lock:
            if error_score > self.ERROR_THRESHOLD:
                error_entry = {
                    'joint': joint_name,
                    'error_score': round(error_score, 2),
                    'timestamp': round(timestamp, 2),
                    'frame': sequence,
                    'screenshot_path': None
                }
                
                # Capture screenshot for major errors
                if error_score > self.SCREENSHOT_THRESHOLD and frame_image is not None:
                    screenshot_filename = (
                        f"{self.session_id}_frame{sequence}_{joint_name}_"
                        f"{int(error_score)}deg.jpg"
                    )
                    screenshot_path = self.screenshot_dir / screenshot_filename
                    
                    # Save with annotation overlay
                    annotated_frame = self._annotate_frame(
                        frame_image.copy(), joint_name, error_score
                    )
                    cv2.imwrite(str(screenshot_path), annotated_frame)
                    
                    error_entry['screenshot_path'] = str(screenshot_path)
                    self.major_errors.append(error_entry)
                
                self.error_history.append(error_entry)
                self.error_counts[joint_name] = self.error_counts.get(joint_name, 0) + 1

    def _annotate_frame(self, frame, joint_name, error_score):
        """Add error information overlay to frame"""
        height, width = frame.shape[:2]
        
        # Semi-transparent red overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, 80), (0, 0, 200), -1)
        frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
        
        # Error text
        text = f"ERROR: {joint_name.replace('_', ' ').title()}"
        error_text = f"{error_score:.1f} degree deviation"
        
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.8, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, error_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.7, (255, 255, 255), 2, cv2.LINE_AA)
        
        return frame

    def get_comprehensive_report(self):
        """
        Generates a comprehensive end-of-session report with:
        1. Top 10 most frequent mistakes
        2. Top 10 largest individual errors (with screenshots)
        3. Overall performance summary
        4. Improvement suggestions
        """
        with self.lock:
            session_duration = time.time() - self.session_start_time
            
            if not self.error_history:
                return {
                    "session_summary": {
                        "duration_seconds": round(session_duration, 1),
                        "total_errors": 0,
                        "major_errors": 0,
                        "performance_grade": "Perfect!"
                    },
                    "frequent_mistakes": [],
                    "worst_moments": [],
                    "improvement_plan": ["Keep up the excellent work!"]
                }

            # 1. Most Frequent Mistakes
            frequent_mistakes = sorted(
                self.error_counts.items(),
                key=lambda item: item[1],
                reverse=True
            )[:10]

            frequent_report = [
                {
                    "joint": joint,
                    "count": count,
                    "percentage": round(count / len(self.error_history) * 100, 1)
                } 
                for joint, count in frequent_mistakes
            ]

            # 2. Worst Individual Moments (with screenshots)
            worst_moments = sorted(
                [e for e in self.error_history if e['screenshot_path']],
                key=lambda x: x['error_score'],
                reverse=True
            )[:10]

            worst_report = [
                {
                    "joint": item['joint'],
                    "error_score": item['error_score'],
                    "timestamp": item['timestamp'],
                    "frame": item['frame'],
                    "screenshot": item['screenshot_path'],
                    "time_formatted": f"{int(item['timestamp'] // 60)}:{int(item['timestamp'] % 60):02d}",
                    "suggestion": self._get_improvement_suggestion(item['joint'], item['error_score'])
                } 
                for item in worst_moments
            ]

            # 3. Performance Grade
            avg_error = sum(e['error_score'] for e in self.error_history) / len(self.error_history)
            grade = self._calculate_grade(avg_error, len(self.major_errors))

            # 4. Improvement Plan
            improvement_plan = self._generate_improvement_plan(frequent_report, worst_report)

            return {
                "session_summary": {
                    "session_id": self.session_id,
                    "duration_seconds": round(session_duration, 1),
                    "duration_formatted": f"{int(session_duration // 60)}m {int(session_duration % 60)}s",
                    "total_errors": len(self.error_history),
                    "major_errors": len(self.major_errors),
                    "average_error_degrees": round(avg_error, 2),
                    "performance_grade": grade
                },
                "frequent_mistakes": frequent_report,
                "worst_moments": worst_report,
                "improvement_plan": improvement_plan,
                "screenshot_directory": str(self.screenshot_dir)
            }

    def _get_improvement_suggestion(self, joint_name, error_score):
        """Generate specific improvement suggestion based on joint and error"""
        suggestions = {
            "left_elbow": "Keep your left elbow aligned with your shoulder. Practice arm extensions slowly.",
            "right_elbow": "Watch your right arm angle. Try mirror practice to check form.",
            "left_knee": "Maintain proper left knee bend. Focus on leg strength exercises.",
            "right_knee": "Your right knee alignment needs work. Practice squats for stability.",
            "left_shoulder": "Relax your left shoulder and maintain natural posture.",
            "right_shoulder": "Your right shoulder tends to drift. Check your upper body alignment.",
            "left_hip": "Engage your core to stabilize left hip movement.",
            "right_hip": "Focus on right hip positioning during transitions."
        }
        
        base_suggestion = suggestions.get(joint_name, f"Pay attention to {joint_name.replace('_', ' ')} positioning.")
        
        if error_score > 25:
            return f"CRITICAL: {base_suggestion} This needs immediate attention."
        elif error_score > 15:
            return f"IMPORTANT: {base_suggestion}"
        else:
            return base_suggestion

    def _calculate_grade(self, avg_error, major_error_count):
        """Calculate performance grade based on errors"""
        if major_error_count == 0 and avg_error < 5:
            return "A+ Excellent!"
        elif major_error_count <= 2 and avg_error < 8:
            return "A Great performance!"
        elif major_error_count <= 5 and avg_error < 10:
            return "B+ Good work!"
        elif major_error_count <= 8 and avg_error < 12:
            return "B Nice effort!"
        elif major_error_count <= 12 and avg_error < 15:
            return "C+ Keep practicing!"
        else:
            return "C Room for improvement!"

    def _generate_improvement_plan(self, frequent_mistakes, worst_moments):
        """Generate personalized improvement recommendations"""
        plan = []
        
        if not frequent_mistakes:
            return ["Excellent form! Keep practicing to maintain consistency."]
        
        # Top problem area
        top_issue = frequent_mistakes[0]['joint']
        plan.append(f"PRIMARY FOCUS: Work on your {top_issue.replace('_', ' ')}. "
                   f"This was your most frequent issue ({frequent_mistakes[0]['count']} times).")
        
        # If there are multiple problem areas
        if len(frequent_mistakes) > 1:
            problem_joints = [m['joint'].replace('_', ' ') for m in frequent_mistakes[1:4]]
            plan.append(f"SECONDARY FOCUS: Also pay attention to {', '.join(problem_joints)}.")
        
        # Worst moment advice
        if worst_moments:
            worst = worst_moments[0]
            plan.append(f"CRITICAL MOMENT: At {worst['time_formatted']}, your {worst['joint'].replace('_', ' ')} "
                       f"had a {worst['error_score']}° deviation. Review this screenshot carefully.")
        
        # General advice based on error patterns
        if frequent_mistakes[0]['percentage'] > 40:
            plan.append("CONSISTENCY TIP: One joint is causing most issues. Focus intensive practice on this area.")
        else:
            plan.append("CONSISTENCY TIP: Errors are spread across multiple joints. Work on overall body awareness.")
        
        return plan

    def export_report_json(self):
        """Export report as JSON file"""
        report = self.get_comprehensive_report()
        report_path = self.screenshot_dir / f"report_{self.session_id}.json"
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        return str(report_path)
    
    def reset_tracker(self):
        """Start a new session"""
        with self.lock:
            self.error_history.clear()
            self.error_counts.clear()
            self.major_errors.clear()
            self.session_start_time = time.time()
            self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

# =============================================================================
# Global mistake tracker instance and mock comparison
# =============================================================================

# Global mistake tracker instance
mistake_tracker = MistakeTracker(max_mistakes=1000)

def mock_pose_comparison(pose_angles):
    """
    MOCK function to simulate comparison and error scoring (difference in degrees).
    In a real system, this would compare the user's `pose_angles` to the 
    pre-calculated reference pose angles for the current frame.
    """
    mock_errors = {}
    if not pose_angles:
        return mock_errors
    
    for joint in pose_angles.keys():
        # 5% chance of a "major" mistake (15-35 degree error)
        if random.random() < 0.05:
            error = random.uniform(15.0, 35.0)
        # 95% chance of a minor error or correct pose (0.5-10 degree error)
        else:
            error = random.uniform(0.5, 10.0) 
        
        mock_errors[joint] = error
        
    return mock_errors

# Global tracking state
tracking_active = False
tracking_lock = threading.Lock()


# =============================================================================
# UPDATED ENDPOINT ROUTES
# =============================================================================

@app.route("/get_mistake_report", methods=["GET"])
def get_mistake_report_endpoint():
    """Returns comprehensive mistake report with screenshots"""
    try:
        report = mistake_tracker.get_comprehensive_report()
        return jsonify({"success": True, "report": report}), 200
    except Exception as e:
        print(f"Error generating mistake report: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/export_report", methods=["GET"])
def export_report_endpoint():
    """Export report as downloadable JSON file"""
    try:
        report_path = mistake_tracker.export_report_json()
        return send_file(report_path, as_attachment=True)
    except Exception as e:
        print(f"Error exporting report: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/screenshot/<path:filename>", methods=["GET"])
def serve_screenshot(filename):
    """Serve screenshot images from mistake tracking"""
    try:
        screenshot_dir = mistake_tracker.screenshot_dir
        return send_from_directory(screenshot_dir, filename)
    except Exception as e:
        print(f"Error serving screenshot: {e}")
        return jsonify({"success": False, "error": str(e)}), 404

@app.route("/reset_mistakes", methods=["POST"])
def reset_mistakes_endpoint():
    """Reset tracker for new session"""
    try:
        mistake_tracker.reset_tracker()
        return jsonify({"success": True, "message": "New session started"}), 200
    except Exception as e:
        print(f"Error resetting tracker: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/start_tracking", methods=["POST"])
def start_tracking_endpoint():
    """
    Start tracking mistakes for a new dance session.
    Resets the tracker and enables error logging.
    """
    global tracking_active
    try:
        with tracking_lock:
            tracking_active = True
            mistake_tracker.reset_tracker()
        
        print("🎬 Mistake tracking STARTED")
        return jsonify({
            "success": True, 
            "message": "Tracking started",
            "session_id": mistake_tracker.session_id
        }), 200
    except Exception as e:
        print(f"Error starting tracking: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/stop_tracking", methods=["POST"])
def stop_tracking_endpoint():
    """
    Stop tracking mistakes and return the comprehensive report.
    This is called when the user clicks "Stop" after their dance session.
    """
    global tracking_active
    try:
        with tracking_lock:
            tracking_active = False
        
        # Generate the comprehensive report
        report = mistake_tracker.get_comprehensive_report()
        
        print(f"🛑 Mistake tracking STOPPED - Generated report for session {mistake_tracker.session_id}")
        print(f"   Total errors: {report['session_summary']['total_errors']}")
        print(f"   Major errors: {report['session_summary']['major_errors']}")
        print(f"   Performance: {report['session_summary']['performance_grade']}")
        
        return jsonify({
            "success": True, 
            "message": "Tracking stopped",
            "report": report
        }), 200
    except Exception as e:
        print(f"Error stopping tracking: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/tracking_status", methods=["GET"])
def get_tracking_status():
    """Check if tracking is currently active"""
    global tracking_active
    with tracking_lock:
        return jsonify({
            "tracking_active": tracking_active,
            "session_id": mistake_tracker.session_id if tracking_active else None
        }), 200


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

# Initialize detectors for WebSocket (LIVE_STREAM mode)
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

# Create SEPARATE pose and hands detectors for HTTP endpoints (camera/reference)
pose_camera = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

hands_camera = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

pose_reference = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

hands_reference = mp_hands.Hands(
    static_image_mode=True,
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

# Subset of hand landmarks – only finger tips and bases to reduce payload
HAND_LANDMARK_SELECTION = [
    ("wrist", 0),
    ("thumb_cmc", 1),
    ("thumb_tip", 4),
    ("index_mcp", 5),
    ("index_tip", 8),
    ("middle_mcp", 9),
    ("middle_tip", 12),
    ("ring_mcp", 13),
    ("ring_tip", 16),
    ("pinky_mcp", 17),
    ("pinky_tip", 20),
]
HAND_LANDMARK_NAMES = [name for name, _ in HAND_LANDMARK_SELECTION]

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

                    if hand_side not in hand_landmarks:
                        continue

                    hand_data = []
                    for landmark_name, mp_index in HAND_LANDMARK_SELECTION:
                        if mp_index >= len(hand_lms.landmark):
                            continue
                        lm = hand_lms.landmark[mp_index]
                        hand_data.append({
                            "name": landmark_name,
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

                # Only log errors if tracking is active
                with tracking_lock:
                    is_tracking = tracking_active
                
                if is_tracking:
                    # Mock Pose Comparison and Error Logging WITH SCREENSHOTS
                    error_scores = mock_pose_comparison(pose_3d_angles)
                    current_time = time.time() - mistake_tracker.session_start_time  # Relative time
                    
                    # Find the maximum error for this frame
                    max_error = max(error_scores.values()) if error_scores else 0
                    
                    # Only pass the frame for screenshot if there's a major error
                    frame_to_save = image if max_error > 15.0 else None
                    
                    for joint, score in error_scores.items():
                        mistake_tracker.log_error(
                            joint, 
                            score, 
                            current_time, 
                            frame_data['sequence'],
                            frame_image=frame_to_save  # Only passed once per frame for max error
                        )

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
            with tracking_lock:
                is_tracking = tracking_active
            
            socketio.emit('pose_result', {
                'body': body_landmarks,
                'hands': hand_landmarks,
                'pose_3d_angles': pose_3d_angles if use3D else {},
                'pose_3d_coords': pose_3d_coords if use3D else {},
                'timings': timings,
                'sequence': frame_data['sequence'],
                'mode': '3D' if use3D else '2D',
                'tracking_active': is_tracking  # NEW: Let frontend know tracking status
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
# NEW: HTTP Endpoints for Mistake Reporting
# =============================================================================

@app.route("/reset_mistakes", methods=["POST"])
def reset_mistakes_endpoint():
    """Resets the internal mistake tracker history."""
    try:
        mistake_tracker.reset_tracker()
        return jsonify({"success": True, "message": "Mistake history reset."}), 200
    except Exception as e:
        print(f"Error resetting mistake tracker: {e}")
        return jsonify({"success": False, "error": "Could not reset tracker"}), 500


# =============================================================================
# HTTP Endpoints for YouTube Download and Video Serving (EXISTING)
# =============================================================================

@app.route("/estimate_pose", methods=["POST"])
def estimate_pose():
    """
    Process CAMERA FEED frame and return body and hand landmarks (HTTP fallback)
    Uses dedicated camera pose estimator instances
    Expects: multipart/form-data with 'frame' image file
    Returns: JSON with body and hands landmark data
    """
    try:
        # Get image from request
        if "frame" not in request.files:
            return jsonify({"error": "No frame provided"}), 400

        file = request.files["frame"]

        # Convert to OpenCV image
        image = Image.open(BytesIO(file.read()))
        image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Get image dimensions
        height, width = image.shape[:2]

        # Convert to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Process body pose using CAMERA-SPECIFIC instance
        pose_results = pose_camera.process(image_rgb)
        body_landmarks = []

        if pose_results.pose_landmarks:
            landmarks = pose_results.pose_landmarks.landmark

            # Extract only the 17 keypoints matching MoveNet format
            for idx, name in zip(MOVENET_INDICES, MOVENET_NAMES):
                if idx < len(landmarks):
                    lm = landmarks[idx]
                    body_landmarks.append({
                        "name": name,
                        "x": round(lm.x * width, 1),
                        "y": round(lm.y * height, 1),
                        "confidence": round(lm.visibility * 100),
                        "visible": lm.visibility > 0.3,
                    })

        # Process hands using CAMERA-SPECIFIC instance
        hand_results = hands_camera.process(image_rgb)
        hand_landmarks = {"left": [], "right": []}

        if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
            for hand_idx, hand_lms in enumerate(hand_results.multi_hand_landmarks):
                handedness = hand_results.multi_handedness[hand_idx].classification[0].label
                hand_side = handedness.lower()

                hand_data = []
                for lm_idx, lm in enumerate(hand_lms.landmark):
                    hand_data.append({
                        "name": HAND_LANDMARK_NAMES[lm_idx],
                        "x": round(lm.x * width, 1),
                        "y": round(lm.y * height, 1),
                        "z": round(lm.z, 3),
                        "normalized_x": round(lm.x, 3),
                        "normalized_y": round(lm.y, 3),
                    })

                hand_landmarks[hand_side] = hand_data

        # Return results
        return jsonify({"body": body_landmarks, "hands": hand_landmarks})

    except Exception as e:
        print(f"Error processing camera frame: {e}")
        return jsonify({"body": [], "hands": {"left": [], "right": []}}), 200


@app.route("/estimate_pose_reference", methods=["POST"])
def estimate_pose_reference():
    """
    Process REFERENCE VIDEO frame and return body and hand landmarks
    Uses dedicated reference video pose estimator instances
    Expects: multipart/form-data with 'frame' image file
    Returns: JSON with body and hands landmark data
    """
    try:
        # Get image from request
        if "frame" not in request.files:
            return jsonify({"error": "No frame provided"}), 400

        file = request.files["frame"]

        # Convert to OpenCV image
        image = Image.open(BytesIO(file.read()))
        image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Get image dimensions
        height, width = image.shape[:2]

        # Convert to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Process body pose using REFERENCE-SPECIFIC instance
        pose_results = pose_reference.process(image_rgb)
        body_landmarks = []

        if pose_results.pose_landmarks:
            landmarks = pose_results.pose_landmarks.landmark

            # Extract only the 17 keypoints matching MoveNet format
            for idx, name in zip(MOVENET_INDICES, MOVENET_NAMES):
                if idx < len(landmarks):
                    lm = landmarks[idx]
                    body_landmarks.append({
                        "name": name,
                        "x": round(lm.x * width, 1),
                        "y": round(lm.y * height, 1),
                        "confidence": round(lm.visibility * 100),
                        "visible": lm.visibility > 0.3,
                    })

        # Process hands using REFERENCE-SPECIFIC instance
        hand_results = hands_reference.process(image_rgb)
        hand_landmarks = {"left": [], "right": []}

        if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
            for hand_idx, hand_lms in enumerate(hand_results.multi_hand_landmarks):
                handedness = hand_results.multi_handedness[hand_idx].classification[0].label
                hand_side = handedness.lower()

                hand_data = []
                for lm_idx, lm in enumerate(hand_lms.landmark):
                    hand_data.append({
                        "name": HAND_LANDMARK_NAMES[lm_idx],
                        "x": round(lm.x * width, 1),
                        "y": round(lm.y * height, 1),
                        "z": round(lm.z, 3),
                        "normalized_x": round(lm.x, 3),
                        "normalized_y": round(lm.y, 3),
                    })

                hand_landmarks[hand_side] = hand_data

        # Return results
        return jsonify({"body": body_landmarks, "hands": hand_landmarks})

    except Exception as e:
        print(f"Error processing reference frame: {e}")
        return jsonify({"body": [], "hands": {"left": [], "right": []}}), 200


@app.route("/download_video", methods=["POST"])
def download_video():
    """
    Download a YouTube video for pose analysis
    Expects: JSON with 'url', optional 'filename', 'audio_only', 'quality'
    Returns: JSON with download status and file info
    """
    try:
        data = request.get_json()

        if not data or "url" not in data:
            return jsonify({"error": "No URL provided"}), 400

        url = data["url"]
        filename = data.get("filename")
        audio_only = data.get("audio_only", False)
        quality = data.get("quality", "best")
        cookies_file = data.get("cookies_file")

        # Download the video
        result = youtube_downloader.download_video(
            url=url,
            output_filename=filename,
            audio_only=audio_only,
            quality=quality,
            cookies_file=cookies_file,
        )

        if result["success"]:
            return jsonify({
                "success": True,
                "filepath": result["filepath"],
                "title": result["title"],
                "duration": result["duration"],
                "message": "Video downloaded successfully"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/video_info", methods=["POST"])
def get_video_info():
    """
    Get YouTube video information without downloading
    Expects: JSON with 'url'
    Returns: JSON with video metadata
    """
    try:
        data = request.get_json()

        if not data or "url" not in data:
            return jsonify({"error": "No URL provided"}), 400

        url = data["url"]
        info = youtube_downloader.get_video_info(url)

        if info["success"]:
            return jsonify(info), 200
        else:
            return jsonify({
                "success": False,
                "error": info["error"]
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/list_downloads", methods=["GET"])
def list_downloads():
    """
    List all downloaded videos
    Returns: JSON with list of video files
    """
    try:
        downloads_dir = youtube_downloader.output_dir
        print(f"\n[DEBUG] list_downloads called")
        print(f"[DEBUG] Downloads directory: {downloads_dir}")
        print(f"[DEBUG] Directory exists: {downloads_dir.exists()}")

        if not downloads_dir.exists():
            print(f"[DEBUG] Downloads directory does not exist, returning empty list")
            return jsonify({"files": []}), 200

        files = []
        print(f"[DEBUG] Scanning directory for video files...")
        for file in downloads_dir.iterdir():
            print(f"[DEBUG] Found file: {file.name} (is_file: {file.is_file()}, suffix: {file.suffix})")
            if file.is_file() and file.suffix in [".mp4", ".m4a"]:
                file_info = {
                    "filename": file.name,
                    "size": file.stat().st_size,
                    "path": str(file),
                }
                files.append(file_info)
                print(f"[DEBUG] Added to list: {file_info}")

        print(f"[DEBUG] Total files found: {len(files)}")
        print(f"[DEBUG] Returning: {files}")
        return jsonify({"files": files}), 200

    except Exception as e:
        print(f"[ERROR] list_downloads failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/video/<path:filename>", methods=["GET"])
def serve_video(filename):
    """
    Serve a video file from the downloads directory
    Supports range requests for video seeking
    """
    try:
        downloads_dir = youtube_downloader.output_dir
        video_path = downloads_dir / filename

        print(f"\n[DEBUG] serve_video called")
        print(f"[DEBUG] Requested filename: {filename}")
        print(f"[DEBUG] Full path: {video_path}")
        print(f"[DEBUG] File exists: {video_path.exists()}")

        if not video_path.exists():
            return jsonify({"success": False, "error": "Video not found"}), 404

        # Get file size
        file_size = video_path.stat().st_size

        # Check for range request
        range_header = request.headers.get('Range')

        if range_header:
            # Parse range header
            byte_range = range_header.replace('bytes=', '').split('-')
            start = int(byte_range[0]) if byte_range[0] else 0
            end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else file_size - 1

            # Read the requested chunk
            with open(video_path, 'rb') as f:
                f.seek(start)
                chunk_size = end - start + 1
                data = f.read(chunk_size)

            # Create response with proper headers for range request
            response = Response(
                data,
                206,  # Partial Content
                mimetype='video/mp4',
                direct_passthrough=True
            )
            response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
            response.headers.add('Accept-Ranges', 'bytes')
            response.headers.add('Content-Length', str(chunk_size))

            print(f"[DEBUG] Serving range: {start}-{end}/{file_size}")
            return response
        else:
            # Serve entire file
            print(f"[DEBUG] Serving entire file ({file_size} bytes)")
            response = send_from_directory(
                downloads_dir,
                filename,
                as_attachment=False,
                mimetype='video/mp4'
            )
            response.headers.add('Accept-Ranges', 'bytes')
            return response

    except Exception as e:
        print(f"[ERROR] serve_video failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 404


# =============================================================================
# Server Startup
# =============================================================================
if __name__ == "__main__":
    print("🚀 LiveDance Python Backend Starting...")
    print("📡 Server running at http://localhost:8000")
    print("💃 Ready to track dance poses!")
    print("🎯 Features:")
    print("   - WebSocket mode with latest-wins buffer")
    print("   - 3D pose estimation with joint angles")
    print("   - EMA smoothing for stability")
    print("   - Frame downscaling for performance")
    print("   - YouTube video download & serving")
    print("   - HTTP fallback endpoints")
    print("   - NEW: Mistake Tracking and Reporting")
    socketio.run(app, host="0.0.0.0", port=8000, debug=False, allow_unsafe_werkzeug=True)