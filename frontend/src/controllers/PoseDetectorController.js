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

  // Pose comparison state
  const [referencePose, setReferencePose] = useState(null);
  const [referenceTime, setReferenceTime] = useState(null);
  const [topImprovements, setTopImprovements] = useState([]);
  const [overallScore, setOverallScore] = useState(null);
  const [liveFeedback, setLiveFeedback] = useState({ timing: null, cues: [] });
  const [finalImprovements, setFinalImprovements] = useState([]);
  const [finalScore, setFinalScore] = useState(null);
  const frameScoresRef = useRef([]);
  const lastAggregateTimeRef = useRef(Date.now());
  const referencePoseHistory = useRef([]);
  const lastAggregatedRef = useRef({ improvements: [], overall: null });
  // Minimum joints required to compute a score; keep strict but not so strict that we drop all frames
  const MIN_VISIBLE_JOINTS = 10;

  // Scoring configuration state
  const [scoringMode, setScoringMode] = useState('distance'); // 'distance' or 'cosine'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'

  // Difficulty settings with different decay factors
  const DIFFICULTY_SETTINGS = {
    easy: {
      decayFactor: 1.5,
      label: 'Easy',
      description: 'Forgiving scoring - great for beginners'
    },
    medium: {
      decayFactor: 2.5,
      label: 'Medium',
      description: 'Balanced scoring - standard difficulty'
    },
    hard: {
      decayFactor: 4.0,
      label: 'Hard',
      description: 'Strict scoring - for experienced dancers'
    }
  };

  // Body segment definitions for cosine similarity (joint connections as vectors)
  const BODY_SEGMENTS = {
    left_upper_arm: { start: 'left_shoulder', end: 'left_elbow', name: 'Left Upper Arm' },
    left_forearm: { start: 'left_elbow', end: 'left_wrist', name: 'Left Forearm' },
    right_upper_arm: { start: 'right_shoulder', end: 'right_elbow', name: 'Right Upper Arm' },
    right_forearm: { start: 'right_elbow', end: 'right_wrist', name: 'Right Forearm' },
    left_thigh: { start: 'left_hip', end: 'left_knee', name: 'Left Thigh' },
    left_shin: { start: 'left_knee', end: 'left_ankle', name: 'Left Shin' },
    right_thigh: { start: 'right_hip', end: 'right_knee', name: 'Right Thigh' },
    right_shin: { start: 'right_knee', end: 'right_ankle', name: 'Right Shin' },
    shoulders: { start: 'left_shoulder', end: 'right_shoulder', name: 'Shoulder Line' },
    hips: { start: 'left_hip', end: 'right_hip', name: 'Hip Line' },
    left_torso: { start: 'left_shoulder', end: 'left_hip', name: 'Left Torso' },
    right_torso: { start: 'right_shoulder', end: 'right_hip', name: 'Right Torso' }
  };

  // Weights for body segments in cosine similarity mode
  const SEGMENT_WEIGHTS = {
    left_upper_arm: 1.3,
    left_forearm: 1.4,
    right_upper_arm: 1.3,
    right_forearm: 1.4,
    left_thigh: 1.2,
    left_shin: 1.2,
    right_thigh: 1.2,
    right_shin: 1.2,
    shoulders: 1.1,
    hips: 1.1,
    left_torso: 1.0,
    right_torso: 1.0
  };
  const JOINT_WEIGHTS = {
    left_shoulder: 1.3,
    right_shoulder: 1.3,
    left_elbow: 1.3,
    right_elbow: 1.3,
    left_wrist: 1.4,
    right_wrist: 1.4,
    left_hip: 1.1,
    right_hip: 1.1,
    left_knee: 1.2,
    right_knee: 1.2,
    left_ankle: 1.2,
    right_ankle: 1.2
  };

  // Human-readable names for body parts
  const BODY_PART_NAMES = {
    'nose': 'Head Position',
    'left_eye': 'Left Eye',
    'right_eye': 'Right Eye',
    'left_ear': 'Left Ear',
    'right_ear': 'Right Ear',
    'left_shoulder': 'Left Shoulder',
    'right_shoulder': 'Right Shoulder',
    'left_elbow': 'Left Elbow',
    'right_elbow': 'Right Elbow',
    'left_wrist': 'Left Wrist',
    'right_wrist': 'Right Wrist',
    'left_hip': 'Left Hip',
    'right_hip': 'Right Hip',
    'left_knee': 'Left Knee',
    'right_knee': 'Right Knee',
    'left_ankle': 'Left Ankle',
    'right_ankle': 'Right Ankle',
  };

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
   * Normalize pose to be position and scale invariant
   */
  const normalizePose = (landmarks) => {
    if (!landmarks || landmarks.length < 17) return null;

    // Confidence check slightly relaxed to avoid dropping too many frames
    const visibleCount = landmarks.filter(lm => lm.visible && lm.confidence > 50).length;
    if (visibleCount < MIN_VISIBLE_JOINTS) return null;

    const leftShoulder = landmarks.find(lm => lm.name === 'left_shoulder');
    const rightShoulder = landmarks.find(lm => lm.name === 'right_shoulder');

    if (!leftShoulder || !rightShoulder) return null;

    const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    const centerY = (leftShoulder.y + rightShoulder.y) / 2;

    const shoulderWidth = Math.sqrt(
      Math.pow(leftShoulder.x - rightShoulder.x, 2) +
      Math.pow(leftShoulder.y - rightShoulder.y, 2)
    );

    if (shoulderWidth < 10) return null;

    const normalized = {};
    landmarks.forEach(lm => {
      if (lm.visible) {
        normalized[lm.name] = {
          x: (lm.x - centerX) / shoulderWidth,
          y: (lm.y - centerY) / shoulderWidth
        };
      }
    });

    return normalized;
  };

  /**
   * Calculate similarity score for each joint (0-100) with directional data
   * Uses distance-based exponential decay with configurable difficulty
   */
  const calculateJointSimilarity = (userPose, refPose) => {
    if (!userPose || !refPose) return {};

    const decayFactor = DIFFICULTY_SETTINGS[difficulty].decayFactor;
    const similarities = {};

    Object.keys(userPose).forEach(jointName => {
      if (refPose[jointName]) {
        const dx = userPose[jointName].x - refPose[jointName].x;
        const dy = userPose[jointName].y - refPose[jointName].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const similarity = 100 * Math.exp(-distance * decayFactor);
        const weight = JOINT_WEIGHTS[jointName] || 1;

        similarities[jointName] = {
          score: Math.round(similarity * weight * 10) / 10,
          dx: dx,
          dy: dy
        };
      }
    });

    return similarities;
  };

  /**
   * Calculate cosine similarity between two vectors
   * Returns value between -1 and 1, where 1 means identical direction
   */
  const cosineSimilarity = (v1, v2) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 < 0.001 || mag2 < 0.001) return 0; // Avoid division by zero

    return dot / (mag1 * mag2);
  };

  /**
   * Get angle difference between two vectors in degrees
   */
  const getAngleDifference = (v1, v2) => {
    const cos = cosineSimilarity(v1, v2);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cos)));
    return angleRad * (180 / Math.PI);
  };

  /**
   * Get directional recommendation for body segment based on angle difference
   */
  const getSegmentRecommendation = (userVec, refVec, segmentName) => {
    const angleDiff = getAngleDifference(userVec, refVec);

    if (angleDiff < 10) return 'Good angle!';

    // Calculate cross product to determine rotation direction
    const cross = userVec.x * refVec.y - userVec.y * refVec.x;
    const rotationDir = cross > 0 ? 'counterclockwise' : 'clockwise';

    // Determine magnitude word
    let magnitude = '';
    if (angleDiff < 20) magnitude = 'slightly';
    else if (angleDiff < 40) magnitude = '';
    else magnitude = 'significantly';

    // Customize recommendation based on body part
    const isArm = segmentName.includes('Arm') || segmentName.includes('Forearm');
    const isLeg = segmentName.includes('Thigh') || segmentName.includes('Shin');

    if (isArm) {
      return `Rotate arm ${magnitude} ${rotationDir} (~${Math.round(angleDiff)}°)`;
    } else if (isLeg) {
      return `Adjust leg ${magnitude} ${rotationDir} (~${Math.round(angleDiff)}°)`;
    } else {
      return `Rotate ${magnitude} ${rotationDir} (~${Math.round(angleDiff)}°)`;
    }
  };

  /**
   * Calculate cosine similarity for body segments
   * Compares the direction/angle of body parts rather than absolute positions
   */
  const calculateSegmentSimilarity = (userPose, refPose) => {
    if (!userPose || !refPose) return {};

    const decayFactor = DIFFICULTY_SETTINGS[difficulty].decayFactor;
    const similarities = {};

    Object.entries(BODY_SEGMENTS).forEach(([segmentKey, segment]) => {
      const userStart = userPose[segment.start];
      const userEnd = userPose[segment.end];
      const refStart = refPose[segment.start];
      const refEnd = refPose[segment.end];

      if (userStart && userEnd && refStart && refEnd) {
        // Calculate direction vectors
        const userVec = {
          x: userEnd.x - userStart.x,
          y: userEnd.y - userStart.y
        };
        const refVec = {
          x: refEnd.x - refStart.x,
          y: refEnd.y - refStart.y
        };

        // Calculate cosine similarity (-1 to 1) and convert to score (0 to 100)
        const cos = cosineSimilarity(userVec, refVec);
        // Map cosine similarity to score: 1 -> 100, 0 -> 50, -1 -> 0
        // Then apply difficulty-based decay for stricter scoring at higher difficulties
        const baseScore = ((cos + 1) / 2) * 100;
        // Apply exponential adjustment based on difficulty (makes mid-range scores harsher)
        const adjustedScore = 100 * Math.pow(baseScore / 100, decayFactor / 2);

        const weight = SEGMENT_WEIGHTS[segmentKey] || 1;
        const angleDiff = getAngleDifference(userVec, refVec);

        similarities[segmentKey] = {
          score: Math.round(adjustedScore * weight * 10) / 10,
          cosine: Math.round(cos * 1000) / 1000,
          angleDiff: Math.round(angleDiff * 10) / 10,
          recommendation: getSegmentRecommendation(userVec, refVec, segment.name),
          name: segment.name,
          userVec,
          refVec
        };
      }
    });

    return similarities;
  };

  /**
   * Unified similarity calculation that uses either distance or cosine based on mode
   */
  const calculateSimilarity = (userPose, refPose) => {
    if (scoringMode === 'cosine') {
      return calculateSegmentSimilarity(userPose, refPose);
    }
    return calculateJointSimilarity(userPose, refPose);
  };

  /**
   * Find best matching reference frame to understand timing alignment
   */
  const findBestReferenceMatch = (userLandmarks) => {
    const userNormalized = normalizePose(userLandmarks);
    if (!userNormalized || referencePoseHistory.current.length === 0) return null;

    let best = null;
    referencePoseHistory.current.forEach(entry => {
      const refNormalized = normalizePose(entry.pose);
      if (!refNormalized) return;

      const similarityData = calculateSimilarity(userNormalized, refNormalized);
      const scores = Object.values(similarityData).map(j => j.score);
      if (scores.length === 0) return;

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (!best || avgScore > best.avgScore) {
        best = {
          avgScore,
          timestamp: entry.timestamp,
          joints: similarityData,
          userNormalized
        };
      }
    });

    return best;
  };

  /**
   * Determine whether the dancer is early/on time/late
   */
  const getTimingFeedback = (bestMatch) => {
    if (!bestMatch || referencePoseHistory.current.length === 0) return null;

    const latestRef = referencePoseHistory.current[referencePoseHistory.current.length - 1];
    const prevRef = referencePoseHistory.current.length > 1
      ? referencePoseHistory.current[referencePoseHistory.current.length - 2]
      : null;

    if (!latestRef || !latestRef.pose) return null;

    const currentRefNorm = normalizePose(latestRef.pose);
    const prevRefNorm = prevRef ? normalizePose(prevRef.pose) : null;
    if (!currentRefNorm) return null;

    const timeDelta = latestRef.timestamp - bestMatch.timestamp;

    if (timeDelta > 0.25) {
      const rounded = Math.round(timeDelta * 100) / 100;
      return {
        status: 'late',
        delta: rounded,
        message: `You're about ${rounded}s behind`
      };
    }

    // Heuristic: if user progressed further along the motion vector than reference, they're early
    let aheadVotes = 0;
    let voteTotal = 0;
    if (prevRefNorm) {
      Object.keys(bestMatch.joints).forEach(joint => {
        if (currentRefNorm[joint] && prevRefNorm[joint] && bestMatch.userNormalized[joint]) {
          const motion = {
            x: currentRefNorm[joint].x - prevRefNorm[joint].x,
            y: currentRefNorm[joint].y - prevRefNorm[joint].y
          };
          const motionMagSq = motion.x * motion.x + motion.y * motion.y;
          if (motionMagSq < 1e-6) return;

          const userOffset = {
            x: bestMatch.userNormalized[joint].x - currentRefNorm[joint].x,
            y: bestMatch.userNormalized[joint].y - currentRefNorm[joint].y
          };

          const projection = (userOffset.x * motion.x + userOffset.y * motion.y) / motionMagSq;
          if (projection > 0.6) {
            aheadVotes += 1;
          }
          voteTotal += 1;
        }
      });
    }

    if (voteTotal > 0 && aheadVotes / voteTotal > 0.5) {
      return {
        status: 'early',
        delta: 0,
        message: 'You are slightly ahead—wait a beat'
      };
    }

    return {
      status: 'on-time',
      delta: 0,
      message: 'On time—keep the rhythm!'
    };
  };

  /**
   * Build concise directional cues (up/down/left/right) for the user
   */
  const buildDirectionalCues = (bestMatch) => {
    if (!bestMatch || !bestMatch.joints) return [];

    const sorted = Object.entries(bestMatch.joints)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3);

    return sorted.map(([jointName, data]) => {
      const recommendation = getDirectionalRecommendation(data.dx, data.dy, jointName);
      return {
        joint: jointName,
        name: BODY_PART_NAMES[jointName] || jointName,
        recommendation,
        score: Math.round(data.score)
      };
    }).filter(item => item.recommendation && item.recommendation !== 'Good position!');
  };

  /**
   * Convert dx/dy to intuitive directional recommendation
   */
  const getDirectionalRecommendation = (dx, dy, jointName) => {
    const directions = [];

    // Determine magnitude thresholds (in normalized shoulder-width units)
    const getMagnitudeWord = (value) => {
      const abs = Math.abs(value);
      if (abs < 0.15) return null; // Too small to mention
      if (abs < 0.35) return 'slightly';
      if (abs < 0.6) return '';
      return 'a lot';
    };

    // Horizontal direction (dx > 0 means user is too far right on screen, but due to mirror view, tell them to move right)
    const hMag = getMagnitudeWord(dx);
    if (hMag !== null) {
      const hDir = dx > 0 ? 'right' : 'left';
      directions.push(`${hMag} ${hDir}`.trim());
    }

    // Vertical direction (no flip needed)
    const vMag = getMagnitudeWord(dy);
    if (vMag !== null) {
      const vDir = dy > 0 ? 'up' : 'down';
      directions.push(`${vMag} ${vDir}`.trim());
    }

    if (directions.length === 0) return 'Good position!';

    // Format based on body part type
    const isArm = jointName.includes('wrist') || jointName.includes('elbow');
    const isLeg = jointName.includes('knee') || jointName.includes('ankle');
    const isHead = jointName.includes('nose') || jointName.includes('eye') || jointName.includes('ear');

    let action = 'Move';
    if (isHead) action = 'Tilt';
    else if (isArm) action = 'Move';
    else if (isLeg) action = 'Move';

    return `${action} ${directions.join(' and ')}`;
  };

  /**
   * Compare current user pose with reference pose
   */
  const comparePoses = (userLandmarks, refLandmarks) => {
    const userNormalized = normalizePose(userLandmarks);
    const refNormalized = normalizePose(refLandmarks);

    if (!userNormalized || !refNormalized) return null;

    return calculateSimilarity(userNormalized, refNormalized);
  };

  /**
   * Aggregate frame scores and calculate top 10 improvements with recommendations
   */
  const aggregateScores = () => {
    const currentTime = Date.now();

    // Only aggregate every second
    if (currentTime - lastAggregateTimeRef.current < 1000) return;

    if (frameScoresRef.current.length === 0) {
      lastAggregateTimeRef.current = currentTime;
      return;
    }

    // Average scores and directions/angles across all frames
    const itemTotals = {};
    const itemCounts = {};
    const itemDxTotals = {};
    const itemDyTotals = {};
    const itemAngleTotals = {};
    const itemRecommendations = {};
    const itemNames = {};

    frameScoresRef.current.forEach(frameScore => {
      Object.entries(frameScore).forEach(([item, data]) => {
        if (!itemTotals[item]) {
          itemTotals[item] = 0;
          itemCounts[item] = 0;
          itemDxTotals[item] = 0;
          itemDyTotals[item] = 0;
          itemAngleTotals[item] = 0;
        }
        itemTotals[item] += data.score;
        itemCounts[item] += 1;

        // Handle distance mode data
        if (data.dx !== undefined) {
          itemDxTotals[item] += data.dx;
          itemDyTotals[item] += data.dy;
        }

        // Handle cosine mode data
        if (data.angleDiff !== undefined) {
          itemAngleTotals[item] += data.angleDiff;
          itemRecommendations[item] = data.recommendation;
          itemNames[item] = data.name;
        }
      });
    });

    // Calculate averages
    const avgScores = {};
    const avgDx = {};
    const avgDy = {};
    const avgAngles = {};
    Object.keys(itemTotals).forEach(item => {
      avgScores[item] = Math.round((itemTotals[item] / itemCounts[item]) * 10) / 10;
      avgDx[item] = itemDxTotals[item] / itemCounts[item];
      avgDy[item] = itemDyTotals[item] / itemCounts[item];
      avgAngles[item] = Math.round((itemAngleTotals[item] / itemCounts[item]) * 10) / 10;
    });

    // Sort by score (lowest = needs most improvement)
    const sortedItems = Object.entries(avgScores).sort((a, b) => a[1] - b[1]);

    // Get top 10 areas needing improvement with appropriate recommendations
    const improvements = sortedItems.slice(0, 10).map(([itemName, score]) => {
      if (scoringMode === 'cosine') {
        // Cosine mode - use segment names and angle-based recommendations
        return {
          joint: itemName,
          name: itemNames[itemName] || BODY_SEGMENTS[itemName]?.name || itemName,
          score: score,
          improvementNeeded: Math.round((100 - score) * 10) / 10,
          angleDiff: avgAngles[itemName],
          recommendation: itemRecommendations[itemName] || `Adjust angle (~${avgAngles[itemName]}° off)`
        };
      } else {
        // Distance mode - use joint names and directional recommendations
        return {
          joint: itemName,
          name: BODY_PART_NAMES[itemName] || itemName,
          score: score,
          improvementNeeded: Math.round((100 - score) * 10) / 10,
          recommendation: getDirectionalRecommendation(avgDx[itemName], avgDy[itemName], itemName)
        };
      }
    });

    // Calculate overall score with appropriate weights
    let weightedTotal = 0;
    let weightSum = 0;
    const weights = scoringMode === 'cosine' ? SEGMENT_WEIGHTS : JOINT_WEIGHTS;
    Object.entries(avgScores).forEach(([item, score]) => {
      const w = weights[item] || 1;
      weightedTotal += score * w;
      weightSum += w;
    });
    const overall = weightSum > 0
      ? Math.round((weightedTotal / weightSum) * 10) / 10
      : 0;

    setTopImprovements(improvements);
    setOverallScore(overall);
    lastAggregatedRef.current = { improvements, overall };

    // Clear scores for next second
    frameScoresRef.current = [];
    lastAggregateTimeRef.current = currentTime;
  };

  /**
   * Handle reference pose from video player
   */
  const handleReferencePose = (landmarks, timestamp) => {
    setReferencePose(landmarks);
    setReferenceTime(timestamp ?? null);

    if (landmarks && typeof timestamp === 'number') {
      referencePoseHistory.current.push({ timestamp, pose: landmarks });
      const cutoff = timestamp - 3; // Keep last 3 seconds of reference poses
      referencePoseHistory.current = referencePoseHistory.current.filter(
        entry => entry.timestamp >= cutoff
      );
    }
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

    // Draw hands
    const drawHand = (landmarks) => {
      if (!landmarks || landmarks.length === 0) return;

      const landmarkMap = {};
      landmarks.forEach((landmark) => {
        landmarkMap[landmark.name] = landmark;
      });

      ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      HAND_CONNECTIONS_BY_NAME.forEach(([startName, endName]) => {
        const startPoint = landmarkMap[startName];
        const endPoint = landmarkMap[endName];

        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      });

      TRACKED_HAND_LANDMARKS.forEach((name) => {
        const landmark = landmarkMap[name];
        if (!landmark) {
          return;
        }

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

  /**
   * Compare user pose with reference pose every frame
   * Aggregate and calculate improvements every second
   */
  useEffect(() => {
    if (!videoPlaying || !referencePose || !bodyLandmarks || bodyLandmarks.length === 0) {
      // Clear improvements when video stops
      if (!videoPlaying) {
        if (topImprovements.length > 0) {
          setTopImprovements([]);
          setOverallScore(null);
          frameScoresRef.current = [];
        }
        setLiveFeedback({ timing: null, cues: [] });
        // Capture final summary when playback stops
        if (lastAggregatedRef.current && lastAggregatedRef.current.improvements.length > 0) {
          setFinalImprovements(lastAggregatedRef.current.improvements.slice(0, 5));
          setFinalScore(lastAggregatedRef.current.overall);
        }
      }
      return;
    }

    const bestMatch = findBestReferenceMatch(bodyLandmarks);
    if (bestMatch) {
      setLiveFeedback({
        timing: getTimingFeedback(bestMatch),
        cues: buildDirectionalCues(bestMatch),
        matchScore: Math.round(bestMatch.avgScore)
      });
    }

    // Compare poses for this frame
    const frameScore = comparePoses(bodyLandmarks, referencePose);
    if (frameScore && Object.keys(frameScore).length > 0) {
      frameScoresRef.current.push(frameScore);
    }

    // Aggregate scores every second
    aggregateScores();
  }, [bodyLandmarks, referencePose, videoPlaying, scoringMode, difficulty]);

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
    togglePerformanceMonitor,
    // Pose comparison
    topImprovements,
    overallScore,
    finalImprovements,
    finalScore,
    liveFeedback,
    handleReferencePose,
    // Scoring configuration
    scoringMode,
    setScoringMode,
    difficulty,
    setDifficulty,
    DIFFICULTY_SETTINGS
  };
};
