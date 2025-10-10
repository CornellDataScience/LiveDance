import { useState, useEffect, useRef } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { Hands } from '@mediapipe/hands';
import PoseEstimationService from '../services/PoseEstimationService';

/**
 * Controller: Manages state and business logic for pose detection
 * Uses JavaScript ML libraries for fast live tracking
 * Python backend (PoseEstimationService) is available for video comparison features
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

  // ML model instances (for live tracking)
  const detectorRef = useRef(null);
  const handsRef = useRef(null);
  
  // Service instance (for future video comparison)
  const poseService = useRef(new PoseEstimationService());
  const animationRef = useRef(null);

  // Body keypoint names for reference
  const BODY_KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];

  // Hand landmark names for reference
  const HAND_LANDMARK_NAMES = [
    'wrist', 'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
    'index_mcp', 'index_pip', 'index_dip', 'index_tip',
    'middle_mcp', 'middle_pip', 'middle_dip', 'middle_tip',
    'ring_mcp', 'ring_pip', 'ring_dip', 'ring_tip',
    'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
  ];

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
   * Load ML models for live tracking
   */
  const loadModels = async () => {
    try {
      setStatus('Loading motion tracking...');
      
      // Initialize TensorFlow backend
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Load MoveNet for body tracking
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      };
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      
      setStatus('Loading hand tracking...');
      
      // Load MediaPipe Hands
      const handsModel = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      handsModel.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      // Set up hand detection callback
      handsModel.onResults((results) => {
        if (!results.multiHandLandmarks || !canvasRef.current) return;
        
        const ctx = canvasRef.current.getContext('2d');
        
        // Extract hand landmark data
        const extractedHandData = { left: [], right: [] };
        
        results.multiHandLandmarks.forEach((landmarks, handIndex) => {
          const handedness = results.multiHandedness[handIndex]?.label || 'Unknown';
          const handSide = handedness.toLowerCase();
          
          const handData = landmarks.map((landmark, index) => ({
            name: HAND_LANDMARK_NAMES[index],
            x: Math.round(landmark.x * 640 * 10) / 10,
            y: Math.round(landmark.y * 480 * 10) / 10,
            z: Math.round(landmark.z * 1000) / 1000,
            normalized_x: Math.round(landmark.x * 1000) / 1000,
            normalized_y: Math.round(landmark.y * 1000) / 1000
          }));
          
          extractedHandData[handSide] = handData;
        });
        
        setHandLandmarks(extractedHandData);
        
        // Draw hands
        results.multiHandLandmarks.forEach((landmarks) => {
          const handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
          ];

          ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          handConnections.forEach(([i, j]) => {
            const point1 = landmarks[i];
            const point2 = landmarks[j];
            
            ctx.beginPath();
            ctx.moveTo(point1.x * 640, point1.y * 480);
            ctx.lineTo(point2.x * 640, point2.y * 480);
            ctx.stroke();
          });

          landmarks.forEach((landmark) => {
            const gradient = ctx.createRadialGradient(
              landmark.x * 640, landmark.y * 480, 0,
              landmark.x * 640, landmark.y * 480, 8
            );
            gradient.addColorStop(0, '#40E0D0');
            gradient.addColorStop(1, '#1E90FF');
            
            ctx.beginPath();
            ctx.arc(landmark.x * 640, landmark.y * 480, 5, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
          });
        });
      });
      
      handsRef.current = handsModel;
      
      setStatus('Ready to dance!');
      setIsReady(true);
      return true;
    } catch (error) {
      setStatus('Something went wrong. Try refreshing the page.');
      console.error('Model loading error:', error);
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
   * Main detection loop (using JavaScript models for fast tracking)
   */
  const detectPose = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 640, 480);
      
      // Detect body pose with MoveNet
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      
      if (poses.length > 0) {
        // Extract and store body landmark data
        const extractedBodyData = poses[0].keypoints.map((kp, index) => ({
          name: BODY_KEYPOINT_NAMES[index],
          x: Math.round(kp.x * 10) / 10,
          y: Math.round(kp.y * 10) / 10,
          confidence: Math.round(kp.score * 100),
          visible: kp.score > 0.3
        }));
        setBodyLandmarks(extractedBodyData);

        // Create pose data structure for drawing
        const poseData = {
          body: extractedBodyData,
          hands: handLandmarks
        };
        
        // Draw skeleton
        drawSkeleton(poseData);
      }

      // Detect hands with MediaPipe
      await handsRef.current.send({ image: videoRef.current });
      
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
   * Initialize on mount
   */
  useEffect(() => {
    const init = async () => {
      const cameraReady = await setupCamera();
      if (cameraReady) {
        await loadModels();
      }
    };
    
    init();
  }, []);

  /**
   * Start detection loop when ready
   */
  useEffect(() => {
    if (isReady && videoRef.current && detectorRef.current && handsRef.current) {
      detectPose();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady]);

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
    BODY_KEYPOINT_NAMES,
    HAND_LANDMARK_NAMES
  };
};

