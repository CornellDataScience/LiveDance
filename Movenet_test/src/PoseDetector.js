import React, { useRef, useEffect, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { Hands } from '@mediapipe/hands';

function PoseDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Getting ready...');
  const [isReady, setIsReady] = useState(false);
  const [detector, setDetector] = useState(null);
  const [hands, setHands] = useState(null);
  
  // ============================================
  // NEW: State for storing landmark data
  // ============================================
  const [bodyLandmarks, setBodyLandmarks] = useState([]); // Store body keypoints
  const [handLandmarks, setHandLandmarks] = useState({ left: [], right: [] }); // Store hand landmarks
  const [showData, setShowData] = useState(false); // Toggle data panel visibility

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

  useEffect(() => {
    async function setupCamera() {
      try {
        setStatus('Connecting to your camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('Camera ready');
        }
      } catch (error) {
        setStatus('Unable to access camera. Please check permissions.');
        console.error(error);
      }
    }

    async function loadModels() {
      try {
        setStatus('Loading motion tracking...');
        
        await tf.setBackend('webgl');
        await tf.ready();
        
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        const det = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        setDetector(det);
        
        setStatus('Loading hand tracking...');
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
        
        setHands(handsModel);
        setStatus('Ready to dance!');
        setIsReady(true);
      } catch (error) {
        setStatus('Something went wrong. Try refreshing the page.');
        console.error('Full error:', error);
      }
    }

    setupCamera();
    loadModels();
  }, []);

  useEffect(() => {
    if (!detector || !hands || !videoRef.current || !canvasRef.current) return;

    let animationId;
    
    const detectPoseAndHands = async () => {
      if (videoRef.current.readyState === 4) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 640, 480);
        
        try {
          // ============================================
          // BODY POSE DETECTION WITH DATA EXTRACTION
          // ============================================
          const poses = await detector.estimatePoses(videoRef.current);
          
          if (poses.length > 0) {
            // ============================================
            // NEW: Extract and store body landmark data
            // ============================================
            const extractedBodyData = poses[0].keypoints.map((kp, index) => ({
              name: BODY_KEYPOINT_NAMES[index],
              x: Math.round(kp.x * 10) / 10, // Round to 1 decimal
              y: Math.round(kp.y * 10) / 10,
              confidence: Math.round(kp.score * 100), // Convert to percentage
              visible: kp.score > 0.3
            }));
            setBodyLandmarks(extractedBodyData);

            // ============================================
            // Log data to console (optional - for debugging)
            // ============================================
            // Uncomment to see data in browser console:
            // console.log('Body Landmarks:', extractedBodyData);

            // Draw body keypoints
            poses[0].keypoints.forEach(keypoint => {
              if (keypoint.score > 0.3) {
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

            // Draw body skeleton
            const connections = [
              [5, 7], [7, 9],
              [6, 8], [8, 10],
              [5, 6],
              [5, 11], [6, 12],
              [11, 12],
              [11, 13], [13, 15],
              [12, 14], [14, 16]
            ];

            ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            connections.forEach(([i, j]) => {
              const kp1 = poses[0].keypoints[i];
              const kp2 = poses[0].keypoints[j];
              
              if (kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.stroke();
              }
            });
          }

          await hands.send({ image: videoRef.current });
          
        } catch (error) {
          console.error('Detection error:', error);
        }
      }
      animationId = requestAnimationFrame(detectPoseAndHands);
    };

    // ============================================
    // HAND DETECTION WITH DATA EXTRACTION
    // ============================================
    hands.onResults((results) => {
      if (results.multiHandLandmarks && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        
        // ============================================
        // NEW: Extract and store hand landmark data
        // ============================================
        const extractedHandData = { left: [], right: [] };
        
        results.multiHandLandmarks.forEach((landmarks, handIndex) => {
          // Determine if left or right hand
          const handedness = results.multiHandedness[handIndex]?.label || 'Unknown';
          const handSide = handedness.toLowerCase();
          
          // Extract landmark data with names
          const handData = landmarks.map((landmark, index) => ({
            name: HAND_LANDMARK_NAMES[index],
            x: Math.round(landmark.x * 640 * 10) / 10, // Convert to pixels
            y: Math.round(landmark.y * 480 * 10) / 10,
            z: Math.round(landmark.z * 1000) / 1000, // Keep Z depth
            normalized_x: Math.round(landmark.x * 1000) / 1000, // Keep original 0-1 values
            normalized_y: Math.round(landmark.y * 1000) / 1000
          }));
          
          extractedHandData[handSide] = handData;
        });
        
        setHandLandmarks(extractedHandData);

        // ============================================
        // Log hand data to console (optional)
        // ============================================
        // Uncomment to see data in browser console:
        // console.log('Hand Landmarks:', extractedHandData);

        // Draw hand tracking
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
      }
    });

    detectPoseAndHands();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [detector, hands]);

  // ============================================
  // NEW: Function to export data as JSON
  // ============================================
  const exportLandmarkData = () => {
    const timestamp = new Date().toISOString();
    const data = {
      timestamp,
      body: bodyLandmarks,
      hands: handLandmarks
    };
    
    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dance-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
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
          Full body and hand tracking with real-time data extraction
        </p>
      </div>

      <div style={{
        maxWidth: '680px',
        margin: '0 auto 20px',
        padding: '16px 24px',
        background: isReady 
          ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
          : 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        textAlign: 'center',
        transition: 'all 0.3s ease'
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
          {!isReady && (
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          {status}
        </div>
      </div>

      {/* ============================================ */}
      {/* NEW: Control Buttons */}
      {/* ============================================ */}
      {isReady && (
        <div style={{
          maxWidth: '680px',
          margin: '0 auto 20px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setShowData(!showData)}
            style={{
              padding: '12px 24px',
              background: showData ? 'rgba(255, 107, 157, 0.9)' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            {showData ? '📊 Hide Data' : '📊 Show Data'}
          </button>
          <button
            onClick={exportLandmarkData}
            style={{
              padding: '12px 24px',
              background: 'rgba(64, 224, 208, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            💾 Export Data
          </button>
        </div>
      )}

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
          position: 'relative', 
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          <video
            ref={videoRef}
            width="640"
            height="480"
            autoPlay
            playsInline
            style={{ 
              transform: 'scaleX(-1)', 
              display: 'block',
              width: '100%',
              height: 'auto'
            }}
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'scaleX(-1)',
              width: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* ============================================ */}
        {/* NEW: Real-Time Data Display Panel */}
        {/* ============================================ */}
        {isReady && showData && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            color: 'white',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#ff6b9d' }}>
              Body Landmarks ({bodyLandmarks.length} points)
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '12px',
              marginBottom: '20px'
            }}>
              {bodyLandmarks.map((landmark, idx) => (
                <div key={idx} style={{
                  padding: '8px',
                  background: landmark.visible ? 'rgba(255, 107, 157, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {landmark.name}
                  </div>
                  <div>X: {landmark.x}px</div>
                  <div>Y: {landmark.y}px</div>
                  <div>Conf: {landmark.confidence}%</div>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '20px 0 15px 0', color: '#40E0D0' }}>
              Hand Landmarks
            </h3>
            
            {/* Left Hand */}
            {handLandmarks.left.length > 0 && (
              <>
                <h4 style={{ margin: '10px 0', color: '#40E0D0' }}>
                  Left Hand ({handLandmarks.left.length} points)
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                  fontSize: '11px',
                  marginBottom: '15px'
                }}>
                  {handLandmarks.left.map((landmark, idx) => (
                    <div key={idx} style={{
                      padding: '6px',
                      background: 'rgba(64, 224, 208, 0.2)',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                        {landmark.name}
                      </div>
                      <div>X: {landmark.x}px</div>
                      <div>Y: {landmark.y}px</div>
                      <div>Z: {landmark.z}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Right Hand */}
            {handLandmarks.right.length > 0 && (
              <>
                <h4 style={{ margin: '10px 0', color: '#40E0D0' }}>
                  Right Hand ({handLandmarks.right.length} points)
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                  fontSize: '11px'
                }}>
                  {handLandmarks.right.map((landmark, idx) => (
                    <div key={idx} style={{
                      padding: '6px',
                      background: 'rgba(64, 224, 208, 0.2)',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                        {landmark.name}
                      </div>
                      <div>X: {landmark.x}px</div>
                      <div>Y: {landmark.y}px</div>
                      <div>Z: {landmark.z}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {handLandmarks.left.length === 0 && handLandmarks.right.length === 0 && (
              <p style={{ opacity: 0.7, fontSize: '14px' }}>
                No hands detected. Hold hands in front of camera.
              </p>
            )}
          </div>
        )}

        {isReady && !showData && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: 'white'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              What's Being Tracked
            </h3>
            <div style={{ display: 'flex', gap: '20px', fontSize: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  background: '#ff6b9d',
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                <strong>Body (Pink):</strong> {bodyLandmarks.length} points tracked
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  background: '#40E0D0',
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                <strong>Hands (Teal):</strong> {handLandmarks.left.length + handLandmarks.right.length} points tracked
              </div>
            </div>
            
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
              <li>Click "Show Data" to see real-time position coordinates</li>
              <li>Click "Export Data" to download current positions as JSON</li>
              <li>Hold your hands in view for detailed tracking</li>
              <li>Stand 3-5 feet back for best full-body tracking</li>
            </ul>
          </div>
        )}
      </div>

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