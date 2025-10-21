# 3D Pose Coordinates Implementation Guide

## What Was Added

### Backend Changes (`backend/app.py`)

1. **Updated `calculate_3d_angles_mediapipe()` function:**
   - Now returns both `angles` and `coordinates`
   - Extracts 3D X, Y, Z coordinates for 12 key joints
   - Joints tracked: shoulders, elbows, wrists, hips, knees, ankles

2. **Updated `calculate_3d_angles_temporal()` function:**
   - Now returns both `angles` and `coordinates`
   - Extracts 3D coordinates from temporal model predictions

3. **Updated `/estimate_pose` endpoint:**
   - Returns new field: `pose_3d_coords` alongside `pose_3d_angles`
   - Prints coordinates to console for debugging

### Frontend Changes

1. **Controller (`frontend/src/controllers/PoseDetectorController.js`):**
   - Added `pose3DCoords` state
   - Captures `pose_3d_coords` from backend response
   - Includes coordinates in exported JSON data

2. **View (`frontend/src/views/PoseDetectorView.js`):**
   - Added new "3D Joint Coordinates" section (pink/rose colored)
   - Displays X, Y, Z values for each joint
   - Shown when clicking "Show Data" button

## How to Use

### Testing the Implementation

1. **Start the backend:**
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **View 3D data:**
   - Open http://localhost:3000
   - Click "Show Data" button
   - Scroll to see:
     - **Gold section**: 3D Joint Angles
     - **Pink section**: 3D Joint Coordinates

### Understanding the Coordinates

**Coordinate System:**
- **X**: Left (-) to Right (+)
- **Y**: Up (-) to Down (+)
- **Z**: Toward camera (-) to Away from camera (+)

**Example Coordinates:**
```json
{
  "left_wrist": {
    "x": -0.123,  // Left of center
    "y": 0.456,   // Below center
    "z": -0.089   // Toward camera
  }
}
```

### Testing Arm Direction

**Test 1: Point arm toward camera**
- Watch `left_wrist` Z value decrease (becomes more negative)
- Elbow angle might stay same, but Z coordinate changes

**Test 2: Point arm away from camera**
- Watch `right_wrist` Z value increase (becomes more positive)

**Test 3: Raise arms sideways**
- Watch X values: left arm goes negative, right arm goes positive
- Y values should decrease (moving up)

**Test 4: Bend knees**
- Watch knee angles decrease
- Y coordinates of ankles should increase (moving down)

## Angle Reference Points

### Left Hip Angle (60°)
- Point 1: Left hip joint
- Point 2: Right hip joint (vertex)
- Point 3: Left knee joint
- **60°** = Leg bent like sitting position

### Left Elbow Angle (120°)
- Point 1: Left shoulder
- Point 2: Left elbow (vertex)
- Point 3: Left wrist
- **120°** = Slightly bent arm
- **180°** = Fully extended arm

## Detecting Arm Direction from Coordinates

```python
# Check if left arm pointing toward camera
if pose_3d_coords['left_wrist']['z'] < pose_3d_coords['left_shoulder']['z']:
    print("Left arm pointing toward camera")

# Check if right arm pointing away
if pose_3d_coords['right_wrist']['z'] > pose_3d_coords['right_shoulder']['z']:
    print("Right arm pointing away from camera")

# Check if arm raised sideways
if abs(pose_3d_coords['right_wrist']['x']) > abs(pose_3d_coords['right_shoulder']['x']):
    print("Arm extended to the side")
```

## Console Output

Check Terminal 1 (backend) for:
```
MediaPipe 3D angles: {'left_elbow': 145.2, 'right_elbow': 138.7, ...}
MediaPipe 3D coords: {'left_shoulder': {'x': -0.123, 'y': 0.456, 'z': -0.089}, ...}
```

## Exported JSON Format

When clicking "Export Data":
```json
{
  "timestamp": "2025-10-20T03:50:12.765Z",
  "body": [...],
  "hands": {...},
  "pose3DAngles": {
    "left_elbow": 145.2,
    "right_knee": 172.1,
    ...
  },
  "pose3DCoords": {
    "left_wrist": {"x": -0.123, "y": 0.456, "z": -0.089},
    "right_wrist": {"x": 0.234, "y": 0.567, "z": 0.123},
    ...
  }
}
```

## Troubleshooting

**No coordinates showing:**
- Check Method 1 is uncommented in `backend/app.py` (line 402)
- Ensure you're visible in camera with full body in frame
- Check backend console for coordinate output

**Coordinates not changing:**
- Make sure MediaPipe 3D is active (not temporal model)
- Check that pose is being detected (pink skeleton visible)
- Try moving slowly and deliberately

**Z coordinates seem wrong:**
- MediaPipe's Z is relative to hip center
- Small movements in Z are normal
- Large arm extensions should show clear Z changes

## Next Steps

Use these coordinates to:
1. Detect specific dance poses
2. Calculate movement velocity
3. Track body orientation
4. Measure symmetry between left/right sides
5. Detect if limbs are in/out of camera view

