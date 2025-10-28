import React, { useState } from 'react';

/**
 * YouTubeDownloader - Component for downloading YouTube videos
 * Allows users to input a YouTube URL and download videos for pose analysis
 */
const YouTubeDownloader = ({ onDownloadComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);

  const handleGetInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8000/video_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        setVideoInfo(data);
      } else {
        setError(data.error || 'Failed to fetch video information');
      }
    } catch (err) {
      setError('Failed to connect to backend. Is the server running?');
      console.error('Error fetching video info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('http://localhost:8000/download_video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          quality: '720p',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Downloaded: ${data.title}`);
        setVideoInfo(null);
        setUrl('');

        // Notify parent component
        if (onDownloadComplete) {
          onDownloadComplete(data);
        }
      } else {
        setError(data.error || 'Failed to download video');
      }
    } catch (err) {
      setError('Failed to connect to backend. Is the server running?');
      console.error('Error downloading video:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    }}>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#2d3748'
      }}>
        Download Dance Video
      </h3>

      <p style={{
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#718096'
      }}>
        Paste a video link from YouTube, Instagram, Twitter/X, or other platforms
      </p>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleDownload();
            }
          }}
          placeholder="Paste video URL (YouTube, Instagram, Twitter/X, etc.)"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={handleGetInfo}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            background: loading ? '#cbd5e0' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = '#5568d3';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = '#667eea';
          }}
        >
          {loading ? 'Loading...' : 'Get Info'}
        </button>

        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            background: loading ? '#cbd5e0' : '#38a169',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = '#2f855a';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = '#38a169';
          }}
        >
          {loading ? 'Downloading...' : 'Download'}
        </button>
      </div>

      {/* Video Info Display */}
      {videoInfo && (
        <div style={{
          padding: '16px',
          background: '#f7fafc',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            {videoInfo.title}
          </h4>
          <div style={{
            fontSize: '12px',
            color: '#718096',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 12px'
          }}>
            <span style={{ fontWeight: '500' }}>Duration:</span>
            <span>{formatDuration(videoInfo.duration)}</span>
            <span style={{ fontWeight: '500' }}>Channel:</span>
            <span>{videoInfo.uploader}</span>
            <span style={{ fontWeight: '500' }}>Views:</span>
            <span>{videoInfo.views?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#fff5f5',
          border: '1px solid #fc8181',
          borderRadius: '8px',
          color: '#c53030',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '12px',
          background: '#f0fff4',
          border: '1px solid #68d391',
          borderRadius: '8px',
          color: '#2f855a',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {success}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        padding: '12px',
        background: '#edf2f7',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#4a5568'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Supported Platforms:</p>
        <div style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          <strong>YouTube</strong>, <strong>Instagram</strong> (Reels), <strong>Twitter/X</strong>,
          <strong> Facebook</strong>, <strong>Vimeo</strong>, <strong>Reddit</strong>, and 1000+ more sites
        </div>
        <div style={{
          fontSize: '11px',
          color: '#718096',
          marginBottom: '12px',
          padding: '8px',
          background: '#fff9e6',
          borderRadius: '4px',
          border: '1px solid #ffd666'
        }}>
          <strong>Note:</strong> TikTok may be restricted. For TikTok videos, try downloading from browser
          or use a TikTok download website, then upload the file manually.
        </div>

        <p style={{ margin: '12px 0 8px 0', fontWeight: '600' }}>Quick Tips:</p>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Paste any video URL and press Enter to download</li>
          <li>Click "Get Info" to preview before downloading</li>
          <li>Videos save in 720p for optimal performance</li>
          <li>Works great with dance tutorials and performances!</li>
        </ul>
      </div>
    </div>
  );
};

export default YouTubeDownloader;
