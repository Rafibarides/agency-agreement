/**
 * React Hook for Topaz Signature Pad Integration
 * Provides unified interface for SigWeb and SDK methods
 * Supports T-LBK755-BHSB-R and other Topaz signature pads
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as sigWeb from '../utils/sigweb';
import * as topazSDK from '../utils/topazSDK';

// Connection types
export const CONNECTION_TYPE = {
  NONE: 'none',
  SIGWEB: 'sigweb',
  SDK: 'sdk',
  CANVAS: 'canvas' // Fallback to canvas drawing
};

/**
 * Hook for managing Topaz signature pad connection and capture
 */
export function useTopazSignature(options = {}) {
  const {
    autoConnect = true,
    displayMessage = 'Please sign here',
    pollInterval = 100,
    preferSigWeb = true // Prefer SigWeb over SDK
  } = options;

  // State
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPE.NONE);
  const [isConnected, setIsConnected] = useState(false);
  const [isTabletConnected, setIsTabletConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState(null);
  const [tabletModel, setTabletModel] = useState(null);

  // Refs for cleanup
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Check for SigWeb availability
  const checkSigWeb = useCallback(async () => {
    try {
      const result = await sigWeb.checkSigWebAvailability();
      if (result.available) {
        const model = await sigWeb.getTabletModelNumber();
        return { 
          available: true, 
          tabletConnected: result.tabletConnected,
          model 
        };
      }
    } catch {
      // SigWeb not available
    }
    return { available: false, tabletConnected: false, model: null };
  }, []);

  // Check for SDK availability
  const checkSDK = useCallback(async () => {
    try {
      const result = await topazSDK.checkSDKAvailability();
      if (result.available) {
        const state = await topazSDK.getTabletState();
        return { 
          available: true, 
          type: result.type,
          tabletConnected: state === 1 
        };
      }
    } catch {
      // SDK not available
    }
    return { available: false, type: null, tabletConnected: false };
  }, []);

  // Initialize connection
  const connect = useCallback(async () => {
    setError(null);
    
    // Check SigWeb first if preferred
    if (preferSigWeb) {
      const sigWebResult = await checkSigWeb();
      if (sigWebResult.available) {
        if (isMountedRef.current) {
          setConnectionType(CONNECTION_TYPE.SIGWEB);
          setIsConnected(true);
          setIsTabletConnected(sigWebResult.tabletConnected);
          setTabletModel(sigWebResult.model);
        }
        return { success: true, type: CONNECTION_TYPE.SIGWEB };
      }
    }

    // Check SDK
    const sdkResult = await checkSDK();
    if (sdkResult.available) {
      if (isMountedRef.current) {
        setConnectionType(CONNECTION_TYPE.SDK);
        setIsConnected(true);
        setIsTabletConnected(sdkResult.tabletConnected);
      }
      return { success: true, type: CONNECTION_TYPE.SDK };
    }

    // If SigWeb not preferred, check it now
    if (!preferSigWeb) {
      const sigWebResult = await checkSigWeb();
      if (sigWebResult.available) {
        if (isMountedRef.current) {
          setConnectionType(CONNECTION_TYPE.SIGWEB);
          setIsConnected(true);
          setIsTabletConnected(sigWebResult.tabletConnected);
          setTabletModel(sigWebResult.model);
        }
        return { success: true, type: CONNECTION_TYPE.SIGWEB };
      }
    }

    // No hardware available, fall back to canvas
    if (isMountedRef.current) {
      setConnectionType(CONNECTION_TYPE.CANVAS);
      setIsConnected(false);
      setIsTabletConnected(false);
    }
    return { success: false, type: CONNECTION_TYPE.CANVAS };
  }, [preferSigWeb, checkSigWeb, checkSDK]);

  // Start signature capture
  const startCapture = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to signature pad');
      return false;
    }

    try {
      setError(null);
      setPointCount(0);

      if (connectionType === CONNECTION_TYPE.SIGWEB) {
        await sigWeb.startSignatureCapture(displayMessage);
      } else if (connectionType === CONNECTION_TYPE.SDK) {
        await topazSDK.startCapture(displayMessage);
      }

      setIsCapturing(true);

      // Start polling for signature points
      pollTimerRef.current = setInterval(async () => {
        try {
          let count = 0;
          if (connectionType === CONNECTION_TYPE.SIGWEB) {
            count = await sigWeb.getSignaturePointCount();
          } else if (connectionType === CONNECTION_TYPE.SDK) {
            count = await topazSDK.getNumberOfPoints();
          }
          if (isMountedRef.current) {
            setPointCount(count);
          }
        } catch {
          // Ignore polling errors
        }
      }, pollInterval);

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [isConnected, connectionType, displayMessage, pollInterval]);

  // Stop capture and get result (SVG path only)
  const stopCapture = useCallback(async (targetWidth = 400, targetHeight = 120) => {
    // Stop polling
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!isCapturing) {
      return { hasSignature: false, svgPath: '' };
    }

    try {
      let result;
      if (connectionType === CONNECTION_TYPE.SIGWEB) {
        result = await sigWeb.stopSignatureCapture(targetWidth, targetHeight);
      } else if (connectionType === CONNECTION_TYPE.SDK) {
        result = await topazSDK.stopCapture(targetWidth, targetHeight);
      } else {
        result = { hasSignature: false, svgPath: '' };
      }

      if (isMountedRef.current) {
        setIsCapturing(false);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { hasSignature: false, svgPath: '' };
    }
  }, [isCapturing, connectionType]);

  // Clear signature
  const clearSignature = useCallback(async () => {
    try {
      setError(null);
      setPointCount(0);

      if (connectionType === CONNECTION_TYPE.SIGWEB) {
        await sigWeb.clearSignature();
      } else if (connectionType === CONNECTION_TYPE.SDK) {
        await topazSDK.clearTablet();
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [connectionType]);

  // Get signature as SVG path (only storage format supported)
  const getSignatureSVG = useCallback(async (targetWidth = 400, targetHeight = 120) => {
    try {
      if (connectionType === CONNECTION_TYPE.SIGWEB) {
        return await sigWeb.getSignatureAsSVGPath(targetWidth, targetHeight);
      } else if (connectionType === CONNECTION_TYPE.SDK) {
        return await topazSDK.getSignatureAsSVGPath(targetWidth, targetHeight);
      }
      return '';
    } catch {
      return '';
    }
  }, [connectionType]);

  // Check tablet state
  const refreshTabletState = useCallback(async () => {
    try {
      let state = 0;
      if (connectionType === CONNECTION_TYPE.SIGWEB) {
        state = await sigWeb.getTabletState();
      } else if (connectionType === CONNECTION_TYPE.SDK) {
        state = await topazSDK.getTabletState();
      }
      const connected = state === 1;
      if (isMountedRef.current) {
        setIsTabletConnected(connected);
      }
      return connected;
    } catch {
      if (isMountedRef.current) {
        setIsTabletConnected(false);
      }
      return false;
    }
  }, [connectionType]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [autoConnect, connect]);

  // Periodically check tablet state
  useEffect(() => {
    if (!isConnected) return;

    const checkInterval = setInterval(() => {
      refreshTabletState();
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [isConnected, refreshTabletState]);

  return {
    // State
    connectionType,
    isConnected,
    isTabletConnected,
    isCapturing,
    pointCount,
    hasPoints: pointCount > 0,
    error,
    tabletModel,
    
    // Methods
    connect,
    startCapture,
    stopCapture,
    clearSignature,
    getSignatureSVG,
    refreshTabletState
  };
}

export default useTopazSignature;
