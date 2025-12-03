import React from 'react';
import ReferenceVideoPlayer from '../components/ReferenceVideoPlayer';
import { headerButtonStyle, getHeaderButtonBackground } from '../styles/buttonStyles';

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
  pose3DAngles,
  pose3DCoords,
  performanceMetrics,
  showData,
  exportLandmarkData,
  toggleDataPanel,
  referenceVideo,
  handleReferenceVideoSelect,
  gestureProgress,
  videoPlaying,
  setVideoPlaying,
  videoPlayerControlRef,
  gestureControlEnabled,
  toggleGestureControl,
  toggle2D3D,
  cameraEnabled,
  toggleCamera,
  showPerformanceMonitor,
  togglePerformanceMonitor,
  topImprovements,
  overallScore,
  finalImprovements,
  finalScore,
  liveFeedback,
  handleReferencePose
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
          Full body tracking with real-time feedback
        </p>
      </div>

      {/* Live Feedback Banner */}
      {isReady && liveFeedback && (liveFeedback.timing || (liveFeedback.cues && liveFeedback.cues.length > 0)) && (
        <div style={{
          maxWidth: '900px',
          margin: '0 auto 20px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span role="img" aria-label="sparkles">✨</span>
              Live Dance Coach
            </div>
            {liveFeedback.matchScore && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.12)',
                fontWeight: '600',
                fontSize: '13px'
              }}>
                Match Score: {liveFeedback.matchScore}%
              </div>
            )}
          </div>
          {liveFeedback.timing && (
            <div style={{
              marginBottom: liveFeedback.cues && liveFeedback.cues.length > 0 ? '12px' : '0',
              padding: '10px 12px',
              borderRadius: '10px',
              background: liveFeedback.timing.status === 'late'
                ? 'rgba(245, 101, 101, 0.25)'
                : liveFeedback.timing.status === 'early'
                  ? 'rgba(237, 137, 54, 0.25)'
                  : 'rgba(72, 187, 120, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontWeight: '600'
            }}>
              {liveFeedback.timing.message}
            </div>
          )}
          {liveFeedback.cues && liveFeedback.cues.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {liveFeedback.cues.map((cue) => (
                <div key={cue.joint} style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  minWidth: '180px'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                    {cue.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {cue.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Performance Monitor */}
      {isReady && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          zIndex: 1000,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Header */}
          <div 
            onClick={togglePerformanceMonitor}
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: 'rgba(0, 0, 0, 0.15)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)';
            }}
          >
            <div style={{ 
              fontWeight: '600', 
              fontSize: '14px', 
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}>
              Performance
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '16px',
              transition: 'transform 0.3s ease',
              transform: showPerformanceMonitor ? 'rotate(180deg)' : 'rotate(0deg)',
              marginLeft: '16px'
            }}>
              ▼
            </div>
          </div>

          {/* Content */}
          {showPerformanceMonitor && (
            <div style={{
              padding: '16px',
              color: 'white',
              fontSize: '13px',
              minWidth: '280px'
            }}>
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Mode:</span>
                  <span style={{ color: '#ffd700', fontWeight: '600' }}>{performanceMetrics.mode || '3D'}</span>
                </div>
              </div>
              
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>FPS:</span>
                  <span style={{ color: '#40E0D0', fontWeight: '600' }}>{performanceMetrics.fps}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Total Latency:</span>
                  <span style={{ color: '#ff6b9d', fontWeight: '600' }}>{performanceMetrics.totalLatency}ms</span>
                </div>
              </div>
              
              <div style={{ fontSize: '12px', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>
                Frontend:
              </div>
              <div style={{ paddingLeft: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Image Capture:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.frontendTime}ms</span>
                </div>
              </div>
              
              <div style={{ fontSize: '12px', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>
                Network:
              </div>
              <div style={{ paddingLeft: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>WebSocket:</span>
                  <span style={{ color: '#c77dff' }}>{performanceMetrics.networkLatency}ms</span>
                </div>
              </div>
              
              <div style={{ fontSize: '12px', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>
                Backend ({performanceMetrics.backendTime}ms):
              </div>
              <div style={{ paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Decode:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.decode}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Downscale:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.downscale}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Pose:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.pose}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• 3D Angles:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.angles3d}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Hands:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.hands}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Smoothing:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.smoothing}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      {isReady && (
        <div style={{
          maxWidth: '720px',
          margin: '0 auto 30px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={toggleDataPanel}
            style={{
              padding: '14px 28px',
              background: showData ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showData ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            {showData ? 'Hide Data' : 'Show Data'}
          </button>
          <button
            onClick={exportLandmarkData}
            style={{
              padding: '14px 28px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            Export Data
          </button>
          <button
            onClick={toggle2D3D}
            style={{
              padding: '14px 28px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            Toggle 2D/3D
          </button>
          {referenceVideo && (
            <button
              onClick={toggleGestureControl}
              style={{
                padding: '14px 28px',
                background: gestureControlEnabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = gestureControlEnabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            >
              {gestureControlEnabled ? 'Gesture: ON' : 'Gesture: OFF'}
            </button>
          )}
        </div>
      )}

      {/* Video Display - Side by Side Layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Reference Video Player */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <ReferenceVideoPlayer
            onVideoSelect={handleReferenceVideoSelect}
            videoPlayerControlRef={videoPlayerControlRef}
            setVideoPlaying={setVideoPlaying}
            onReferencePose={handleReferencePose}
          />
        </div>

        {/* Camera Feed & Skeleton */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              margin: 0,
              color: 'white',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Your Camera
            </h3>
            <button
              onClick={toggleCamera}
              style={{
                ...headerButtonStyle,
                background: getHeaderButtonBackground(cameraEnabled)
              }}
            >
              {cameraEnabled ? 'Camera: On' : 'Camera: Off'}
            </button>
          </div>

          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            {cameraEnabled ? (
              <>
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
              </>
            ) : (
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '75%', // 4:3 aspect ratio (480/640 = 0.75)
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    opacity: 0.5
                  }}>
                    📷
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Camera Off
                  </div>
                  <div style={{
                    fontSize: '14px',
                    marginTop: '8px',
                    opacity: 0.8
                  }}>
                    Click "Camera: Off" to turn on
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Improvements Panel */}
      {isReady && topImprovements && topImprovements.length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Areas to Improve
              </h3>
              {overallScore !== null && (
                <div style={{
                  background: overallScore >= 80 ? 'rgba(72, 187, 120, 0.3)' :
                             overallScore >= 60 ? 'rgba(237, 137, 54, 0.3)' :
                             'rgba(245, 101, 101, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  Overall Score: {overallScore}%
                </div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '12px'
            }}>
              {topImprovements.map((item, idx) => (
                <div key={item.joint} style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      #{idx + 1} {item.name}
                    </span>
                    <span style={{
                      color: item.score >= 80 ? '#48bb78' :
                             item.score >= 60 ? '#ed8936' :
                             '#f56565',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {item.score}%
                    </span>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    height: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${item.score}%`,
                      height: '100%',
                      background: item.score >= 80 ? '#48bb78' :
                                  item.score >= 60 ? '#ed8936' :
                                  '#f56565',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontStyle: 'italic'
                  }}>
                    {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Session Summary (end-of-video) */}
      {!videoPlaying && finalImprovements && finalImprovements.length > 0 && (
        <div style={{
          maxWidth: '900px',
          margin: '20px auto 0'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '18px',
                fontWeight: '700'
              }}>
                Session Feedback: Top 5 Areas to Improve
              </h3>
              {finalScore !== null && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Overall: {finalScore}%
                </div>
              )}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {finalImprovements.slice(0, 5).map((item, idx) => (
                <div key={item.joint} style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                      #{idx + 1} {item.name}
                    </span>
                    <span style={{
                      color: item.score >= 80 ? '#48bb78' :
                             item.score >= 60 ? '#ed8936' :
                             '#f56565',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}>
                      {item.score}%
                    </span>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '4px',
                    height: '6px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: `${item.score}%`,
                      height: '100%',
                      background: item.score >= 80 ? '#48bb78' :
                                  item.score >= 60 ? '#ed8936' :
                                  '#f56565'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Display Panel (below videos) */}
      {isReady && (
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
        {/* Gesture Progress Indicator */}
        {isReady && gestureProgress > 0 && referenceVideo && gestureControlEnabled && (
          <div style={{
            marginBottom: '24px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '16px',
              textAlign: 'center',
              color: 'white'
            }}>
              {videoPlaying
                ? `Hold raised fist to pause... ${Math.ceil((1 - gestureProgress) * 3)}s`
                : `Hold raised palm to start... ${Math.ceil((1 - gestureProgress) * 3)}s`
              }
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${gestureProgress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
                transition: 'width 0.1s ease',
                borderRadius: '8px'
              }}></div>
            </div>
            <div style={{
              fontSize: '13px',
              marginTop: '12px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Keep your hand raised and still
            </div>
          </div>
        )}

        {showData && (
          <div style={{
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            color: 'white',
            maxHeight: '500px',
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

            {/* 3D Pose Angles */}
            {Object.keys(pose3DAngles).length > 0 && (
              <>
                <h3 style={{ margin: '20px 0 15px 0', color: '#ffd700' }}>
                  3D Joint Angles
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '12px',
                  fontSize: '13px',
                  marginBottom: '20px'
                }}>
                  {Object.entries(pose3DAngles).map(([joint, angle]) => (
                    <div key={joint} style={{
                      padding: '12px',
                      background: 'rgba(255, 215, 0, 0.2)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 215, 0, 0.3)'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '6px',
                        textTransform: 'capitalize',
                        color: '#ffd700'
                      }}>
                        {joint.replace('_', ' ')}
                      </div>
                      <div style={{ 
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        {angle}°
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 3D Joint Coordinates */}
            {Object.keys(pose3DCoords).length > 0 && (
              <>
                <h3 style={{ margin: '20px 0 15px 0', color: '#ff6b9d' }}>
                  3D Joint Coordinates
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                  fontSize: '12px',
                  marginBottom: '20px'
                }}>
                  {Object.entries(pose3DCoords).map(([joint, coords]) => (
                    <div key={joint} style={{
                      padding: '10px',
                      background: 'rgba(255, 107, 157, 0.2)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 107, 157, 0.3)'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '4px',
                        textTransform: 'capitalize',
                        color: '#ff6b9d'
                      }}>
                        {joint.replace('_', ' ')}
                      </div>
                      <div style={{ color: 'white' }}>X: {coords.x}</div>
                      <div style={{ color: 'white' }}>Y: {coords.y}</div>
                      <div style={{ color: 'white' }}>Z: {coords.z}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Info Panel */}
        {!showData && (
          <div style={{
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
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
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  background: '#ffd700',
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                <strong>3D Angles (Gold):</strong> {Object.keys(pose3DAngles).length} joints tracked
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
              <li><strong>Gesture Control:</strong> Raise your hand <strong>high and hold still</strong> for 3 seconds</li>
              <li style={{ paddingLeft: '20px', listStyle: 'circle' }}><strong>Open palm</strong> (fingers extended) → <strong>Play</strong> video</li>
              <li style={{ paddingLeft: '20px', listStyle: 'circle' }}><strong>Closed fist</strong> (fingers curled) → <strong>Pause</strong> video</li>
              <li><strong>Toggle "Gesture: Off"</strong> when dancing to avoid accidental triggers</li>
              <li>Click "Show Data" to see real-time position coordinates</li>
              <li>Click "Export Data" to download current positions as JSON</li>
              <li>Stand 3-5 feet back for best full-body tracking</li>
            </ul>
          </div>
        )}
          </div>
        </div>
      )}

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
