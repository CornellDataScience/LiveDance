import React from 'react';
import ReferenceVideoPlayer from '../components/ReferenceVideoPlayer';
import { headerButtonStyle, getHeaderButtonBackground } from '../styles/buttonStyles';
import {
  BACK_PANE_OPACITY,
  LAYERED_PANE_OPACITY,
  MAIN_BLUE,
  MAIN_PURPLE,
  BLUE_PRIMARY,
  BLUE_PRIMARY_HOVER,
  GREEN_PRIMARY,
  GREEN_PRIMARY_HOVER,
  GREEN_GOOD,
  ORANGE_PRIMARY,
  RED_PRIMARY,
  PINK_PRIMARY,
  GOLD_PRIMARY,
  GRAY_MEDIUM
} from '../styles/colors';

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
  handleReferencePose,
  // Reference PEPS
  referencePeps,
  handleReferencePeps,
  // Game session props
  gameSessionActive,
  showGameSummary,
  countdown,
  currentClassification,
  floatingText,
  gameStatsRef,
  gameResults,
  startGameSession,
  exitGameSession,
  resetGameSession,
  closeGameSummary,
  exportGameData,
  handleVideoEnded
}) => {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${MAIN_BLUE} 0%, ${MAIN_PURPLE} 100%)`,
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
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ 
              fontWeight: '600', 
              fontSize: '18px', 
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
              minWidth: '240px'
            }}>
              <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '14px', color: 'white', marginBottom: '10px', fontWeight: '600' }}>
                  Pose Estimations Per Second
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span style={{ color: 'white' }}>Camera</span>
                  <span style={{ color: 'white' }}>{performanceMetrics.fps} PEPS</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'white' }}>Reference</span>
                  <span style={{ color: 'white' }}>{referencePeps} PEPS</span>
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: 'white', marginBottom: '10px', fontWeight: '600' }}>
                Latency
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: 'white' }}>Frontend</span>
                <span style={{ color: 'white' }}>{performanceMetrics.frontendTime} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: 'white' }}>Network</span>
                <span style={{ color: 'white' }}>{performanceMetrics.networkLatency} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: 'white' }}>Backend</span>
                <span style={{ color: 'white' }}>{performanceMetrics.backendTime} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'white' }}>Total</span>
                <span style={{ color: 'white' }}>{performanceMetrics.totalLatency} ms</span>
              </div>
              {/* Backend breakdown - commented out for cleaner UI
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>• Smoothing:</span>
                  <span style={{ color: '#a0d8f1' }}>{performanceMetrics.backendBreakdown.smoothing}ms</span>
                </div>
              </div>
              */}
            </div>
          )}
        </div>
      )}

      {/* Game Session Start Button */}
      {isReady && !gameSessionActive && !showGameSummary && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <button
            onClick={startGameSession}
            style={{
              padding: '14px 28px',
              fontSize: '18px',
              fontWeight: '600',
              background: GREEN_PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = GREEN_PRIMARY_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GREEN_PRIMARY;
            }}
          >
            Start Game Session
          </button>
        </div>
      )}

      {/* Control Buttons */}
      {isReady && !gameSessionActive && !showGameSummary && (
        <div style={{
          maxWidth: '720px',
          margin: '0 auto 30px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Show Data button - commented out
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
          */}
          {/* Export Data button - commented out
          <button
            onClick={exportLandmarkData}
            style={{
              padding: '14px 28px',
              background: 'rgba(255, 255, 255, 0.15)',
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
          */}
          {/* Toggle 2D/3D button - commented out
          <button
            onClick={toggle2D3D}
            style={{
              padding: '14px 28px',
              background: 'rgba(255, 255, 255, 0.15)',
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
          */}
          {/* Gesture Control button - commented out (hand tracking disabled)
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
          */}
        </div>
      )}

      {/* Game Mode Full-Screen Layout */}
      {(gameSessionActive || showGameSummary) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#000',
          zIndex: 2000
        }}>
          {/* Exit and Reset Buttons */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '12px',
            zIndex: 2002
          }}>
            <button
              onClick={exitGameSession}
              style={{
                padding: '12px 24px',
                background: 'rgba(229, 62, 62, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Exit
            </button>
            <button
              onClick={resetGameSession}
              style={{
                padding: '12px 24px',
                background: 'rgba(237, 137, 54, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Reset
            </button>
          </div>

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2003
            }}>
              <div style={{
                fontSize: '120px',
                fontWeight: '700',
                color: 'white',
                animation: 'pulse 1s ease-in-out'
              }}>
                {countdown}
              </div>
            </div>
          )}

          {/* Video Layout: 65% reference, 35% camera */}
          <div style={{
            display: 'flex',
            width: '100%',
            height: '100%'
          }}>
            {/* Reference Video - 65% */}
            <div style={{
              width: '65%',
              height: '100%',
              position: 'relative'
            }}>
              <ReferenceVideoPlayer
                onVideoSelect={handleReferenceVideoSelect}
                videoPlayerControlRef={videoPlayerControlRef}
                setVideoPlaying={setVideoPlaying}
                onReferencePose={handleReferencePose}
                onReferencePeps={handleReferencePeps}
                gameMode={true}
                onVideoEnded={handleVideoEnded}
                referenceVideo={referenceVideo}
              />
            </div>

            {/* Camera Feed - 35% */}
            <div style={{
              width: '35%',
              height: '100%',
              position: 'relative',
              background: '#000'
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
                      height: '100%',
                      objectFit: 'cover'
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
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Floating Classification Text */}
                  {floatingText && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '48px',
                      fontWeight: '700',
                      color: currentClassification === 'great' ? GREEN_PRIMARY :
                             currentClassification === 'good' ? GREEN_GOOD :
                             currentClassification === 'mid' ? ORANGE_PRIMARY : RED_PRIMARY,
                      textShadow: '0 4px 8px rgba(0, 0, 0, 0.8)',
                      animation: 'fadeInOut 1s ease-in-out',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      {floatingText.text}
                    </div>
                  )}

                  {/* Current Combo Display */}
                  {gameSessionActive && gameStatsRef.current.combo > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      left: '20px',
                      fontSize: '32px',
                      fontWeight: '700',
                      color: GOLD_PRIMARY,
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      pointerEvents: 'none'
                    }}>
                      Combo: {gameStatsRef.current.combo}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '16px'
                }}>
                  Camera Off
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Display - Side by Side Layout */}
      {!gameSessionActive && !showGameSummary && (
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
          background: `rgba(255, 255, 255, ${BACK_PANE_OPACITY})`,
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
            onReferencePeps={handleReferencePeps}
            onVideoEnded={handleVideoEnded}
            referenceVideo={referenceVideo}
          />
        </div>

        {/* Camera Feed & Skeleton */}
        <div style={{
          background: `rgba(255, 255, 255, ${BACK_PANE_OPACITY})`,
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BLUE_PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = getHeaderButtonBackground(cameraEnabled);
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
      )}

      {/* Top 10 Improvements Panel */}
      {isReady && !gameSessionActive && !showGameSummary && referenceVideo && cameraEnabled && topImprovements && topImprovements.length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0'
        }}>
          <div style={{
            background: `rgba(255, 255, 255, ${BACK_PANE_OPACITY})`,
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
                  background: overallScore >= 80 ? `${GREEN_PRIMARY}4D` :
                             overallScore >= 60 ? `${ORANGE_PRIMARY}4D` :
                             `${RED_PRIMARY}4D`,
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
              {topImprovements.slice(0, 7).map((item, idx) => (
                <div key={item.joint} style={{
                  background: `rgba(255, 255, 255, ${LAYERED_PANE_OPACITY})`,
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: idx === 0 ? '24px' : '16px',
                  border: idx === 0 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  gridColumn: idx === 0 ? 'span 2' : 'auto',
                  gridRow: idx === 0 ? 'span 2' : 'auto',
                  display: idx === 0 ? 'flex' : 'block',
                  flexDirection: idx === 0 ? 'column' : 'initial',
                  justifyContent: idx === 0 ? 'center' : 'initial',
                  alignItems: idx === 0 ? 'stretch' : 'initial'
                }}>
                  {idx === 0 ? (
                    // Centered layout for #1 biggest improvement
                    <>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          color: '#1a202c',
                          fontWeight: '700',
                          fontSize: '36px'
                        }}>
                          #{idx + 1} {item.name}
                        </div>
                        <div style={{
                          color: '#1a202c',
                          fontWeight: '600',
                          fontSize: '28px'
                        }}>
                          {item.score}%
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '4px',
                        height: '10px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: `${item.score}%`,
                          height: '100%',
                          background: item.score >= 80 ? GREEN_PRIMARY :
                                      item.score >= 60 ? ORANGE_PRIMARY :
                                      RED_PRIMARY,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{
                        fontSize: '32px',
                        color: '#2d3748',
                        fontStyle: 'italic',
                        fontWeight: '600'
                      }}>
                        {item.recommendation}
                      </div>
                    </>
                  ) : (
                    // Regular layout for other improvements
                    <>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          color: '#1a202c',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          #{idx + 1} {item.name}
                        </span>
                        <span style={{
                          color: '#1a202c',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {item.score}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '4px',
                        height: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${item.score}%`,
                          height: '100%',
                          background: item.score >= 80 ? GREEN_PRIMARY :
                                      item.score >= 60 ? ORANGE_PRIMARY :
                                      RED_PRIMARY,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#4a5568',
                        fontStyle: 'italic'
                      }}>
                        {item.recommendation}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Display Panel (below videos) */}
      {isReady && !gameSessionActive && !showGameSummary && (
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0'
        }}>
          <div style={{
            background: `rgba(255, 255, 255, ${BACK_PANE_OPACITY})`,
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
        {/* Gesture Progress Indicator - commented out (hand tracking disabled)
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
        */}

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
            background: `rgba(255, 255, 255, ${LAYERED_PANE_OPACITY})`,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            color: 'white'
          }}>
            {/* What's Being Tracked - commented out
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
                <strong>Body (PINK_PRIMARY):</strong> {bodyLandmarks.filter(lm => lm.visible).length} points tracked
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
                <strong>3D Angles (GOLD_PRIMARY):</strong> {Object.keys(pose3DAngles).length} joints tracked
              </div>
            </div>
            */}

            <h3 style={{ 
              margin: '0 0 12px 0',
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
              {/* Gesture Control tips - commented out
              <li><strong>Gesture Control:</strong> Raise your hand <strong>high and hold still</strong> for 3 seconds</li>
              <li style={{ paddingLeft: '20px', listStyle: 'circle' }}><strong>Open palm</strong> (fingers extended) → <strong>Play</strong> video</li>
              <li style={{ paddingLeft: '20px', listStyle: 'circle' }}><strong>Closed fist</strong> (fingers curled) → <strong>Pause</strong> video</li>
              <li><strong>Toggle "Gesture: Off"</strong> when dancing to avoid accidental triggers</li>
              <li>Click "Show Data" to see real-time position coordinates</li>
              <li>Click "Export Data" to download current positions as JSON</li>
              */}
              <li>Stand 3-5 feet back for best full-body tracking</li>
              <li>If a video URL is not supported, try downloading first and then upload from your computer</li>
            </ul>
          </div>
        )}
          </div>
        </div>
      )}

      {/* End-Game Summary Modal */}
      {showGameSummary && gameResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '40px'
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${MAIN_BLUE} 0%, ${MAIN_PURPLE} 100%)`,
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Grade Display */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <div style={{
                fontSize: '96px',
                fontWeight: '700',
                color: gameResults.grade === 'INCOMPLETE' ? GRAY_MEDIUM :
                       gameResults.grade === 'SS' || gameResults.grade === 'S' ? GOLD_PRIMARY :
                       gameResults.grade === 'A' ? GREEN_PRIMARY :
                       gameResults.grade === 'B' ? GREEN_GOOD :
                       gameResults.grade === 'C' ? ORANGE_PRIMARY : RED_PRIMARY,
                textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                marginBottom: '16px'
              }}>
                {gameResults.grade}
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'white'
              }}>
                Game Complete!
              </div>
              {gameResults.incomplete && (
                <div style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginTop: '8px'
                }}>
                  Session ended early - complete full video for letter grade!
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <StatCard label="Greats" value={gameResults.greatCount} color={GREEN_PRIMARY} />
              <StatCard label="Goods" value={gameResults.goodCount} color={GREEN_GOOD} />
              <StatCard label="Mids" value={gameResults.midCount} color={ORANGE_PRIMARY} />
              <StatCard label="Misses" value={gameResults.missCount} color={RED_PRIMARY} />
              <StatCard label="Max Combo" value={gameResults.maxCombo} color={GOLD_PRIMARY} />
              <StatCard label="Total" value={
                gameResults.missCount + gameResults.midCount +
                gameResults.goodCount + gameResults.greatCount
              } color={BLUE_PRIMARY} />
            </div>

            {/* Areas to Improve */}
            {topImprovements && topImprovements.length > 0 && (
              <div style={{
                marginBottom: '32px'
              }}>
                <h3 style={{
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  Areas to Improve
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {topImprovements.slice(0, 6).map((item, idx) => (
                    <div key={item.joint} style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a202c',
                        marginBottom: '4px'
                      }}>
                        #{idx + 1} {item.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#2d3748'
                      }}>
                        {item.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center'
            }}>
              <button
                onClick={exportGameData}
                style={{
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: BLUE_PRIMARY,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Export JSON
              </button>
              <button
                onClick={resetGameSession}
                style={{
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: GREEN_GOOD,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Play Again
              </button>
              <button
                onClick={closeGameSummary}
                style={{
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: RED_PRIMARY,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

// StatCard component for game summary
const StatCard = ({ label, value, color }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: `2px solid ${color}`
  }}>
    <div style={{
      fontSize: '32px',
      fontWeight: '700',
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{
      fontSize: '14px',
      color: 'white',
      fontWeight: '500'
    }}>
      {label}
    </div>
  </div>
);

export default PoseDetectorView;

