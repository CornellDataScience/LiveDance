import { useState, useEffect, useRef } from 'react';
import PoseEstimationService from '../services/PoseEstimationService';

const TRACKED_HAND_LANDMARKS = [
  'wrist',
  'thumb_cmc',
  'thumb_tip',
  'index_mcp',
  'index_tip',
  'middle_mcp',
  'middle_tip',
  'ring_mcp',
  'ring_tip',
  'pinky_mcp',
  'pinky_tip'
];

const HAND_CONNECTIONS_BY_NAME = [
  ['wrist', 'thumb_cmc'],
  ['thumb_cmc', 'thumb_tip'],
  ['wrist', 'index_mcp'],
  ['index_mcp', 'index_tip'],
  ['wrist', 'middle_mcp'],
  ['middle_mcp', 'middle_tip'],
  ['wrist', 'ring_mcp'],
  ['ring_mcp', 'ring_tip'],
  ['wrist', 'pinky_mcp'],
  ['pinky_mcp', 'pinky_tip'],
  ['thumb_cmc', 'index_mcp'],
  ['index_mcp', 'middle_mcp'],
  ['middle_mcp', 'ring_mcp'],
  ['ring_mcp', 'pinky_mcp']
];

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
  const [pose3DAngles, setPose3DAngles] = useState({});
  const [pose3DCoords, setPose3DCoords] = useState({});
  const [showData, setShowData] = useState(false);
  const [referenceVideo, setReferenceVideo] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(true);
  const streamRef = useRef(null);

  // Gesture detection state
  const [gestureStartTime, setGestureStartTime] = useState(null);
  const [gestureProgress, setGestureProgress] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [gestureControlEnabled, setGestureControlEnabled] = useState(true);
  const GESTURE_DURATION = 3000; // 3 seconds
  const videoPlayerControlRef = useRef(null);
  const gesturePositionRef = useRef(null); // Track hand position for stillness check

  // Performance metrics state
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    totalLatency: 0,
    backendTime: 0,
    networkLatency: 0,
    frontendTime: 0,
    backendBreakdown: {}
  });

  // Service instance for backend communication
  const poseService = useRef(new PoseEstimationService());
  const animationRef = useRef(null);

  /**
   * Check if hand is raised high (in upper portion of frame)
   * Returns true if wrist is in upper 40% of frame
   * Works with name-based landmarks
   */
  const isHandRaisedHigh = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // Find the wrist landmark by name
    const wrist = landmarks.find(lm => lm.name === 'wrist');
    if (!wrist) return false;

    // Normalized y goes from 0 (top) to 1 (bottom)
    // Check if wrist is in upper 40% of frame (y < 0.4)
    return wrist.normalized_y < 0.4;
  };

  /**
   * Check if hand is relatively still
   * Returns true if hand hasn't moved much since gesture started
   * Works with name-based landmarks
   */
  const isHandStill = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;
    if (!gesturePositionRef.current) return true; // First check, consider it still

    // Find wrist landmark by name
    const currentWrist = landmarks.find(lm => lm.name === 'wrist');
    if (!currentWrist) return false;

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
   * Works with the subset of 11 hand landmarks (tips and bases only)
   */
  const detectOpenPalm = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // Create a map for easy lookup by name
    const landmarkMap = {};
    landmarks.forEach(lm => {
      landmarkMap[lm.name] = lm;
    });

    // Check if we have the required landmarks
    const requiredLandmarks = ['wrist', 'thumb_cmc', 'thumb_tip', 'index_mcp', 'index_tip',
                                'middle_mcp', 'middle_tip', 'ring_mcp', 'ring_tip',
                                'pinky_mcp', 'pinky_tip'];

    const hasAllLandmarks = requiredLandmarks.every(name => landmarkMap[name]);
    if (!hasAllLandmarks) return false;

    // Check if fingertips are extended by comparing y-coordinates with their base points
    // Lower y value = higher on screen (extended)
    const thumbExtended = landmarkMap['thumb_tip'].y < landmarkMap['thumb_cmc'].y - 20;
    const indexExtended = landmarkMap['index_tip'].y < landmarkMap['index_mcp'].y;
    const middleExtended = landmarkMap['middle_tip'].y < landmarkMap['middle_mcp'].y;
    const ringExtended = landmarkMap['ring_tip'].y < landmarkMap['ring_mcp'].y;
    const pinkyExtended = landmarkMap['pinky_tip'].y < landmarkMap['pinky_mcp'].y;

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
   * Works with the subset of 11 hand landmarks (tips and bases only)
   */
  const detectClosedFist = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return false;

    // Create a map for easy lookup by name
    const landmarkMap = {};
    landmarks.forEach(lm => {
      landmarkMap[lm.name] = lm;
    });

    // Check if we have the required landmarks
    const requiredLandmarks = ['wrist', 'thumb_cmc', 'thumb_tip', 'index_mcp', 'index_tip',
                                'middle_mcp', 'middle_tip', 'ring_mcp', 'ring_tip',
                                'pinky_mcp', 'pinky_tip'];

    const hasAllLandmarks = requiredLandmarks.every(name => landmarkMap[name]);
    if (!hasAllLandmarks) return false;

    // Check if fingertips are curled (below their base knuckles)
    // Higher y value = lower on screen (curled)
    const thumbCurled = landmarkMap['thumb_tip'].y > landmarkMap['thumb_cmc'].y + 10;
    const indexCurled = landmarkMap['index_tip'].y > landmarkMap['index_mcp'].y + 10;
    const middleCurled = landmarkMap['middle_tip'].y > landmarkMap['middle_mcp'].y + 10;
    const ringCurled = landmarkMap['ring_tip'].y > landmarkMap['ring_mcp'].y + 10;
    const pinkyCurled = landmarkMap['pinky_tip'].y > landmarkMap['pinky_mcp'].y + 10;

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
      
      streamRef.current = stream;
      
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
   * Toggle camera on/off
   */
  const toggleCamera = () => {
    if (cameraEnabled) {
      // Turn off camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Clear landmark data
      setBodyLandmarks([]);
      setHandLandmarks({ left: [], right: [] });
      setPose3DAngles({});
      setPose3DCoords({});
      setCameraEnabled(false);
      setStatus('Camera off');
    } else {
      // Turn on camera - set enabled first so video element gets rendered
      setCameraEnabled(true);
      setStatus('Turning camera on...');
      // Wait for next tick to ensure video element is in DOM
      setTimeout(() => {
        setupCamera().then(success => {
          if (success) {
            setStatus('Camera on');
          } else {
            setCameraEnabled(false);
            setStatus('Failed to start camera');
          }
        });
      }, 100);
    }
  };

  /**
   * Toggle performance monitor visibility
   */
  const togglePerformanceMonitor = () => {
    setShowPerformanceMonitor(!showPerformanceMonitor);
  };

  /**
   * Check Python backend availability and connect WebSocket
   */
  const checkBackend = async () => {
    try {
      setStatus('Connecting to pose estimation server...');
      
      // Connect to WebSocket
      await poseService.current.connect();
      
      // Set up pose result callback
      poseService.current.onPoseResult = (poseData) => {
        // Update state with received data
        if (poseData.body) {
          setBodyLandmarks(poseData.body);
        }
        
        if (poseData.hands) {
          setHandLandmarks(poseData.hands);
        }
        
        if (poseData.pose_3d_angles) {
          setPose3DAngles(poseData.pose_3d_angles);
        }
        
        if (poseData.pose_3d_coords) {
          setPose3DCoords(poseData.pose_3d_coords);
        }
        
        // Update performance metrics
        if (poseData.frontend_timings && poseData.timings) {
          const totalTime = poseData.frontend_timings.total_frontend;
          const networkLatency = poseData.frontend_timings.network_latency || 0;
          const imageCaptureTime = poseData.frontend_timings.image_capture || 0;
          
          setPerformanceMetrics({
            fps: poseData.fps || 0,
            totalLatency: totalTime.toFixed(0),
            backendTime: poseData.timings.total_backend?.toFixed(0) || '0',
            networkLatency: networkLatency.toFixed(0),
            frontendTime: imageCaptureTime.toFixed(0),
            mode: poseData.mode || '3D',
            backendBreakdown: {
              decode: poseData.timings.image_decode?.toFixed(1) || '0.0',
              downscale: poseData.timings.downscale?.toFixed(1) || '0.0',
              pose: poseData.timings.pose_detection?.toFixed(1) || '0.0',
              angles3d: poseData.timings['3d_calculation']?.toFixed(1) || '0.0',
              hands: poseData.timings.hand_detection?.toFixed(1) || '0.0',
              smoothing: poseData.timings.smoothing?.toFixed(1) || '0.0'
            }
          });
        }
        
        // Draw skeleton with received data (using interpolated result)
        const interpolatedData = poseService.current.getInterpolatedResult();
        if (interpolatedData) {
          drawSkeleton(interpolatedData);
        }
      };
      
      setStatus('Ready to dance!');
      setIsReady(true);
      return true;
      
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

    // HAND TRACKING DISABLED
    // // Draw hands
    // const drawHand = (landmarks) => {
    //   if (!landmarks || landmarks.length === 0) return;

    //   const landmarkMap = {};
    //   landmarks.forEach((landmark) => {
    //     landmarkMap[landmark.name] = landmark;
    //   });

    //   ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
    //   ctx.lineWidth = 3;
    //   ctx.lineCap = 'round';

    //   HAND_CONNECTIONS_BY_NAME.forEach(([startName, endName]) => {
    //     const startPoint = landmarkMap[startName];
    //     const endPoint = landmarkMap[endName];

    //     if (startPoint && endPoint) {
    //       ctx.beginPath();
    //       ctx.moveTo(startPoint.x, startPoint.y);
    //       ctx.lineTo(endPoint.x, endPoint.y);
    //       ctx.stroke();
    //     }
    //   });

    //   TRACKED_HAND_LANDMARKS.forEach((name) => {
    //     const landmark = landmarkMap[name];
    //     if (!landmark) {
    //       return;
    //     }

    //     const gradient = ctx.createRadialGradient(
    //       landmark.x, landmark.y, 0,
    //       landmark.x, landmark.y, 8
    //     );
    //     gradient.addColorStop(0, '#40E0D0');
    //     gradient.addColorStop(1, '#1E90FF');

    //     ctx.beginPath();
    //     ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI);
    //     ctx.fillStyle = gradient;
    //     ctx.fill();
    //   });
    // };

    // if (poses.hands) {
    //   drawHand(poses.hands.left);
    //   drawHand(poses.hands.right);
    // }
  };

  /**
   * Main detection loop (sends frames to Python backend via WebSocket at 60 FPS)
   * Rendering happens via callback at inference speed with interpolation
   */
  const detectPose = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    // Skip pose detection if camera is disabled
    if (!cameraEnabled) {
      // Clear canvas when camera is off
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      // Send frame to Python backend via WebSocket
      // Result will come back asynchronously via callback
      await poseService.current.sendFrame(videoRef.current);
      
      // Draw interpolated result for smooth 60 FPS rendering
      const interpolatedData = poseService.current.getInterpolatedResult();
      if (interpolatedData) {
        drawSkeleton(interpolatedData);
      }
      
    } catch (error) {
      console.error('Detection error:', error);
    }

    // Continue loop at 60 FPS
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
      hands: handLandmarks,
      pose3DAngles,
      pose3DCoords
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
   * Toggle between 2D and 3D mode
   */
  const toggle2D3D = () => {
    const newMode = poseService.current.toggle2D3D();
    setStatus(`Switched to ${newMode ? '3D' : '2D'} mode`);
    setTimeout(() => setStatus('Ready to dance!'), 2000);
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
        const wrist = activeHand.find(lm => lm.name === 'wrist');
        if (wrist) {
          setGestureStartTime(Date.now());
          gesturePositionRef.current = {
            normalized_x: wrist.normalized_x,
            normalized_y: wrist.normalized_y
          };
        }
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
    pose3DAngles,
    pose3DCoords,
    performanceMetrics,
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
    toggleGestureControl,
    // 2D/3D toggle
    toggle2D3D,
    // Camera control
    cameraEnabled,
    toggleCamera,
    // Performance monitor
    showPerformanceMonitor,
    togglePerformanceMonitor
  };
};
