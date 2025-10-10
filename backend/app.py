"""
LiveDance Backend - Python Pose Estimation Server
Simple Flask server that processes video frames and returns pose landmarks
Uses MediaPipe for both body and hand tracking
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
import cv2
import numpy as np
from io import BytesIO
from PIL import Image

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

# Create pose and hands detectors
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

hands = mp_hands.Hands(
    static_image_mode=False,
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


@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"}), 200


@app.route("/estimate_pose", methods=["POST"])
def estimate_pose():
    """
    Process video frame and return body and hand landmarks
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

        # Process body pose
        pose_results = pose.process(image_rgb)
        body_landmarks = []

        if pose_results.pose_landmarks:
            landmarks = pose_results.pose_landmarks.landmark

            # Extract only the 17 keypoints matching MoveNet format
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

        # Process hands
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

        # Return results
        return jsonify({"body": body_landmarks, "hands": hand_landmarks})

    except Exception as e:
        print(f"Error processing frame: {e}")
        return (
            jsonify({"body": [], "hands": {"left": [], "right": []}}),
            200,
        )  # Return empty data instead of error


if __name__ == "__main__":
    print("🚀 LiveDance Python Backend Starting...")
    print("📡 Server running at http://localhost:5001")
    print("💃 Ready to track dance poses!")
    app.run(host="0.0.0.0", port=5001, debug=True)
