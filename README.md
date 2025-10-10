# LiveDance 💃

**Computer vision-powered dance training application with real-time pose feedback**

## 🎯 Project Goal

LiveDance uses computer vision to track a user's body pose from a live camera feed. The system identifies joint positioning and compares it to a reference dance video in order to provide the user with feedback for improvement.

## 🏗 Architecture

This project uses a clean **MVC (Model-View-Controller)** architecture:

- **Frontend (React)**: View + Controller layers for UI and logic
- **Backend (Python)**: Model layer with MediaPipe for pose estimation
- **Communication**: Simple REST API (localhost only, no database)

```
React Frontend  ←→  Python Backend
```

## 📖 Quick Start

```bash
# Terminal 1 - Start Python backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py

# Terminal 2 - Start React frontend
cd frontend
npm install
npm start
```

## 📂 Project Structure

```
LiveDance/
├── frontend/              # React frontend (MVC structure)
│   └── src/
│       ├── LiveDance.js                       # Main component
│       ├── controllers/PoseDetectorController.js
│       ├── views/PoseDetectorView.js
│       └── services/PoseEstimationService.js
│
├── backend/               # Python Flask server
│   ├── app.py            # MediaPipe pose estimation
│   └── requirements.txt
│
└── ARCHITECTURE.md       # Technical documentation
```

## ✨ Current Features

- ✅ Real-time body pose tracking (17 keypoints)
- ✅ Hand landmark detection (21 points per hand)
- ✅ Live skeleton overlay visualization
- ✅ Landmark data export (JSON)
- ✅ Clean MVC architecture
- ✅ Python-powered pose estimation

## 🚧 Coming Soon

- [ ] Reference video upload
- [ ] Pose comparison algorithm
- [ ] Real-time feedback system
- [ ] Performance scoring

## 🛠 Technology Stack

**Frontend:**

- React 19
- HTML5 Canvas

**Backend:**

- Python 3.8+
- Flask
- MediaPipe
- OpenCV
- NumPy

## 📝 License

MIT License - See LICENSE file for details
