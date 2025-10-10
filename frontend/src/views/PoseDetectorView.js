import React from 'react';

/**
 * View: Pure UI component for pose detection display
 * Receives all data and callbacks from Controller
 */
const PoseDetectorView = ({
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
}) => {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ 
          color: 'white',
          fontSize: '42px',
          fontWeight: '700',
          margin: '0 0 10px 0',
          letterSpacing: '-1px'
        }}>
          LiveDance
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '18px',
          margin: 0
        }}>
          Full body and hand tracking with real-time feedback
        </p>
      </div>

      {/* Status Bar */}
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

      {/* Control Buttons */}
      {isReady && (
        <div style={{
          maxWidth: '680px',
          margin: '0 auto 20px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={toggleDataPanel}
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

      {/* Video Display */}
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

        {/* Data Display Panel */}
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
            {handLandmarks.left && handLandmarks.left.length > 0 && (
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
            {handLandmarks.right && handLandmarks.right.length > 0 && (
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

            {(!handLandmarks.left || handLandmarks.left.length === 0) && 
             (!handLandmarks.right || handLandmarks.right.length === 0) && (
              <p style={{ opacity: 0.7, fontSize: '14px' }}>
                No hands detected. Hold hands in front of camera.
              </p>
            )}
          </div>
        )}

        {/* Info Panel */}
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
                <strong>Body (Pink):</strong> {bodyLandmarks.filter(lm => lm.visible).length} points tracked
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
                <strong>Hands (Teal):</strong> {(handLandmarks.left?.length || 0) + (handLandmarks.right?.length || 0)} points tracked
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
};

export default PoseDetectorView;

