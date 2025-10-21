/**
 * Service layer for communicating with Python pose estimation backend
 */

class PoseEstimationService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.metrics = {
      imageCapture: [],
      networkLatency: [],
      jsonParsing: [],
      total: []
    };
    this.frameCount = 0;
    
    // Create reusable canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Send video frame to Python backend for pose estimation
   * @param {HTMLVideoElement} videoElement - Video element containing current frame
   * @returns {Promise<Object>} - Pose data with body and hand landmarks with timing info
   */
  async estimatePose(videoElement) {
    const t0 = performance.now();
    
    try {
      // 1. Image capture timing (using cached canvas)
      const captureStart = performance.now();
      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;
      this.ctx.drawImage(videoElement, 0, 0);
      
      const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/jpeg', 0.8));
      const captureTime = performance.now() - captureStart;

      // 2. Network timing
      const networkStart = performance.now();
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      const response = await fetch(`${this.baseURL}/estimate_pose`, {
        method: 'POST',
        body: formData,
      });

      // 3. JSON parsing timing
      const parseStart = performance.now();
      const data = await response.json();
      const parseTime = performance.now() - parseStart;
      
      const networkTime = performance.now() - networkStart;
      const totalTime = performance.now() - t0;

      // Calculate network latency (excluding backend processing)
      const backendTime = data.timings?.total_backend || 0;
      const networkLatency = networkTime - backendTime - parseTime;

      // Collect metrics for averaging
      this.frameCount++;
      this.metrics.imageCapture.push(captureTime);
      this.metrics.networkLatency.push(networkLatency);
      this.metrics.jsonParsing.push(parseTime);
      this.metrics.total.push(totalTime);

      // Log detailed metrics every 30 frames
      if (this.frameCount % 30 === 0) {
        this.logDetailedMetrics();
      }

      // Add frontend timings to response
      return {
        ...data,
        frontend_timings: {
          image_capture: captureTime,
          network_latency: networkLatency,
          json_parsing: parseTime,
          total_frontend: totalTime
        }
      };

    } catch (error) {
      console.error('Pose estimation error:', error);
      return {
        body: [],
        hands: { left: [], right: [] },
        pose_3d_angles: {},
        pose_3d_coords: {},
        timings: {}
      };
    }
  }
  
  logDetailedMetrics() {
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    console.log('%c📊 Performance Breakdown (30 frame average):', 'font-weight: bold; font-size: 14px; color: #0088ff');
    console.table({
      'Image Capture': `${avg(this.metrics.imageCapture).toFixed(1)}ms`,
      'Network Latency': `${avg(this.metrics.networkLatency).toFixed(1)}ms`,
      'JSON Parsing': `${avg(this.metrics.jsonParsing).toFixed(1)}ms`,
      'TOTAL Pipeline': `${avg(this.metrics.total).toFixed(1)}ms`,
      'Estimated FPS': avg(this.metrics.total) > 0 ? (1000 / avg(this.metrics.total)).toFixed(1) : '0'
    });
    
    // Reset metrics
    this.metrics = {
      imageCapture: [],
      networkLatency: [],
      jsonParsing: [],
      total: []
    };
  }

  /**
   * Check if backend server is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default PoseEstimationService;
