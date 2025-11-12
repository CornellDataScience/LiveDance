import React, { useState, useEffect, useRef } from 'react';
import YouTubeDownloader from './YouTubeDownloader';
import PoseEstimationService from '../services/PoseEstimationService';
import { headerButtonStyle, getHeaderButtonBackground } from '../styles/buttonStyles';

/**
 * ReferenceVideoPlayer - Display downloaded YouTube videos for reference
 * Shows video selector and player for side-by-side comparison with live camera
 */
const ReferenceVideoPlayer = ({ onVideoSelect, videoPlayerControlRef, setVideoPlaying }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDownloader, setShowDownloader] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [referenceFps, setReferenceFps] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseService = useRef(new PoseEstimationService());
  const animationRef = useRef(null);
  const socketRef = useRef(null);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });
  const lastSendTimeRef = useRef(0);

  /**
   * Fetch available videos from backend
   */
  useEffect(() => {
    fetchVideos();
  }, []);

  /**
   * Setup WebSocket connection for reference video pose estimation
   */
  useEffect(() => {
    // Get socket from PoseEstimationService
    socketRef.current = poseService.current.socket;

    // If not connected yet, connect
    if (!socketRef.current) {
      poseService.current.connect().then(() => {
        socketRef.current = poseService.current.socket;

        // Listen for reference pose results
        socketRef.current.on('reference_pose_result', (data) => {
          // Draw skeleton with received pose data
          drawSkeleton(data);
        });
      }).catch(err => {
        console.error('Failed to connect to WebSocket:', err);
      });
    } else {
      // Already connected, just add listener
      socketRef.current.on('reference_pose_result', (data) => {
        drawSkeleton(data);
      });
    }

    // Cleanup listener on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('reference_pose_result');
      }
    };
  }, []);

  /**
   * Expose play control to parent via ref
   */
  useEffect(() => {
    if (videoPlayerControlRef) {
      videoPlayerControlRef.current = {
        play: () => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        },
        pause: () => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      };
    }
  }, [videoPlayerControlRef]);

  /**
   * Track video play/pause state
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !setVideoPlaying) return;

    const handlePlay = () => setVideoPlaying(true);
    const handlePause = () => setVideoPlaying(false);
    const handleEnded = () => setVideoPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedVideo, setVideoPlaying]);

  const fetchVideos = async () => {
    try {
      console.log('[DEBUG] ReferenceVideoPlayer: Fetching videos...');
      setLoading(true);
      const response = await fetch('http://localhost:8000/list_downloads');
      console.log('[DEBUG] ReferenceVideoPlayer: Response status:', response.status);
      const data = await response.json();
      console.log('[DEBUG] ReferenceVideoPlayer: Received data:', data);

      // Filter for video files only
      const videoFiles = data.files.filter(f => f.filename.endsWith('.mp4'));
      console.log('[DEBUG] ReferenceVideoPlayer: Filtered video files:', videoFiles);
      setVideos(videoFiles);
      setLoading(false);
    } catch (err) {
      setError('Failed to load videos');
      setLoading(false);
      console.error('[ERROR] ReferenceVideoPlayer: Error fetching videos:', err);
    }
  };

  const handleVideoSelect = (video) => {
    console.log('[DEBUG] ReferenceVideoPlayer: Video selected:', video);
    setSelectedVideo(video);
    if (onVideoSelect) {
      onVideoSelect(video);
    }
  };

  const handleClearVideo = () => {
    console.log('[DEBUG] ReferenceVideoPlayer: Clearing video');
    setSelectedVideo(null);
    if (onVideoSelect) {
      onVideoSelect(null);
    }
  };

  const handleDownloadComplete = (data) => {
    console.log('[DEBUG] ReferenceVideoPlayer: Download complete:', data);
    // Refresh the video list
    fetchVideos();
    // Hide the downloader
    setShowDownloader(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Draw skeleton on canvas
   */
  const drawSkeleton = (poses) => {
    if (!canvasRef.current || !videoRef.current) return;

    // Track rendering FPS
    fpsCounterRef.current.count++;
    const now = Date.now();
    const elapsed = now - fpsCounterRef.current.lastTime;

    if (elapsed >= 1000) {
      setReferenceFps(fpsCounterRef.current.count);
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }

    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (!showSkeleton || !poses.body || poses.body.length === 0) return;

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

    // HAND TRACKING DISABLED
    // // Draw hands
    // const drawHand = (landmarks) => {
    //   if (!landmarks || landmarks.length === 0) return;

    //   const handConnections = [
    //     [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    //     [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    //     [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    //     [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    //     [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    //     [5, 9], [9, 13], [13, 17]             // Palm
    //   ];

    //   ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
    //   ctx.lineWidth = 3;

    //   handConnections.forEach(([i, j]) => {
    //     const point1 = landmarks[i];
    //     const point2 = landmarks[j];

    //     if (point1 && point2) {
    //       ctx.beginPath();
    //       ctx.moveTo(point1.x, point1.y);
    //       ctx.lineTo(point2.x, point2.y);
    //       ctx.stroke();
    //     }
    //   });

    //   landmarks.forEach((landmark) => {
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
   * Main detection loop for reference video
   * Throttled to 60 FPS for optimal performance
   */
  const detectPose = () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const now = performance.now();
    const TARGET_FPS = 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS; // 16.67ms

    // Only process if video is playing
    if (!videoRef.current.paused && !videoRef.current.ended && socketRef.current) {
      // Throttle to 60 FPS
      if (now - lastSendTimeRef.current >= FRAME_INTERVAL) {
        lastSendTimeRef.current = now;

        try {
          // Convert video frame to base64
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0);

          // Convert to base64
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = imageData.split(',')[1];

          // Send via WebSocket (fire-and-forget, non-blocking!)
          socketRef.current.emit('reference_frame', {
            image: base64Data,
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
            timestamp: Date.now()
          });

        } catch (error) {
          console.error('Reference video pose detection error:', error);
        }
      }
    }

    // Schedule next frame immediately (no blocking!)
    animationRef.current = requestAnimationFrame(detectPose);
  };

  /**
   * Resize canvas to match video dimensions
   */
  const resizeCanvas = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    }
  };

  /**
   * Start pose detection when video is selected
   */
  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      // Wait for video to be ready
      const startDetection = () => {
        resizeCanvas();
        detectPose();
      };

      const handleResize = () => {
        resizeCanvas();
      };

      videoRef.current.addEventListener('loadeddata', startDetection);
      videoRef.current.addEventListener('resize', handleResize);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', startDetection);
          videoRef.current.removeEventListener('resize', handleResize);
        }
      };
    }
  }, [selectedVideo, showSkeleton]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: 'white'
        }}>
          Reference Video
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowDownloader(!showDownloader)}
            style={{
              ...headerButtonStyle,
              background: getHeaderButtonBackground(showDownloader)
            }}
          >
            {showDownloader ? 'Hide Downloader' : 'Download Video'}
          </button>
          <button
            onClick={fetchVideos}
            style={{
              ...headerButtonStyle,
              background: '#667eea'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* YouTube Downloader */}
      {showDownloader && (
        <div style={{ marginBottom: '16px' }}>
          <YouTubeDownloader onDownloadComplete={handleDownloadComplete} />
        </div>
      )}

      {loading && (
        <p style={{ color: 'white', fontSize: '14px' }}>Loading videos...</p>
      )}

      {error && (
        <p style={{ color: '#ff6b9d', fontSize: '14px' }}>{error}</p>
      )}

      {!loading && !error && videos.length === 0 && !showDownloader && (
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '75%', // 4:3 aspect ratio (480/640 = 0.75)
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🎥
            </div>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              margin: '0 0 8px 0'
            }}>
              No videos yet!
            </p>
            <p style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
              Download a YouTube dance video to get started
            </p>
            <button
              onClick={() => setShowDownloader(true)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              Download Your First Video
            </button>
          </div>
        </div>
      )}

      {!selectedVideo && videos.length > 0 && !showDownloader && (
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '75%', // 4:3 aspect ratio (480/640 = 0.75)
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px'
          }}>
            {videos.map((video, idx) => (
              <div
                key={idx}
                onClick={() => handleVideoSelect(video)}
                style={{
                  padding: '12px',
                  marginBottom: idx === videos.length - 1 ? '0' : '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2d3748',
                  marginBottom: '4px',
                  wordBreak: 'break-word'
                }}>
                  {video.filename}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#718096'
                }}>
                  {formatFileSize(video.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedVideo && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#2d3748',
            wordBreak: 'break-word',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{selectedVideo.filename}</span>
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: showSkeleton ? '#38a169' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}
            >
              {showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
            </button>
          </div>

          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <video
              ref={videoRef}
              key={selectedVideo.filename}
              controls
              loop
              style={{
                display: 'block',
                width: '100%',
                height: 'auto'
              }}
              src={`http://localhost:8000/video/${selectedVideo.filename}`}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: 'auto',
                pointerEvents: 'none'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#00ff00',
              padding: '8px 12px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 'bold',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              Reference: {referenceFps} FPS
            </div>
          </div>

          <button
            onClick={handleClearVideo}
            style={{
              marginTop: '12px',
              padding: '10px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Clear Video
          </button>
        </div>
      )}
    </div>
  );
};

export default ReferenceVideoPlayer;