
import React, { useRef, useEffect, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

function PoseDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [detector, setDetector] = useState(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        setStatus('📷 Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('✅ Camera connected!');
        }
      } catch (error) {
        setStatus('❌ Camera error: ' + error.message);
        console.error(error);
      }
    }

    async function loadModel() {
      try {
        setStatus('🔧 Initializing TensorFlow backend...');
        
        // CRITICAL FIX: Initialize backend first
        await tf.setBackend('webgl');
        await tf.ready();
        
        setStatus('🤖 Loading pose detection model...');
        
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        const det = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        
        setDetector(det);
        setStatus('✅ Ready! Move around to see pose detection.');
      } catch (error) {
        setStatus('❌ Model error: ' + error.message);
        console.error('Full error:', error);
      }
    }

    setupCamera();
    loadModel();
  }, []);

  useEffect(() => {
    if (!detector || !videoRef.current) return;

    const detectPose = async () => {
      if (videoRef.current.readyState === 4) {
        try {
          const poses = await detector.estimatePoses(videoRef.current);
          
          if (poses.length > 0 && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, 640, 480);
            
            // Draw keypoints (joints)
            poses[0].keypoints.forEach(keypoint => {
              if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
                ctx.fillStyle = '#00ff00';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            });

            // Draw skeleton connections
            const connections = [
              [5, 7], [7, 9],   // Left arm
              [6, 8], [8, 10],  // Right arm
              [5, 6],           // Shoulders
              [5, 11], [6, 12], // Torso
              [11, 12],         // Hips
              [11, 13], [13, 15], // Left leg
              [12, 14], [14, 16]  // Right leg
            ];

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            
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
        } catch (error) {
          console.error('Detection error:', error);
        }
      }
      requestAnimationFrame(detectPose);
    };

    detectPose();
  }, [detector]);

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ color: '#00ff00' }}>💃 Dance Trainer - Pose Detection Test</h1>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: status.includes('✅') ? '#1a4d2e' : '#4d1a1a',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '20px auto',
        maxWidth: '640px'
      }}>
        Status: {status}
      </div>
      
      <div style={{ 
        position: 'relative', 
        display: 'inline-block',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,255,0,0.3)'
      }}>
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          playsInline
          style={{ transform: 'scaleX(-1)', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'scaleX(-1)'
          }}
        />
      </div>
      
      <div style={{ 
        marginTop: '30px', 
        textAlign: 'left', 
        maxWidth: '640px', 
        margin: '30px auto',
        backgroundColor: '#2a2a2a',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h3 style={{ color: '#00ff00' }}>✅ What You Should See:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Your webcam feed (mirrored)</li>
          <li>Green dots on your body joints</li>
          <li>Green lines connecting the dots (skeleton)</li>
          <li>Everything should follow your movements in real-time</li>
        </ul>
        
        <h3 style={{ color: '#ffaa00', marginTop: '20px' }}>💡 Tips:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Stand back so your full body is visible</li>
          <li>Make sure you have good lighting</li>
          <li>Try moving your arms and legs - watch the skeleton follow!</li>
        </ul>
      </div>
    </div>
  );
}

export default PoseDetector;