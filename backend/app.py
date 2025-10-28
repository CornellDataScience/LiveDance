"""
LiveDance Backend - Python Pose Estimation Server
Flask server that processes video frames and returns pose landmarks
Uses MediaPipe for both body and hand tracking
"""

from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
import mediapipe as mp
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from youtube_downloader import YouTubeDownloader
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize YouTube downloader
youtube_downloader = YouTubeDownloader(output_dir="downloads")

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

# Create SEPARATE pose and hands detectors for camera feed
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

# Create SEPARATE pose and hands detectors for reference video
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
    Process CAMERA FEED frame and return body and hand landmarks
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
                    body_landmarks.append(
                        {
                            "name": name,
                            "x": round(lm.x * width, 1),
                            "y": round(lm.y * height, 1),
                            "confidence": round(lm.visibility * 100),
                            "visible": lm.visibility > 0.3,
                        }
                    )

        # Process hands using CAMERA-SPECIFIC instance
        hand_results = hands_camera.process(image_rgb)
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
                    body_landmarks.append(
                        {
                            "name": name,
                            "x": round(lm.x * width, 1),
                            "y": round(lm.y * height, 1),
                            "confidence": round(lm.visibility * 100),
                            "visible": lm.visibility > 0.3,
                        }
                    )

        # Process hands using REFERENCE-SPECIFIC instance
        hand_results = hands_reference.process(image_rgb)
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
        print(f"Error processing reference frame: {e}")
        return (
            jsonify({"body": [], "hands": {"left": [], "right": []}}),
            200,
        )  # Return empty data instead of error


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


if __name__ == "__main__":
    print("🚀 LiveDance Python Backend Starting...")
    print("📡 Server running at http://localhost:8000")
    print("💃 Ready to track dance poses!")
    app.run(host="0.0.0.0", port=8000, debug=True)
