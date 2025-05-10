import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { isConvexConfigured } from '../lib/convex';

export default function ConvexDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    convexUrl: string;
    isConfigured: boolean;
    connectionTest: 'untested' | 'success' | 'failed';
    errorMessage?: string;
  }>({
    convexUrl: import.meta.env.VITE_CONVEX_URL as string || 'Not set',
    isConfigured: isConvexConfigured(),
    connectionTest: 'untested',
  });

  // Simple query to test connection
  const testQuery = useQuery(api.transcription.getTranscription);

  useEffect(() => {
    if (testQuery !== undefined) {
      setDiagnosticInfo(prev => ({ 
        ...prev, 
        connectionTest: 'success' 
      }));
    } else {
      setDiagnosticInfo(prev => ({ 
        ...prev, 
        connectionTest: 'failed',
        errorMessage: 'No response from Convex. Check your network connection and Convex URL.'
      }));
    }
  }, [testQuery]);

  const styles = {
    container: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '5px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '400px'
    } as React.CSSProperties,
    heading: {
      margin: '0 0 10px 0',
      fontSize: '14px',
      fontWeight: 'bold'
    } as React.CSSProperties,
    item: {
      margin: '5px 0'
    },
    success: {
      color: '#4ade80'
    },
    error: {
      color: '#f87171'
    },
    warning: {
      color: '#facc15'
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Convex Diagnostic</h3>
      <div style={styles.item}>
        <strong>Convex URL:</strong>{' '}
        <span style={diagnosticInfo.isConfigured ? styles.success : styles.error}>
          {diagnosticInfo.convexUrl.substring(0, 20)}...
        </span>
      </div>
      <div style={styles.item}>
        <strong>Configuration:</strong>{' '}
        <span style={diagnosticInfo.isConfigured ? styles.success : styles.error}>
          {diagnosticInfo.isConfigured ? 'Valid' : 'Missing or Invalid'}
        </span>
      </div>
      <div style={styles.item}>
        <strong>Connection Test:</strong>{' '}
        <span 
          style={
            diagnosticInfo.connectionTest === 'success' 
              ? styles.success 
              : diagnosticInfo.connectionTest === 'failed'
                ? styles.error
                : styles.warning
          }
        >
          {diagnosticInfo.connectionTest === 'untested' 
            ? 'Testing...' 
            : diagnosticInfo.connectionTest === 'success'
              ? 'Success' 
              : 'Failed'}
        </span>
      </div>
      {diagnosticInfo.errorMessage && (
        <div style={{...styles.item, ...styles.error}}>
          Error: {diagnosticInfo.errorMessage}
        </div>
      )}
    </div>
  );
} 