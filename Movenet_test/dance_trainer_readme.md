# 💃 Dance Trainer

> Real-time dance motion tracking application powered by computer vision and machine learning.

[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.x-ff6f00?logo=tensorflow)](https://www.tensorflow.org/js)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Latest-00d9ff)](https://mediapipe.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Demo](#demo)
- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Performance](#performance)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## 🎯 Overview

Dance Trainer is a web-based application that uses advanced computer vision to track your body movements and hand gestures in real-time. Perfect for dancers, choreographers, and anyone looking to improve their dance technique with instant visual feedback.

### Key Capabilities

- **Full Body Tracking**: 17 body keypoints tracking your entire pose
- **Detailed Hand Tracking**: 21 landmarks per hand for precise finger movement analysis
- **Real-Time Feedback**: 15-35 FPS tracking with minimal latency
- **Browser-Based**: No installation required, runs entirely in your web browser
- **Privacy-First**: All processing happens locally on your device

## ✨ Features

- 🎥 **Webcam Integration** - Seamless camera access and streaming
- 🤖 **Dual-Model Tracking** - MoveNet for body + MediaPipe for hands
- 🎨 **Visual Overlay** - Color-coded skeleton display (Pink: body, Teal: hands)
- ⚡ **GPU Acceleration** - WebGL backend for optimal performance
- 📱 **Responsive Design** - Works on desktop and tablet devices
- 🔒 **Secure** - No data leaves your device, fully client-side processing

## 🎬 Demo

![Dance Trainer Interface](screenshot.png)

*Real-time body pose and hand tracking visualization*

## 🚀 Quick Start

Get up and running in under 5 minutes:

```bash
# Clone the repository
git clone https://github.com/yourusername/dance-trainer.git

# Navigate to project directory
cd dance-trainer

# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Allow camera access when prompted.

## 💻 System Requirements

### Minimum Requirements
- **OS**: macOS 10.15+, Windows 10+, or Linux
- **RAM**: 8GB
- **Browser**: Chrome 90+, Edge 90+, Safari 14+
- **Webcam**: Any built-in or USB camera (720p minimum)
- **Internet**: Required for initial model download (~10MB)

### Recommended
- **RAM**: 16GB+
- **Processor**: Apple M1/M2/M3 or Intel i5 8th gen+
- **Browser**: Chrome (best performance)
- **Webcam**: 1080p for optimal tracking quality

## 📦 Installation

### Prerequisites

Make sure you have Node.js installed:

```bash
# Check Node.js version (should be 16.x or higher)
node --version

# Check npm version
npm --version
```

If Node.js is not installed, download it from [nodejs.org](https://nodejs.org/)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dance-trainer.git
   cd dance-trainer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   This installs:
   - React and React DOM
   - TensorFlow.js libraries
   - MediaPipe Hands
   - Other required packages

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Automatically opens at `http://localhost:3000`
   - Allow camera permissions when prompted
   - Wait 5-10 seconds for models to load

## 🎮 Usage

### Getting Started

1. **Allow Camera Access**: Click "Allow" when your browser requests camera permission
2. **Wait for Models to Load**: Status bar will show "Ready to dance!" when complete
3. **Position Yourself**: Stand 3-5 feet back from camera, ensure full body is visible
4. **Start Moving**: Your movements will be tracked in real-time with visual overlay

### Understanding the Tracking

**Pink Overlay (Body Tracking)**
- Tracks 17 keypoints across your body
- Shows skeleton connections between joints
- Monitors shoulders, elbows, wrists, hips, knees, ankles

**Teal Overlay (Hand Tracking)**
- Tracks 21 landmarks per hand (42 total)
- Shows individual finger positions
- Captures gestures, snaps, and hand choreography

### Tips for Best Results

- ✅ **Lighting**: Use bright, even lighting for best detection
- ✅ **Background**: Plain backgrounds work better than busy ones
- ✅ **Distance**: Stand back enough to fit full body in frame
- ✅ **Hands**: Keep hands visible and unobstructed for finger tracking
- ✅ **Movement**: Smooth movements track better than rapid jerks

## 📁 Project Structure

```
my-dance-app/
├── public/
│   ├── index.html          # HTML template
│   ├── manifest.json       # PWA manifest
│   └── favicon.ico         # App icon
├── src/
│   ├── App.js              # Main application component
│   ├── PoseDetector.js     # Core tracking component (heavily commented)
│   ├── App.css             # Global styles
│   ├── index.js            # Application entry point
│   └── index.css           # Base styles
├── package.json            # Dependencies and scripts
├── package-lock.json       # Locked dependency versions
├── README.md               # This file
├── DOCUMENTATION.md        # Technical documentation
└── .gitignore             # Git ignore rules
```

### Key Files

| File | Purpose |
|------|---------|
| `src/PoseDetector.js` | Main tracking logic, webcam handling, visualization |
| `src/App.js` | Application wrapper and routing |
| `package.json` | Project dependencies and npm scripts |
| `DOCUMENTATION.md` | Detailed technical documentation |

## 🛠 Technology Stack

### Frontend Framework
- **React 18.x** - UI component library
- **HTML5 Canvas** - Real-time rendering

### Machine Learning
- **TensorFlow.js 4.x** - ML framework
- **MoveNet Lightning** - Body pose detection (17 keypoints)
- **MediaPipe Hands** - Hand landmark detection (21 points per hand)

### Backend/Processing
- **WebGL** - GPU-accelerated computation
- **getUserMedia API** - Webcam access

### Development Tools
- **Create React App** - Build tooling
- **npm** - Package management

## ⚡ Performance

### Expected Frame Rates

| Hardware | Body Only | Body + Hands |
|----------|-----------|--------------|
| Apple M1/M2/M3 | 40-60 FPS | 25-35 FPS |
| Intel Mac (2019+) | 30-45 FPS | 20-28 FPS |
| Intel Mac (2017-2018) | 20-35 FPS | 15-22 FPS |
| Older Hardware | 15-25 FPS | 12-18 FPS |

### Optimization Tips

**To Improve Performance:**

1. **Lower video resolution** in `PoseDetector.js`:
   ```javascript
   video: { width: 480, height: 360 } // From 640x480
   ```

2. **Reduce hand model complexity**:
   ```javascript
   modelComplexity: 0,  // From 1 (0=lite, 1=full)
   ```

3. **Increase confidence thresholds** (fewer false positives):
   ```javascript
   minDetectionConfidence: 0.7,  // From 0.5
   minTrackingConfidence: 0.7    // From 0.5
   ```

4. **Close other applications** to free up system resources

## 🎨 Customization

### Change Color Scheme

Edit `src/PoseDetector.js` to customize colors:

**Body Tracking Color:**
```javascript
// Line ~77-78
gradient.addColorStop(0, '#ff6b9d'); // Change to your color
gradient.addColorStop(1, '#c44569'); // Change to your color
```

**Hand Tracking Color:**
```javascript
// Line ~168
ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)'; // Change to your color
```

**Background Gradient:**
```javascript
// Line ~222
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
```

### Adjust Tracking Sensitivity

**Body Pose Confidence:**
```javascript
// Line ~73 - Lower = more detections, higher = fewer false positives
if (keypoint.score > 0.3) { // Change threshold (0.0 to 1.0)
```

**Hand Detection Settings:**
```javascript
// Lines ~64-65
minDetectionConfidence: 0.5,  // Initial detection threshold
minTrackingConfidence: 0.5    // Continuous tracking threshold
```

## 🔧 Troubleshooting

### Camera Not Working

**Issue**: "Unable to access camera" error

**Solutions**:
1. Check browser permissions: Click camera icon in address bar
2. macOS: System Settings → Privacy & Security → Camera → Enable for browser
3. Try different browser (Chrome recommended)
4. Restart browser after granting permissions

### Models Not Loading

**Issue**: Stuck on "Loading motion tracking..."

**Solutions**:
1. Check internet connection (models download from CDN)
2. Clear browser cache and reload
3. Check browser console for errors (F12 → Console tab)
4. Try incognito/private mode to rule out extensions

### Poor Tracking Quality

**Issue**: Skeleton is jumpy or inaccurate

**Solutions**:
1. Improve lighting - use bright, even light
2. Stand further back from camera
3. Ensure full body is visible in frame
4. Remove cluttered background
5. Wear contrasting clothing to background

### Slow Performance

**Issue**: Low FPS, laggy tracking

**Solutions**:
1. Close other applications and browser tabs
2. Lower video resolution (see [Performance](#performance))
3. Reduce model complexity (see [Performance](#performance))
4. Check if hardware meets minimum requirements
5. Ensure browser is using GPU (check in DevTools)

### Hands Not Detected

**Issue**: No teal/blue hand overlay appears

**Solutions**:
1. Hold hands in front of camera, fully visible
2. Improve lighting on hands specifically
3. Move hands slowly for initial detection
4. Check browser console for hand detection errors
5. Ensure fingers are spread (not in fists initially)

## 🗺 Roadmap

### Phase 1: MVP (Current) ✅
- [x] Real-time body pose tracking
- [x] Hand and finger tracking
- [x] Visual overlay display
- [x] Basic UI/UX

### Phase 2: Dance Comparison (In Progress)
- [ ] Reference video upload
- [ ] Side-by-side video comparison
- [ ] Basic pose matching algorithm
- [ ] Timestamp synchronization

### Phase 3: Feedback System
- [ ] Automated feedback generation
- [ ] Keypoint comparison metrics
- [ ] Performance scoring (0-100%)
- [ ] Highlight areas for improvement

### Phase 4: Enhanced Features
- [ ] Recording and playback
- [ ] Multiple dance styles presets
- [ ] Progress tracking over time
- [ ] Export analysis reports

### Phase 5: Social & Advanced
- [ ] User accounts and profiles
- [ ] Share recordings
- [ ] Multi-angle support (multiple cameras)
- [ ] Mobile app version

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs
- Use GitHub Issues
- Include browser version, OS, and error messages
- Provide steps to reproduce

### Suggesting Features
- Open a GitHub Issue with "Feature Request" label
- Describe use case and expected behavior
- Include mockups if applicable

### Pull Requests
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style
- Follow existing code formatting
- Add comments for complex logic
- Update documentation for new features
- Test on multiple browsers before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Dance Trainer Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## 🙏 Acknowledgments

### Technologies
- **[TensorFlow.js](https://www.tensorflow.org/js)** - Machine learning framework
- **[MediaPipe](https://mediapipe.dev/)** - Cross-platform ML solutions
- **[MoveNet](https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html)** - Pose detection model
- **[React](https://reactjs.org/)** - UI framework

### Inspiration
- Professional dance training applications
- Motion capture technology
- Computer vision research community

### Resources
- TensorFlow.js documentation and examples
- MediaPipe hand tracking demos
- React community and tutorials

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/dance-trainer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dance-trainer/discussions)
- **Email**: your.email@example.com

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/dance-trainer?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/dance-trainer?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/dance-trainer)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/dance-trainer)

---

**Built with ❤️ for the dance community**

*Last Updated: October 2025*