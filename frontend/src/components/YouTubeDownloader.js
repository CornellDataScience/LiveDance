import React, { useState, useRef } from 'react';
import {
  MAIN_BLUE,
  GREEN_PRIMARY,
  GRAY_DARK,
  GRAY_LIGHT,
  GREEN_BG_LIGHT,
  GREEN_TEXT_DARK,
  RED_BG_LIGHT,
  RED_BORDER,
  RED_TEXT_DARK,
  HOVER_BRIGHTNESS
} from '../styles/colors';

/**
 * YouTubeDownloader - Component for downloading YouTube videos
 * Allows users to input a YouTube URL and download videos for pose analysis
 */
const YouTubeDownloader = ({ onDownloadComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('http://localhost:8000/upload_video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Uploaded: ${data.filename}`);
        
        // Notify parent component
        if (onDownloadComplete) {
          onDownloadComplete(data);
        }
      } else {
        setError(data.error || 'Failed to upload video');
      }
    } catch (err) {
      setError('Failed to connect to backend. Is the server running?');
      console.error('Error uploading video:', err);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        color: GRAY_DARK
      }}>
        Download Dance Video
      </h3>

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
          placeholder="Paste video URL (YouTube, TikTok, Instagram, etc.)"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: `2px solid ${GRAY_LIGHT}`,
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = MAIN_BLUE}
          onBlur={(e) => e.target.style.borderColor = GRAY_LIGHT}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            background: loading ? GRAY_LIGHT : MAIN_BLUE,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = `brightness(${HOVER_BRIGHTNESS})`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          {loading ? 'Processing...' : 'Download'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            background: loading ? GRAY_LIGHT : GREEN_PRIMARY,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = `brightness(${HOVER_BRIGHTNESS})`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          Upload
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: RED_BG_LIGHT,
          border: `1px solid ${RED_BORDER}`,
          borderRadius: '8px',
          color: RED_TEXT_DARK,
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: GREEN_BG_LIGHT,
          border: `1px solid ${GREEN_PRIMARY}`,
          borderRadius: '8px',
          color: GREEN_TEXT_DARK,
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      {/* Instructions - commented out
      <div style={{
        padding: '12px',
        background: GRAY_BG,
        borderRadius: '8px',
        fontSize: '12px',
        color: GRAY_MEDIUM_DARK
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Supported Platforms:</p>
        <div style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          <strong>YouTube</strong> (including <strong>Shorts</strong>), <strong>TikTok</strong>*, <strong>Instagram</strong> (Reels), <strong>Twitter/X</strong>,
          <strong> Facebook</strong>, <strong>Vimeo</strong>, <strong>Reddit</strong>, and 1000+ more sites
        </div>
        <div style={{
          fontSize: '11px',
          color: GRAY_MEDIUM,
          marginBottom: '12px',
          padding: '8px',
          background: YELLOW_BG_LIGHT,
          borderRadius: '4px',
          border: `1px solid ${YELLOW_BORDER}`
        }}>
          <strong>TikTok Note:</strong> Some TikTok content may be restricted due to platform limitations.
          If download fails, try using a dedicated TikTok downloader or download from your browser.
        </div>

        <p style={{ margin: '12px 0 8px 0', fontWeight: '600' }}>Quick Tips:</p>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Paste any video URL and press Enter to download</li>
          <li>Click "Get Info" to preview before downloading</li>
          <li>Videos save in 720p for optimal performance</li>
          <li>Works great with dance tutorials and performances!</li>
        </ul>
      </div>
      */}
    </div>
  );
};

export default YouTubeDownloader;
