# LiveDance Python Backend

Simple Flask server for pose estimation using MediaPipe.

## Setup

1. **Create virtual environment:**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run server:**
   ```bash
   python app.py
   ```

Server will start at `http://localhost:5000`

## Endpoints

- `GET /health` - Health check
- `POST /estimate_pose` - Process video frame and return landmarks

## Usage

The frontend automatically sends video frames to this server. Just keep it running in the background!
