/**
 * Camera Capture Component
 * Provides camera access for capturing seed word images
 */

import { useState, useRef, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Request camera permission and stream
        // Try with facingMode first, fall back to basic video if that fails
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (facingModeError) {
          console.warn('Failed with facingMode, trying without:', facingModeError);
          // Fallback: try without facingMode constraint
          constraints = {
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        if (!mounted) {
          // Component unmounted, stop the stream
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;

          console.log('Stream assigned to video element:', {
            streamId: stream.id,
            tracks: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            active: stream.active,
          });

          // Ensure video plays - important for some browsers
          try {
            await video.play();
            console.log('Video playing successfully');
          } catch (playError) {
            console.error('Video play error:', playError);
            // Try again after a short delay
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  await videoRef.current.play();
                  console.log('Video playing after retry');
                } catch (retryError) {
                  console.error('Video play retry failed:', retryError);
                }
              }
            }, 100);
          }
        }

        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;

        console.error('Camera access error:', err);

        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access to use this feature.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError('No camera found on this device.');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setError('Camera is already in use by another application.');
          } else {
            setError(`Camera error: ${err.message}`);
          }
        } else {
          setError('Failed to access camera. Please check your browser permissions.');
        }

        setIsLoading(false);
      }
    };

    void initCamera();

    // Cleanup function
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Handle countdown
  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        // Countdown finished, capture image
        captureImage();
        setCountdown(null);
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/png');

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Pass image to parent
    onCapture(imageDataUrl);
  };

  const handleStartCountdown = () => {
    setCountdown(3);
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleClose = () => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onCancel();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '20px',
          width: '90%',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: 'white' }}>Camera Capture</h2>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {/* Video preview or error */}
        <div
          style={{
            flex: 1,
            border: '2px solid #dee2e6',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading && (
            <div style={{ color: 'white', fontSize: '18px' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '32px',
                  border: '3px solid white',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '10px',
                }}
              />
              Initializing camera...
            </div>
          )}

          {error && (
            <div style={{ color: '#dc3545', fontSize: '16px', textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: '10px' }}>⚠️</div>
              {error}
            </div>
          )}

          {!error && !isLoading && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  // Ensure video plays when metadata is loaded
                  const video = e.currentTarget;
                  video.play().catch((err) => {
                    console.error('Auto-play failed:', err);
                  });
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />

              {/* Countdown overlay */}
              {countdown !== null && countdown > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '120px',
                      fontWeight: 'bold',
                      color: 'white',
                      animation: 'pulse 1s ease-in-out',
                    }}
                  >
                    {countdown}
                  </div>
                </div>
              )}

              {/* Framing guide */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  maxWidth: '600px',
                  aspectRatio: '4/3',
                  border: '3px dashed rgba(255, 255, 255, 0.6)',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '5px 15px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Position seed words within this frame
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '14px', color: '#ccc', textAlign: 'center' }}>
          {countdown === null
            ? 'Position your device to frame the seed words, then tap "Start Capture"'
            : 'Hold steady...'}
        </div>

        {/* Control buttons */}
        {!error && !isLoading && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <button
              onClick={handleFlipCamera}
              disabled={countdown !== null}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: countdown !== null ? 'not-allowed' : 'pointer',
                opacity: countdown !== null ? 0.6 : 1,
              }}
            >
              Flip Camera
            </button>

            {countdown === null ? (
              <button
                onClick={handleStartCountdown}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                Start Capture (3s)
              </button>
            ) : (
              <button
                onClick={handleCancelCountdown}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                Cancel Countdown
              </button>
            )}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
        `}
      </style>
    </div>
  );
}
