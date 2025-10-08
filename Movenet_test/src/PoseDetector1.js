// ============================================
// IMPORTS
// ============================================
import React, { useRef, useEffect, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection'; // TensorFlow body pose detection
import * as tf from '@tensorflow/tfjs-core'; // TensorFlow core library
import '@tensorflow/tfjs-backend-webgl'; // WebGL backend for GPU acceleration
import { Hands } from '@mediapipe/hands'; // MediaPipe hand tracking

/**
 * PoseDetector Component
 * 
 * Main component for dance training app that tracks:
 * - Full body pose (17 keypoints via MoveNet)
 * - Hand landmarks (21 points per hand via MediaPipe Hands)
 * 
 * Features:
 * - Real-time tracking using webcam
 * - Dual-model approach for complete body + hand coverage
 * - Visual overlay with color-coded skeleton (Pink = body, Teal = hands)
 */
function PoseDetector() {
  // ============================================
  // REFS - Direct DOM element references
  // ============================================
  const videoRef = useRef(null);   // Reference to video element (webcam feed)
  const canvasRef = useRef(null);  // Reference to canvas element (drawing overlay)

  // ============================================
  // STATE - Component state management
  // ============================================
  const [status, setStatus] = useState('Getting ready...'); // User-facing status message
  const [isReady, setIsReady] = useState(false);           // Whether models are loaded and ready
  const [detector, setDetector] = useState(null);          // MoveNet body pose detector instance
  const [hands, setHands] = useState(null);                // MediaPipe hands detector instance

  // ============================================
  // INITIALIZATION EFFECT
  // Runs once when component mounts
  // ============================================
  useEffect(() => {
    /**
     * setupCamera
     * Requests webcam access and connects video stream
     */
    async function setupCamera() {
      try {
        setStatus('Connecting to your camera...');
        
        // Request user's webcam with specific resolution
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        // Attach video stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('Camera ready');
        }
      } catch (error) {
        // Handle permission denial or camera unavailable
        setStatus('Unable to access camera. Please check permissions.');
        console.error(error);
      }
    }

    /**
     * loadModels
     * Initializes both pose detection and hand tracking models
     */
    async function loadModels() {
      try {
        // ----------------------------------------
        // Step 1: Initialize TensorFlow Backend
        // ----------------------------------------
        setStatus('Loading motion tracking...');
        
        // Set backend to WebGL for GPU acceleration
        await tf.setBackend('webgl');
        // Wait for backend to be ready before proceeding
        await tf.ready();
        
        // ----------------------------------------
        // Step 2: Load Body Pose Detector (MoveNet)
        // ----------------------------------------
        const detectorConfig = {
          // Use Lightning model: fastest version, good for real-time
          // Alternative: SINGLEPOSE_THUNDER (slower but more accurate)
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        // Create the pose detector instance
        const det = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        setDetector(det);
        
        // ----------------------------------------
        // Step 3: Load Hand Detector (MediaPipe Hands)
        // ----------------------------------------
        setStatus('Loading hand tracking...');
        
        // Initialize MediaPipe Hands model
        const handsModel = new Hands({
          // CDN location for MediaPipe model files
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });
        
        // Configure hand detection parameters
        handsModel.setOptions({
          maxNumHands: 2,              // Track both hands (left and right)
          modelComplexity: 1,          // 0=lite, 1=full (balance speed/accuracy)
          minDetectionConfidence: 0.5, // Confidence threshold for initial detection (0-1)
          minTrackingConfidence: 0.5   // Confidence threshold for tracking (0-1)
        });
        
        setHands(handsModel);
        setStatus('Ready to dance!');
        setIsReady(true); // Mark as ready for user interaction
        
      } catch (error) {
        setStatus('Something went wrong. Try refreshing the page.');
        console.error('Full error:', error);
      }
    }

    // Execute initialization functions
    setupCamera();
    loadModels();
  }, []); // Empty dependency array = run once on mount

  // ============================================
  // DETECTION LOOP EFFECT
  // Runs whenever detector or hands models change
  // ============================================
  useEffect(() => {
    // Don't start detection until everything is ready
    if (!detector || !hands || !videoRef.current || !canvasRef.current) return;

    let animationId; // Store animation frame ID for cleanup
    
    /**
     * detectPoseAndHands
     * Main detection loop - runs continuously at ~60fps
     * Processes video frame and draws both body and hand tracking
     */
    const detectPoseAndHands = async () => {
      // Check if video is ready (readyState 4 = HAVE_ENOUGH_DATA)
      if (videoRef.current.readyState === 4) {
        const ctx = canvasRef.current.getContext('2d');
        
        // Clear previous frame drawings
        ctx.clearRect(0, 0, 640, 480);
        
        try {
          // ----------------------------------------
          // BODY POSE DETECTION
          // ----------------------------------------
          // Get pose predictions from current video frame
          const poses = await detector.estimatePoses(videoRef.current);
          
          if (poses.length > 0) {
            // ----------------------------------------
            // Draw Body Keypoints (17 points)
            // ----------------------------------------
            poses[0].keypoints.forEach(keypoint => {
              // Only draw keypoints with confidence > 0.3 (30%)
              if (keypoint.score > 0.3) {
                // Create gradient effect for visual appeal
                const gradient = ctx.createRadialGradient(
                  keypoint.x, keypoint.y, 0,
                  keypoint.x, keypoint.y, 10
                );
                gradient.addColorStop(0, '#ff6b9d'); // Center color (bright pink)
                gradient.addColorStop(1, '#c44569'); // Edge color (darker pink)
                
                // Draw circular keypoint
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = gradient;
                ctx.fill();
              }
            });

            // ----------------------------------------
            // Draw Body Skeleton (connecting lines)
            // ----------------------------------------
            // Define connections between keypoints [start_index, end_index]
            // MoveNet keypoint indices:
            // 0: nose, 1-2: eyes, 3-4: ears, 5-6: shoulders,
            // 7-8: elbows, 9-10: wrists, 11-12: hips,
            // 13-14: knees, 15-16: ankles
            const connections = [
              [5, 7], [7, 9],       // Left arm (shoulder->elbow->wrist)
              [6, 8], [8, 10],      // Right arm (shoulder->elbow->wrist)
              [5, 6],               // Shoulders (across chest)
              [5, 11], [6, 12],     // Torso (shoulders to hips)
              [11, 12],             // Hips (across pelvis)
              [11, 13], [13, 15],   // Left leg (hip->knee->ankle)
              [12, 14], [14, 16]    // Right leg (hip->knee->ankle)
            ];

            // Set line style for skeleton
            ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)'; // Pink with transparency
            ctx.lineWidth = 4;
            ctx.lineCap = 'round'; // Rounded line ends

            // Draw each connection
            connections.forEach(([i, j]) => {
              const kp1 = poses[0].keypoints[i];
              const kp2 = poses[0].keypoints[j];
              
              // Only draw if both keypoints are confident
              if (kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.stroke();
              }
            });
          }

          // ----------------------------------------
          // HAND DETECTION
          // ----------------------------------------
          // Send current video frame to hand detector
          // Results will be handled by hands.onResults callback below
          await hands.send({ image: videoRef.current });
          
        } catch (error) {
          console.error('Detection error:', error);
        }
      }
      
      // Schedule next frame detection (creates continuous loop)
      animationId = requestAnimationFrame(detectPoseAndHands);
    };

    // ----------------------------------------
    // HAND DETECTION RESULTS HANDLER
    // ----------------------------------------
    /**
     * Callback triggered when hand detection completes
     * @param {Object} results - Contains detected hand landmarks
     */
    hands.onResults((results) => {
      // Check if hands were detected and canvas is available
      if (results.multiHandLandmarks && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        
        // Process each detected hand (can be 0, 1, or 2 hands)
        results.multiHandLandmarks.forEach((landmarks) => {
          // ----------------------------------------
          // Define Hand Skeleton Structure
          // ----------------------------------------
          // MediaPipe hand has 21 landmarks (0-20):
          // 0: wrist
          // 1-4: thumb (from base to tip)
          // 5-8: index finger
          // 9-12: middle finger
          // 13-16: ring finger
          // 17-20: pinky
          const handConnections = [
            // Thumb connections
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index finger connections
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle finger connections
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring finger connections
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky connections
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm connections (connecting finger bases)
            [5, 9], [9, 13], [13, 17]
          ];

          // Set hand skeleton style (teal/turquoise color)
          ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          // Draw hand skeleton connections
          handConnections.forEach(([i, j]) => {
            const point1 = landmarks[i];
            const point2 = landmarks[j];
            
            // Convert normalized coordinates (0-1) to canvas pixels
            ctx.beginPath();
            ctx.moveTo(point1.x * 640, point1.y * 480);
            ctx.lineTo(point2.x * 640, point2.y * 480);
            ctx.stroke();
          });

          // ----------------------------------------
          // Draw Hand Landmarks (21 points per hand)
          // ----------------------------------------
          landmarks.forEach((landmark) => {
            // Create gradient for each landmark point
            const gradient = ctx.createRadialGradient(
              landmark.x * 640, landmark.y * 480, 0,
              landmark.x * 640, landmark.y * 480, 8
            );
            gradient.addColorStop(0, '#40E0D0'); // Turquoise center
            gradient.addColorStop(1, '#1E90FF'); // Blue edge
            
            // Draw circular landmark
            ctx.beginPath();
            ctx.arc(landmark.x * 640, landmark.y * 480, 5, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
          });
        });
      }
    });

    // Start the detection loop
    detectPoseAndHands();

    // ----------------------------------------
    // CLEANUP FUNCTION
    // ----------------------------------------
    // Runs when component unmounts or dependencies change
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId); // Stop detection loop
      }
    };
  }, [detector, hands]); // Re-run if detector or hands change

  // ============================================
  // RENDER UI
  // ============================================
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple gradient
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ---------------------------------------- */}
      {/* HEADER SECTION */}
      {/* ---------------------------------------- */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ 
          color: 'white',
          fontSize: '42px',
          fontWeight: '700',
          margin: '0 0 10px 0',
          letterSpacing: '-1px'
        }}>
          Dance Trainer
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '18px',
          margin: 0
        }}>
          Full body and hand tracking for precise choreography
        </p>
      </div>

      {/* ---------------------------------------- */}
      {/* STATUS BAR */}
      {/* Shows current loading/ready state */}
      {/* ---------------------------------------- */}
      <div style={{
        maxWidth: '680px',
        margin: '0 auto 20px',
        padding: '16px 24px',
        // Change color based on ready state
        background: isReady 
          ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' // Green when ready
          : 'rgba(255, 255, 255, 0.2)', // White/transparent when loading
        backdropFilter: 'blur(10px)', // Frosted glass effect
        borderRadius: '12px',
        textAlign: 'center',
        transition: 'all 0.3s ease' // Smooth color transition
      }}>
        <div style={{
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          {/* Loading spinner - only show when not ready */}
          {!isReady && (
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite' // CSS animation defined below
            }}></div>
          )}
          {status} {/* Display current status message */}
        </div>
      </div>

      {/* ---------------------------------------- */}
      {/* VIDEO CONTAINER */}
      {/* Main tracking display area */}
      {/* ---------------------------------------- */}
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ 
          position: 'relative', // Allows canvas to overlay video
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          {/* ---------------------------------------- */}
          {/* VIDEO ELEMENT - Webcam feed */}
          {/* ---------------------------------------- */}
          <video
            ref={videoRef}
            width="640"
            height="480"
            autoPlay          // Start playing automatically
            playsInline       // Required for mobile devices
            style={{ 
              transform: 'scaleX(-1)', // Mirror video (feels natural for user)
              display: 'block',
              width: '100%',
              height: 'auto'
            }}
          />
          
          {/* ---------------------------------------- */}
          {/* CANVAS ELEMENT - Drawing overlay */}
          {/* Position: absolute overlays on top of video */}
          {/* ---------------------------------------- */}
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'scaleX(-1)', // Mirror canvas to match video
              width: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* ---------------------------------------- */}
        {/* TIPS SECTION */}
        {/* Only show when models are ready */}
        {/* ---------------------------------------- */}
        {isReady && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: 'white'
          }}>
            {/* Color Legend */}
            <h3 style={{ 
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              What's Being Tracked
            </h3>
            <div style={{ display: 'flex', gap: '20px', fontSize: '15px' }}>
              {/* Body tracking indicator */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  background: '#ff6b9d', // Pink dot
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                <strong>Body (Pink):</strong> 17 points tracking your pose
              </div>
              {/* Hand tracking indicator */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  background: '#40E0D0', // Teal dot
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                <strong>Hands (Teal):</strong> 21 points per hand tracking all fingers
              </div>
            </div>
            
            {/* Usage tips */}
            <h3 style={{ 
              margin: '20px 0 12px 0',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Quick Tips
            </h3>
            <ul style={{ 
              margin: 0,
              padding: '0 0 0 20px',
              lineHeight: '1.8',
              fontSize: '15px'
            }}>
              <li>Hold your hands in view for detailed tracking</li>
              <li>Move your fingers - watch individual finger tracking!</li>
              <li>Try hand gestures, snaps, or pointing</li>
              <li>Stand 3-5 feet back for best full-body tracking</li>
            </ul>
          </div>
        )}
      </div>

      {/* ---------------------------------------- */}
      {/* CSS ANIMATIONS */}
      {/* Defines the loading spinner rotation */}
      {/* ---------------------------------------- */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PoseDetector;