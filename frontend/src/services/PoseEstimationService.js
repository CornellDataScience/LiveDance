/**
 * Service layer for communicating with Python pose estimation backend via WebSocket
 * Implements latest-wins pattern with 60 FPS frame sending
 */

import { io } from 'socket.io-client';

class PoseEstimationService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.socket = null;
    this.connected = false;
    this.sequenceNumber = 0;
    
    // Metrics tracking
    this.metrics = {
      imageCapture: [],
      networkLatency: [],
      jsonParsing: [],
      total: []
    };
    this.frameCount = 0;
    
    // Reusable canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Callback for pose results
    this.onPoseResult = null;
    
    // Latest result for interpolation
    this.latestResult = null;
    this.previousResult = null;
    this.resultTimestamp = 0;
    
    // Performance tracking - track per sequence
    this.frameSendTimes = new Map(); // sequence -> {sendTime, captureTime}
    this.fps = 0;
    this.fpsCounter = 0;
    this.lastFpsTime = Date.now();
    
    // 2D/3D mode toggle
    this.use3D = true; // Default to 3D
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.baseURL, {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.connected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('pose_result', (data) => {
        this.handlePoseResult(data);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Handle incoming pose result from backend
   */
  handlePoseResult(data) {
    const receiveTime = performance.now();
    
    // Get the send time for THIS specific frame
    const sequence = data.sequence;
    const frameInfo = this.frameSendTimes.get(sequence);
    
    let totalTime = 0;
    let imageCaptureTime = 0;
    
    if (frameInfo) {
      totalTime = receiveTime - frameInfo.sendTime;
      imageCaptureTime = frameInfo.captureTime;
      
      // Clean up old entries (keep last 100)
      if (this.frameSendTimes.size > 100) {
        const firstKey = this.frameSendTimes.keys().next().value;
        this.frameSendTimes.delete(firstKey);
      }
    } else {
      // Fallback if sequence not found
      totalTime = 50; // Estimate
      imageCaptureTime = 3;
    }
    
    // Store previous result for interpolation
    this.previousResult = this.latestResult;
    this.latestResult = {
      ...data,
      receiveTime: receiveTime
    };
    this.resultTimestamp = Date.now();
    
    // Calculate FPS
    this.fpsCounter++;
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.lastFpsTime = now;
    }
    
    // Calculate timing metrics correctly
    const backendTime = data.timings?.total_backend || 0;
    const networkLatency = Math.max(0, totalTime - backendTime);
    
    const enrichedData = {
      ...data,
      frontend_timings: {
        image_capture: imageCaptureTime,
        network_latency: networkLatency,
        json_parsing: 0, // No JSON parsing in WebSocket binary mode
        total_frontend: totalTime
      },
      fps: this.fps,
      mode: this.use3D ? '3D' : '2D'
    };
    
    // Call the callback if set
    if (this.onPoseResult) {
      this.onPoseResult(enrichedData);
    }
  }

  /**
   * Send video frame to backend via WebSocket
   * Implements 60 FPS frame sending with latest-wins pattern
   */
  async sendFrame(videoElement) {
    if (!this.connected) {
      console.warn('⚠️ WebSocket not connected, attempting to connect...');
      await this.connect();
    }
    
    try {
      // Mark start time BEFORE capture
      const sendTime = performance.now();
      
      // Capture frame from video
      const captureStart = performance.now();
      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;
      this.ctx.drawImage(videoElement, 0, 0);
      
      // Convert to base64 JPEG
      const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      
      const captureTime = performance.now() - captureStart;
      
      const currentSequence = this.sequenceNumber++;
      
      // Store send time and capture time for THIS sequence
      this.frameSendTimes.set(currentSequence, {
        sendTime: sendTime,
        captureTime: captureTime
      });
      
      // Send frame via WebSocket with mode flag
      this.socket.emit('frame', {
        image: base64Data,
        timestamp: Date.now(),
        sequence: currentSequence,
        use3D: this.use3D
      });
      
      // Track metrics
      this.frameCount++;
      
      // Return immediately - result will come via callback
      return {
        sent: true,
        captureTime: captureTime,
        sequence: currentSequence
      };
      
    } catch (error) {
      console.error('❌ Error sending frame:', error);
      return {
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Toggle between 2D and 3D mode
   */
  toggle2D3D() {
    this.use3D = !this.use3D;
    console.log(`🔄 Switched to ${this.use3D ? '3D' : '2D'} mode`);
    return this.use3D;
  }
  
  /**
   * Get current mode
   */
  getMode() {
    return this.use3D ? '3D' : '2D';
  }

  /**
   * Get interpolated pose result for smooth 60 FPS rendering
   * Uses linear interpolation between last two results
   */
  getInterpolatedResult() {
    if (!this.latestResult) {
      return null;
    }
    
    // If we don't have a previous result, just return latest
    if (!this.previousResult) {
      return this.latestResult;
    }
    
    // Calculate interpolation factor based on time since last result
    const timeSinceResult = Date.now() - this.resultTimestamp;
    const expectedInterval = 1000 / 24; // Assuming ~24 FPS inference
    const t = Math.min(timeSinceResult / expectedInterval, 1.0);
    
    // If t > 1, we're beyond the next expected frame, just return latest
    if (t >= 1.0) {
      return this.latestResult;
    }
    
    // Interpolate body landmarks
    const interpolatedBody = this.latestResult.body.map((landmark, idx) => {
      if (idx >= this.previousResult.body.length) {
        return landmark;
      }
      
      const prev = this.previousResult.body[idx];
      return {
        ...landmark,
        x: prev.x + (landmark.x - prev.x) * t,
        y: prev.y + (landmark.y - prev.y) * t
      };
    });
    
    // Interpolate hand landmarks
    const interpolatedHands = {
      left: this.interpolateHandLandmarks(
        this.previousResult.hands.left,
        this.latestResult.hands.left,
        t
      ),
      right: this.interpolateHandLandmarks(
        this.previousResult.hands.right,
        this.latestResult.hands.right,
        t
      )
    };
    
    return {
      ...this.latestResult,
      body: interpolatedBody,
      hands: interpolatedHands,
      interpolated: true,
      interpolation_factor: t
    };
  }

  /**
   * Helper to interpolate hand landmarks
   */
  interpolateHandLandmarks(prevHand, currentHand, t) {
    if (!prevHand || !currentHand || prevHand.length === 0 || currentHand.length === 0) {
      return currentHand || [];
    }
    
    return currentHand.map((landmark, idx) => {
      if (idx >= prevHand.length) {
        return landmark;
      }
      
      const prev = prevHand[idx];
      return {
        ...landmark,
        x: prev.x + (landmark.x - prev.x) * t,
        y: prev.y + (landmark.y - prev.y) * t
      };
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Check if backend server is available
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }
}

export default PoseEstimationService;
