/**
 * QR Code Scanner Component
 * Uses device camera to scan QR codes
 */

import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

interface QrScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

export default function QrScanner({ onScan, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasScanned, setHasScanned] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Assign stream to video element when both are ready
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;

    console.log('Stream assigned to video element:', {
      streamId: stream.id,
      videoElement: !!video,
    });

    // Start QR code scanning once video is playing
    const codeReader = new BrowserQRCodeReader();
    codeReaderRef.current = codeReader;

    let scanningActive = true;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        console.log('Video playing, starting QR detection');

        // Start continuous QR code detection
        const scanFrame = () => {
          if (!videoRef.current || hasScanned || !scanningActive) return;

          codeReader.decodeOnceFromVideoElement(videoRef.current)
            .then((result) => {
              if (result && !hasScanned && scanningActive) {
                console.log('QR Code scanned:', result.getText());
                setHasScanned(true);
                scanningActive = false;

                // Stop camera immediately after successful scan
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => {
                    track.stop();
                    console.log('Track stopped after scan:', track.kind);
                  });
                }

                onScan(result.getText());
              } else if (scanningActive && !hasScanned) {
                // Continue scanning if no result or already scanned
                setTimeout(scanFrame, 100);
              }
            })
            .catch((err) => {
              // Continue scanning on error (usually means no QR code in view)
              if (err.name !== 'NotFoundException' && !hasScanned && scanningActive) {
                console.error('Decode error:', err);
              }
              if (scanningActive && !hasScanned) {
                setTimeout(scanFrame, 100);
              }
            });
        };

        scanFrame();
      }).catch((err) => {
        console.error('Video play error:', err);
      });
    };

    setIsLoading(false);

    // Cleanup function for this effect
    return () => {
      scanningActive = false;
    };
  }, [stream, onScan, hasScanned]);

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Request camera permission and stream
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

        console.log('Camera stream obtained:', {
          streamId: stream.id,
          tracks: stream.getTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active,
        });

        // Store stream in state - will be assigned to video in useEffect
        setStream(stream);
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;

        console.error('Camera access error:', err);

        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access to scan QR codes.');
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
      setStream(null);
    };
  }, [facingMode]);

  const stopCamera = () => {
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    setStream(null);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setHasScanned(false);
  };

  const handleClose = () => {
    stopCamera();
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
          <h2 style={{ margin: 0, color: 'white' }}>Scan QR Code</h2>
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
          {/* Always render video element so ref is available */}
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: isLoading || error ? 'none' : 'block',
            }}
          />

          {isLoading && (
            <div style={{ color: 'white', fontSize: '18px', position: 'absolute' }}>
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
            <div style={{ color: '#dc3545', fontSize: '16px', textAlign: 'center', padding: '20px', position: 'absolute' }}>
              <div style={{ marginBottom: '10px' }}>⚠️</div>
              {error}
            </div>
          )}

          {!error && !isLoading && (
            <>

              {/* Framing guide */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '300px',
                  height: '300px',
                  border: '3px solid rgba(0, 255, 0, 0.6)',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
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
                  Position QR code within this frame
                </div>

                {/* Corner markers */}
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  left: '-3px',
                  width: '30px',
                  height: '30px',
                  borderTop: '5px solid #00ff00',
                  borderLeft: '5px solid #00ff00',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '30px',
                  height: '30px',
                  borderTop: '5px solid #00ff00',
                  borderRight: '5px solid #00ff00',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-3px',
                  left: '-3px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '5px solid #00ff00',
                  borderLeft: '5px solid #00ff00',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '5px solid #00ff00',
                  borderRight: '5px solid #00ff00',
                }} />
              </div>
            </>
          )}
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '14px', color: '#ccc', textAlign: 'center' }}>
          {isLoading
            ? 'Starting camera...'
            : hasScanned
            ? 'QR code detected! Processing...'
            : 'Position the QR code within the frame to scan automatically'}
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
              disabled={hasScanned}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: hasScanned ? 'not-allowed' : 'pointer',
                opacity: hasScanned ? 0.6 : 1,
              }}
            >
              Flip Camera
            </button>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
