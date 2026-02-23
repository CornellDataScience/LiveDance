# LiveDance

**Computer vision-powered dance training application with real-time pose feedback**

## Project Goal

LiveDance uses computer vision to track a user's body pose from a live camera feed. The system identifies joint positioning and compares it to a reference dance video in order to provide the user with feedback for improvement.

## Architecture

This project uses a clean MVC architecture with clear separation:

- **Frontend (React)**:
  - Captures camera feed (browser requirement)
  - Displays UI and visualizations
  - Pure presentation logic
- **Backend (Python)**:
  - All ML/AI processing (MediaPipe pose estimation)
  - Body and hand tracking
  - Computation-heavy tasks
- **Communication**: REST API over localhost

```
React Frontend  ─(video frames)→  Python Backend
      ↑                                  │
      └────────(pose landmarks)──────────┘
```

## Quick Start

**Requirements:** Python 3.11 (MediaPipe doesn't support Python 3.12 yet)

```bash
# Terminal 1 - Start Python backend (http://localhost:8000)
cd backend
python3.11 -m venv venv  # Use Python 3.11 or 3.10
source venv/bin/activate
pip install -r requirements.txt
python app.py

# Terminal 2 - Start React frontend (http://localhost:3000)
cd frontend
npm install
npm start
```
