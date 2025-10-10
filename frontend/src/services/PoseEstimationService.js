/**
 * Service layer for communicating with Python pose estimation backend
 * Handles all API calls to the Flask server
 */

class PoseEstimationService {
  constructor() {
    this.baseURL = 'http://localhost:5001';
  }

  /**
   * Send video frame to Python backend for pose estimation
   * @param {HTMLVideoElement} videoElement - Video element containing current frame
   * @returns {Promise<Object>} - Pose data with body and hand landmarks
   */
  async estimatePose(videoElement) {
    try {
      // Convert video frame to base64 image
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0);
      
      // Get image as blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      
      // Send to backend
      const formData = new FormData();
      formData.append('frame', blob);
      
      const response = await fetch(`${this.baseURL}/estimate_pose`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Silently handle errors - return empty data structure
      console.error('Pose estimation error:', error);
      return {
        body: [],
        hands: { left: [], right: [] }
      };
    }
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

