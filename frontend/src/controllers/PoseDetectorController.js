import { useState, useEffect, useRef } from 'react';
import PoseEstimationService from '../services/PoseEstimationService';

/**
 * Controller: Manages state and business logic for pose detection
 * Camera feed is captured in frontend, all pose estimation happens in Python backend
 */
export const usePoseDetectorController = () => {
  // Refs for DOM elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State management
  const [status, setStatus] = useState('Getting ready...');
  const [isReady, setIsReady] = useState(false);
  const [bodyLandmarks, setBodyLandmarks] = useState([]);
  const [handLandmarks, setHandLandmarks] = useState({ left: [], right: [] });
  const [showData, setShowData] = useState(false);
  const [referenceVideo, setReferenceVideo] = useState(null);

  // Gesture detection state
  const [gestureStartTime, setGestureStartTime] = useState(null);
  const [gestureProgress, setGestureProgress] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [gestureControlEnabled, setGestureControlEnabled] = useState(true);
  const GESTURE_DURATION = 3000; // 3 seconds
  const videoPlayerControlRef = useRef(null);
  const gesturePositionRef = useRef(null); // Track hand position for stillness check

  // Service instance for backend communication
  const poseService = useRef(new PoseEstimationService());
  const animationRef = useRef(null);

  /**
   * Check if hand is raised high (in upper portion of frame)
   * Returns true if wrist is in upper 40% of frame
   */
  const isHandRaisedHigh = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // Wrist is landmark 0
    const wrist = landmarks[0];

    // Normalized y goes from 0 (top) to 1 (bottom)
    // Check if wrist is in upper 40% of frame (y < 0.4)
    return wrist.normalized_y < 0.4;
  };

  /**
   * Check if hand is relatively still
   * Returns true if hand hasn't moved much since gesture started
   */
  const isHandStill = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;
    if (!gesturePositionRef.current) return true; // First check, consider it still

    // Use wrist position (landmark 0) to check movement
    const currentWrist = landmarks[0];
    const previousWrist = gesturePositionRef.current;

    // Calculate distance moved (in normalized coordinates)
    const dx = currentWrist.normalized_x - previousWrist.normalized_x;
    const dy = currentWrist.normalized_y - previousWrist.normalized_y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Allow small movement (0.05 = 5% of frame size)
    return distance < 0.05;
  };

  /**
   * Detect open palm gesture
   * Returns true if all fingers are extended (fingertips above their base points)
   */
  const detectOpenPalm = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // MediaPipe hands uses 21 landmarks (0-20)
    // We need at least the fingertips and base points
    if (landmarks.length < 21) return false;

    // Check if fingertips (indices 4, 8, 12, 16, 20) are extended
    // by comparing their y-coordinates with their base knuckles
    // Lower y value = higher on screen (extended)
    const thumbExtended = landmarks[4].y < landmarks[2].y - 20; // Thumb tip vs thumb IP
    const indexExtended = landmarks[8].y < landmarks[6].y;      // Index tip vs index DIP
    const middleExtended = landmarks[12].y < landmarks[10].y;   // Middle tip vs middle DIP
    const ringExtended = landmarks[16].y < landmarks[14].y;     // Ring tip vs ring DIP
    const pinkyExtended = landmarks[20].y < landmarks[18].y;    // Pinky tip vs pinky DIP

    const fingersExtended = [
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended
    ];

    // Consider it an open palm if at least 4 out of 5 fingers are extended
    const extendedCount = fingersExtended.filter(Boolean).length;
    return extendedCount >= 4;
  };

  /**
   * Detect closed fist gesture
   * Returns true if all fingers are curled (fingertips below their base points)
   */
  const detectClosedFist = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // MediaPipe hands uses 21 landmarks (0-20)
    if (landmarks.length < 21) return false;

    // Check if fingertips are curled (below their base knuckles)
    // Higher y value = lower on screen (curled)
    const thumbCurled = landmarks[4].y > landmarks[2].y + 10;   // Thumb tip vs thumb IP
    const indexCurled = landmarks[8].y > landmarks[6].y + 10;   // Index tip vs index DIP
    const middleCurled = landmarks[12].y > landmarks[10].y + 10; // Middle tip vs middle DIP
    const ringCurled = landmarks[16].y > landmarks[14].y + 10;   // Ring tip vs ring DIP
    const pinkyCurled = landmarks[20].y > landmarks[18].y + 10;  // Pinky tip vs pinky DIP

    const fingersCurled = [
      thumbCurled,
      indexCurled,
      middleCurled,
      ringCurled,
      pinkyCurled
    ];

    // Consider it a closed fist if at least 4 out of 5 fingers are curled
    const curledCount = fingersCurled.filter(Boolean).length;
    return curledCount >= 4;
  };

  /**
   * Start video playback via ref callback
   */
  const startVideo = () => {
    if (videoPlayerControlRef.current && !videoPlaying) {
      videoPlayerControlRef.current.play();
      setStatus('🎵 Video started! Enjoy dancing!');
      setTimeout(() => setStatus('Ready to dance!'), 3000);
    }
  };

  /**
   * Pause video playback via ref callback
   */
  const pauseVideo = () => {
    if (videoPlayerControlRef.current && videoPlaying) {
      videoPlayerControlRef.current.pause();
      setStatus('⏸️ Video paused!');
      setTimeout(() => setStatus('Ready to dance!'), 3000);
    }
  };

  /**
   * Initialize camera
   */
  const setupCamera = async () => {
    try {
      setStatus('Connecting to your camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('Camera ready');
        return true;
      }
      return false;
    } catch (error) {
      setStatus('Unable to access camera. Please check permissions.');
      console.error(error);
      return false;
    }
  };

  /**
   * Check Python backend availability
   */
  const checkBackend = async () => {
    try {
      setStatus('Connecting to pose estimation server...');
      const isHealthy = await poseService.current.healthCheck();
      
      if (isHealthy) {
        setStatus('Ready to dance!');
        setIsReady(true);
        return true;
      } else {
        setStatus('⚠️ Backend server not running. Please start Python backend (port 8000)');
        return false;
      }
    } catch (error) {
      setStatus('⚠️ Unable to connect to backend. Please start Python server.');
      console.error('Backend connection error:', error);
      return false;
    }
  };

  /**
   * Draw skeleton on canvas
   */
  const drawSkeleton = (poses) => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 640, 480);

    if (poses.body && poses.body.length > 0) {
      // Draw body keypoints
      poses.body.forEach(keypoint => {
        if (keypoint.visible) {
          const gradient = ctx.createRadialGradient(
            keypoint.x, keypoint.y, 0,
            keypoint.x, keypoint.y, 10
          );
          gradient.addColorStop(0, '#ff6b9d');
          gradient.addColorStop(1, '#c44569');
          
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      // Draw body connections
      const connections = [
        [5, 7], [7, 9],   // Left arm
        [6, 8], [8, 10],  // Right arm
        [5, 6],           // Shoulders
        [5, 11], [6, 12], // Torso
        [11, 12],         // Hips
        [11, 13], [13, 15], // Left leg
        [12, 14], [14, 16]  // Right leg
      ];

      ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      connections.forEach(([i, j]) => {
        const kp1 = poses.body[i];
        const kp2 = poses.body[j];
        
        if (kp1 && kp2 && kp1.visible && kp2.visible) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });
    }

    // Draw hands
    const drawHand = (landmarks) => {
      if (!landmarks || landmarks.length === 0) return;

      const handConnections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17]             // Palm
      ];

      ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      handConnections.forEach(([i, j]) => {
        const point1 = landmarks[i];
        const point2 = landmarks[j];
        
        if (point1 && point2) {
          ctx.beginPath();
          ctx.moveTo(point1.x, point1.y);
          ctx.lineTo(point2.x, point2.y);
          ctx.stroke();
        }
      });

      landmarks.forEach((landmark) => {
        const gradient = ctx.createRadialGradient(
          landmark.x, landmark.y, 0,
          landmark.x, landmark.y, 8
        );
        gradient.addColorStop(0, '#40E0D0');
        gradient.addColorStop(1, '#1E90FF');
        
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    };

    if (poses.hands) {
      drawHand(poses.hands.left);
      drawHand(poses.hands.right);
    }
  };

  /**
   * Main detection loop (sends frames to Python backend for pose estimation)
   */
  const detectPose = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      // Send frame to Python backend for pose estimation
      const poseData = await poseService.current.estimatePose(videoRef.current);
      
      // Update state with received data
      if (poseData.body) {
        setBodyLandmarks(poseData.body);
      }
      
      if (poseData.hands) {
        setHandLandmarks(poseData.hands);
      }
      
      // Draw skeleton with received data
      drawSkeleton(poseData);
      
    } catch (error) {
      console.error('Detection error:', error);
    }

    animationRef.current = requestAnimationFrame(detectPose);
  };

  /**
   * Export landmark data as JSON
   */
  const exportLandmarkData = () => {
    const timestamp = new Date().toISOString();
    const data = {
      timestamp,
      body: bodyLandmarks,
      hands: handLandmarks
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dance-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Toggle data panel visibility
   */
  const toggleDataPanel = () => {
    setShowData(!showData);
  };

  /**
   * Handle reference video selection
   */
  const handleReferenceVideoSelect = (video) => {
    setReferenceVideo(video);
  };

  /**
   * Toggle gesture control on/off
   */
  const toggleGestureControl = () => {
    setGestureControlEnabled(!gestureControlEnabled);
  };

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const init = async () => {
      const cameraReady = await setupCamera();
      if (cameraReady) {
        await checkBackend();
      }
    };
    
    init();
  }, []);

  /**
   * Start detection loop when ready
   */
  useEffect(() => {
    if (isReady && videoRef.current) {
      detectPose();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady]);

  /**
   * Reset gesture state when reference video changes
   */
  useEffect(() => {
    setVideoPlaying(false);
    setGestureStartTime(null);
    setGestureProgress(0);
  }, [referenceVideo]);

  /**
   * Monitor hand gestures and track hold duration
   * Detects open palm for play and closed fist for pause
   * With safeguards: hand must be raised high and relatively still
   */
  useEffect(() => {
    // Only track gestures if enabled, ready, and video exists
    if (!gestureControlEnabled || !isReady || !referenceVideo) {
      // Clear any ongoing gesture tracking if disabled
      if (gestureStartTime) {
        setGestureStartTime(null);
        setGestureProgress(0);
        gesturePositionRef.current = null;
      }
      return;
    }

    // Check both hands for gestures
    const rightHandOpen = handLandmarks.right && handLandmarks.right.length > 0
      ? detectOpenPalm(handLandmarks.right)
      : false;
    const leftHandOpen = handLandmarks.left && handLandmarks.left.length > 0
      ? detectOpenPalm(handLandmarks.left)
      : false;

    const rightHandClosed = handLandmarks.right && handLandmarks.right.length > 0
      ? detectClosedFist(handLandmarks.right)
      : false;
    const leftHandClosed = handLandmarks.left && handLandmarks.left.length > 0
      ? detectClosedFist(handLandmarks.left)
      : false;

    // Check position constraints (hand must be raised high)
    const rightHandRaised = handLandmarks.right && handLandmarks.right.length > 0
      ? isHandRaisedHigh(handLandmarks.right)
      : false;
    const leftHandRaised = handLandmarks.left && handLandmarks.left.length > 0
      ? isHandRaisedHigh(handLandmarks.left)
      : false;

    // Determine which hand to track (prefer right, then left)
    let activeHand = null;
    let isGestureDetected = false;

    if (rightHandOpen && rightHandRaised) {
      activeHand = handLandmarks.right;
      isGestureDetected = !videoPlaying;
    } else if (rightHandClosed && rightHandRaised) {
      activeHand = handLandmarks.right;
      isGestureDetected = videoPlaying;
    } else if (leftHandOpen && leftHandRaised) {
      activeHand = handLandmarks.left;
      isGestureDetected = !videoPlaying;
    } else if (leftHandClosed && leftHandRaised) {
      activeHand = handLandmarks.left;
      isGestureDetected = videoPlaying;
    }

    // Check if hand is still (only after gesture starts)
    const handIsStill = activeHand ? isHandStill(activeHand) : false;

    if (isGestureDetected && activeHand) {
      if (!gestureStartTime) {
        // Start tracking gesture - record initial position
        setGestureStartTime(Date.now());
        gesturePositionRef.current = {
          normalized_x: activeHand[0].normalized_x,
          normalized_y: activeHand[0].normalized_y
        };
      } else {
        // Check if hand is still moving too much
        if (!handIsStill) {
          // Reset if hand moved too much
          setGestureStartTime(null);
          setGestureProgress(0);
          gesturePositionRef.current = null;
          return;
        }

        // Update progress
        const elapsed = Date.now() - gestureStartTime;
        const progress = Math.min(elapsed / GESTURE_DURATION, 1);
        setGestureProgress(progress);

        // Trigger action when 3 seconds reached
        if (elapsed >= GESTURE_DURATION) {
          if (!videoPlaying) {
            startVideo();
          } else {
            pauseVideo();
          }
          setGestureStartTime(null);
          setGestureProgress(0);
          gesturePositionRef.current = null;
        }
      }
    } else {
      // Reset if gesture lost
      if (gestureStartTime) {
        setGestureStartTime(null);
        setGestureProgress(0);
        gesturePositionRef.current = null;
      }
    }
  }, [handLandmarks, isReady, videoPlaying, gestureStartTime, referenceVideo, gestureControlEnabled]);

  // Return all state and functions needed by the View
  return {
    videoRef,
    canvasRef,
    status,
    isReady,
    bodyLandmarks,
    handLandmarks,
    showData,
    exportLandmarkData,
    toggleDataPanel,
    referenceVideo,
    handleReferenceVideoSelect,
    // Gesture and video control
    gestureProgress,
    videoPlaying,
    setVideoPlaying,
    videoPlayerControlRef,
    gestureControlEnabled,
    toggleGestureControl
  };
};

