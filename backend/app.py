"""
LiveDance Backend - Python Pose Estimation Server
Flask server that processes video frames and returns pose landmarks
Uses MediaPipe for both body and hand tracking
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import torch
import torch.nn as nn
from collections import deque
import math
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

# Create pose and hands detectors
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# Landmark names
BODY_KEYPOINT_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]

# Map to match MoveNet keypoint order (simplified to 17 points)
MOVENET_INDICES = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
MOVENET_NAMES = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

HAND_LANDMARK_NAMES = [
    "wrist",
    "thumb_cmc",
    "thumb_mcp",
    "thumb_ip",
    "thumb_tip",
    "index_mcp",
    "index_pip",
    "index_dip",
    "index_tip",
    "middle_mcp",
    "middle_pip",
    "middle_dip",
    "middle_tip",
    "ring_mcp",
    "ring_pip",
    "ring_dip",
    "ring_tip",
    "pinky_mcp",
    "pinky_pip",
    "pinky_dip",
    "pinky_tip",
]

# =============================================================================
# METHOD 1: MediaPipe 3D World Landmarks
# =============================================================================

def calculate_3d_angles_mediapipe(landmarks_3d):
    """
    Calculate joint angles and coordinates from MediaPipe 3D world landmarks
    """
    angles = {}
    coordinates = {}
    
    if len(landmarks_3d) < 33:  # MediaPipe pose has 33 landmarks
        return angles, coordinates
    
    # Store coordinates for key joints
    key_joints = {
        'left_shoulder': 11, 'right_shoulder': 12,
        'left_elbow': 13, 'right_elbow': 14,
        'left_wrist': 15, 'right_wrist': 16,
        'left_hip': 23, 'right_hip': 24,
        'left_knee': 25, 'right_knee': 26,
        'left_ankle': 27, 'right_ankle': 28
    }
    
    for joint_name, idx in key_joints.items():
        if idx < len(landmarks_3d):
            lm = landmarks_3d[idx]
            coordinates[joint_name] = {
                'x': round(lm.x, 3),
                'y': round(lm.y, 3), 
                'z': round(lm.z, 3)
            }
    
    # Define joint connections for angle calculations
    joint_pairs = {
        'left_elbow': (11, 13, 15),  # shoulder, elbow, wrist
        'right_elbow': (12, 14, 16),
        'left_knee': (23, 25, 27),   # hip, knee, ankle
        'right_knee': (24, 26, 28),
        'left_shoulder': (11, 12, 13),  # shoulder angle
        'right_shoulder': (12, 11, 14),
        'left_hip': (23, 24, 25),     # hip angle
        'right_hip': (24, 23, 26),
    }
    
    for angle_name, (p1_idx, p2_idx, p3_idx) in joint_pairs.items():
        if p1_idx < len(landmarks_3d) and p2_idx < len(landmarks_3d) and p3_idx < len(landmarks_3d):
            p1 = np.array([landmarks_3d[p1_idx].x, landmarks_3d[p1_idx].y, landmarks_3d[p1_idx].z])
            p2 = np.array([landmarks_3d[p2_idx].x, landmarks_3d[p2_idx].y, landmarks_3d[p2_idx].z])
            p3 = np.array([landmarks_3d[p3_idx].x, landmarks_3d[p3_idx].y, landmarks_3d[p3_idx].z])
            
            # Calculate vectors
            v1 = p1 - p2
            v2 = p3 - p2
            
            # Calculate angle in degrees
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            cos_angle = np.clip(cos_angle, -1.0, 1.0)  # Clamp to avoid numerical errors
            angle = np.arccos(cos_angle) * 180.0 / np.pi
            
            angles[angle_name] = round(angle, 1)
    
    return angles, coordinates

# =============================================================================
# METHOD 2: Temporal 1D-Conv Model for 3D Pose Estimation
# =============================================================================

class TemporalPose3D(nn.Module):
    """
    Small temporal 1D-conv model for 3D pose estimation from 2D keypoints
    Based on VideoPose3D architecture but simplified
    """
    def __init__(self, input_dim=34, hidden_dim=64, output_dim=51, temporal_window=9):
        super(TemporalPose3D, self).__init__()
        self.temporal_window = temporal_window
        self.input_dim = input_dim  # 17 keypoints * 2 (x, y)
        self.output_dim = output_dim  # 17 keypoints * 3 (x, y, z)
        
        # Temporal convolution layers
        self.conv1 = nn.Conv1d(input_dim, hidden_dim, kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(hidden_dim, hidden_dim, kernel_size=3, padding=1)
        self.conv3 = nn.Conv1d(hidden_dim, hidden_dim, kernel_size=3, padding=1)
        
        # Output layer
        self.output_conv = nn.Conv1d(hidden_dim, output_dim, kernel_size=1)
        
        # Activation and normalization
        self.relu = nn.ReLU()
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim)
        self.bn3 = nn.BatchNorm1d(hidden_dim)
        
    def forward(self, x):
        # x shape: (batch, temporal_window, input_dim)
        x = x.transpose(1, 2)  # (batch, input_dim, temporal_window)
        
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.relu(self.bn3(self.conv3(x)))
        
        x = self.output_conv(x)
        x = x.transpose(1, 2)  # (batch, temporal_window, output_dim)
        
        # Return only the last frame's prediction
        return x[:, -1, :]  # (batch, output_dim)

# Global temporal model and buffer
temporal_model = None
pose_buffer = deque(maxlen=9)  # Buffer for 9 frames

def initialize_temporal_model():
    """Initialize the temporal model"""
    global temporal_model
    if temporal_model is None:
        temporal_model = TemporalPose3D(input_dim=34, hidden_dim=64, output_dim=51, temporal_window=9)
        # Load pre-trained weights if available, otherwise use random initialization
        # temporal_model.load_state_dict(torch.load('temporal_pose3d.pth'))
        temporal_model.eval()

def predict_3d_pose_temporal(keypoints_2d):
    """
    Predict 3D pose using temporal model
    keypoints_2d: list of 2D keypoints (17 points with x, y coordinates)
    """
    global temporal_model, pose_buffer
    
    if temporal_model is None:
        initialize_temporal_model()
    
    # Convert to numpy array and normalize
    keypoints_array = np.array(keypoints_2d).flatten()  # Shape: (34,)
    
    # Add to buffer
    pose_buffer.append(keypoints_array)
    
    # Need at least temporal_window frames
    if len(pose_buffer) < temporal_model.temporal_window:
        return None
    
    # Convert buffer to tensor
    buffer_array = np.array(list(pose_buffer))  # Shape: (temporal_window, 34)
    buffer_tensor = torch.FloatTensor(buffer_array).unsqueeze(0)  # Shape: (1, temporal_window, 34)
    
    # Predict 3D pose
    with torch.no_grad():
        pose_3d = temporal_model(buffer_tensor)  # Shape: (1, 51)
        pose_3d = pose_3d.squeeze(0).numpy()  # Shape: (51,)
    
    # Reshape to (17, 3)
    pose_3d = pose_3d.reshape(17, 3)
    
    return pose_3d

def calculate_3d_angles_temporal(pose_3d):
    """
    Calculate joint angles and coordinates from temporal model 3D pose
    pose_3d: numpy array of shape (17, 3) with x, y, z coordinates
    """
    angles = {}
    coordinates = {}
    
    if pose_3d is None or pose_3d.shape != (17, 3):
        return angles, coordinates
    
    # Store coordinates for key joints (17-point format)
    key_joints = {
        'left_shoulder': 5, 'right_shoulder': 6,
        'left_elbow': 7, 'right_elbow': 8,
        'left_wrist': 9, 'right_wrist': 10,
        'left_hip': 11, 'right_hip': 12,
        'left_knee': 13, 'right_knee': 14,
        'left_ankle': 15, 'right_ankle': 16
    }
    
    for joint_name, idx in key_joints.items():
        if idx < 17:
            coordinates[joint_name] = {
                'x': round(float(pose_3d[idx][0]), 3),
                'y': round(float(pose_3d[idx][1]), 3),
                'z': round(float(pose_3d[idx][2]), 3)
            }
    
    # Define joint connections for angle calculations (using 17-point format)
    joint_pairs = {
        'left_elbow': (5, 7, 9),   # shoulder, elbow, wrist
        'right_elbow': (6, 8, 10),
        'left_knee': (11, 13, 15), # hip, knee, ankle
        'right_knee': (12, 14, 16),
        'left_shoulder': (5, 6, 7),  # shoulder angle
        'right_shoulder': (6, 5, 8),
        'left_hip': (11, 12, 13),    # hip angle
        'right_hip': (12, 11, 14),
    }
    
    for angle_name, (p1_idx, p2_idx, p3_idx) in joint_pairs.items():
        if p1_idx < 17 and p2_idx < 17 and p3_idx < 17:
            p1 = pose_3d[p1_idx]
            p2 = pose_3d[p2_idx]
            p3 = pose_3d[p3_idx]
            
            # Calculate vectors
            v1 = p1 - p2
            v2 = p3 - p2
            
            # Calculate angle in degrees
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            cos_angle = np.clip(cos_angle, -1.0, 1.0)  # Clamp to avoid numerical errors
            angle = np.arccos(cos_angle) * 180.0 / np.pi
            
            angles[angle_name] = round(angle, 1)
    
    return angles, coordinates


@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"}), 200


@app.route("/estimate_pose", methods=["POST"])
def estimate_pose():
    """
    Process video frame and return body and hand landmarks with 3D pose estimation
    Expects: multipart/form-data with 'image' file
    Returns: JSON with body, hands landmark data, and 3D pose angles
    """
    print("📥 Received pose estimation request")
    request_start = time.perf_counter()
    timings = {}
    
    try:
        # Get image from request
        if "image" not in request.files:
            print("❌ No 'image' field in request.files")
            return jsonify({"error": "No image provided"}), 400

        file = request.files["image"]
        print(f"✅ Received image file: {file.filename}")

        # Image decoding timing
        decode_start = time.perf_counter()
        image = Image.open(BytesIO(file.read()))
        image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        height, width = image.shape[:2]
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        timings['image_decode'] = (time.perf_counter() - decode_start) * 1000

        # Process body pose
        pose_start = time.perf_counter()
        pose_results = pose.process(image_rgb)
        timings['pose_detection'] = (time.perf_counter() - pose_start) * 1000
        
        body_landmarks = []
        pose_3d_angles = {}
        pose_3d_coords = {}

        if pose_results.pose_landmarks:
            print(f"✅ Detected {len(pose_results.pose_landmarks.landmark)} pose landmarks")
            landmarks = pose_results.pose_landmarks.landmark

            # Extract only the 17 keypoints matching MoveNet format
            keypoints_2d = []
            for idx, name in zip(MOVENET_INDICES, MOVENET_NAMES):
                if idx < len(landmarks):
                    lm = landmarks[idx]
                    body_landmarks.append(
                        {
                            "name": name,
                            "x": round(lm.x * width, 1),
                            "y": round(lm.y * height, 1),
                            "confidence": round(lm.visibility * 100),
                            "visible": lm.visibility > 0.3,
                        }
                    )
                    # Collect 2D keypoints for temporal model
                    keypoints_2d.append([lm.x, lm.y])

            # =============================================================================
            # 3D POSE ESTIMATION - CHOOSE ONE METHOD BY COMMENTING OUT THE OTHER
            # =============================================================================
            
            # METHOD 1: MediaPipe 3D World Landmarks (UNCOMMENT TO USE)
            # =============================================================================
            angles_start = time.perf_counter()
            if pose_results.pose_world_landmarks:
                world_landmarks = pose_results.pose_world_landmarks.landmark
                pose_3d_angles, pose_3d_coords = calculate_3d_angles_mediapipe(world_landmarks)
            timings['3d_calculation'] = (time.perf_counter() - angles_start) * 1000
            
            # METHOD 2: Temporal 1D-Conv Model (UNCOMMENT TO USE)
            # =============================================================================
            # angles_start = time.perf_counter()
            # if len(keypoints_2d) == 17:  # Ensure we have all 17 keypoints
            #     pose_3d = predict_3d_pose_temporal(keypoints_2d)
            #     if pose_3d is not None:
            #         pose_3d_angles, pose_3d_coords = calculate_3d_angles_temporal(pose_3d)
            # timings['3d_calculation'] = (time.perf_counter() - angles_start) * 1000

        # Process hands
        hands_start = time.perf_counter()
        hand_results = hands.process(image_rgb)
        hand_landmarks = {"left": [], "right": []}

        if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
            for hand_idx, hand_lms in enumerate(hand_results.multi_hand_landmarks):
                # Determine hand side
                handedness = (
                    hand_results.multi_handedness[hand_idx].classification[0].label
                )
                hand_side = handedness.lower()

                # Extract landmarks
                hand_data = []
                for lm_idx, lm in enumerate(hand_lms.landmark):
                    hand_data.append(
                        {
                            "name": HAND_LANDMARK_NAMES[lm_idx],
                            "x": round(lm.x * width, 1),
                            "y": round(lm.y * height, 1),
                            "z": round(lm.z, 3),
                            "normalized_x": round(lm.x, 3),
                            "normalized_y": round(lm.y, 3),
                        }
                    )

                hand_landmarks[hand_side] = hand_data
        
        timings['hand_detection'] = (time.perf_counter() - hands_start) * 1000

        # Calculate total backend time
        total_backend_time = (time.perf_counter() - request_start) * 1000
        timings['total_backend'] = total_backend_time
        
        # Log performance to console
        print(f"🔥 Backend: Decode: {timings['image_decode']:.1f}ms | "
              f"Pose: {timings['pose_detection']:.1f}ms | "
              f"3D: {timings.get('3d_calculation', 0):.1f}ms | "
              f"Hands: {timings['hand_detection']:.1f}ms | "
              f"TOTAL: {total_backend_time:.1f}ms")

        # Return results with 3D pose angles and coordinates
        return jsonify({
            "body": body_landmarks, 
            "hands": hand_landmarks,
            "pose_3d_angles": pose_3d_angles,
            "pose_3d_coords": pose_3d_coords,
            "timings": timings
        })

    except Exception as e:
        print(f"Error processing frame: {e}")
        return (
            jsonify({
                "body": [], 
                "hands": {"left": [], "right": []},
                "pose_3d_angles": {},
                "pose_3d_coords": {}
            }),
            200,
        )  # Return empty data instead of error



if __name__ == "__main__":
    print("🚀 LiveDance Python Backend Starting...")
    print("📡 Server running at http://localhost:8000")
    print("💃 Ready to track dance poses!")
    app.run(host="0.0.0.0", port=8000, debug=True)
