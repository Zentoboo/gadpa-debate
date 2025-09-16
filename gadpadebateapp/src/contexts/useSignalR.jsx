import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '../config/api.js';

export default function useSignalR() {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [fireEvents, setFireEvents] = useState([]);
  const connectionRef = useRef(null);

  useEffect(() => {
    // Create SignalR connection
    const newConnection = new HubConnectionBuilder()
      .withUrl(API_CONFIG.SIGNALR_HUB)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connectionRef.current = newConnection;

    // Start connection
    const startConnection = async () => {
      try {
        await newConnection.start();
        console.log('SignalR Connected');
        setConnection(newConnection);
        setIsConnected(true);

        // Set up event listeners
        setupEventListeners(newConnection);
      } catch (error) {
        console.error('SignalR Connection Error: ', error);
        setTimeout(startConnection, 5000); // Retry after 5 seconds
      }
    };

    startConnection();

    // Cleanup on unmount
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  const setupEventListeners = (connection) => {
    // Fire reaction events (matches backend FireReaction event)
    connection.on('FireReaction', (fireData) => {
      setFireEvents(prev => [...prev, {
        id: Date.now() + Math.random(),
        ...fireData
      }].slice(-50)); // Keep only last 50 events
      
      // Dispatch custom event for animations
      const event = new CustomEvent('externalFireReaction', { detail: fireData });
      window.dispatchEvent(event);
    });

    // Round control events
    connection.on('RoundStarted', (roundData) => {
      const event = new CustomEvent('roundStarted', { detail: roundData });
      window.dispatchEvent(event);
    });

    connection.on('RoundStopped', (roundData) => {
      const event = new CustomEvent('roundStopped', { detail: roundData });
      window.dispatchEvent(event);
    });

    // Question navigation events
    connection.on('NextQuestion', (questionData) => {
      const event = new CustomEvent('nextQuestion', { detail: questionData });
      window.dispatchEvent(event);
    });

    connection.on('PreviousQuestion', (questionData) => {
      const event = new CustomEvent('previousQuestion', { detail: questionData });
      window.dispatchEvent(event);
    });

    // Question broadcasting
    connection.on('QuestionBroadcast', (questionData) => {
      const event = new CustomEvent('questionBroadcast', { detail: questionData });
      window.dispatchEvent(event);
    });

    // Timer updates (every second from backend)
    connection.on('TimerUpdate', (timerData) => {
      const event = new CustomEvent('timerUpdate', { detail: timerData });
      window.dispatchEvent(event);
    });

    // Automatic debate start
    connection.on('DebateStarted', (debateData) => {
      const event = new CustomEvent('debateStarted', { detail: debateData });
      window.dispatchEvent(event);
    });

    // Viewer count updates
    connection.on('ViewerCountUpdate', (viewerData) => {
      setViewerCount(viewerData.viewerCount);
      const event = new CustomEvent('viewerCountUpdate', { detail: viewerData });
      window.dispatchEvent(event);
    });

    // Error handling
    connection.on('Error', (errorMessage) => {
      console.error('SignalR Error:', errorMessage);
      const event = new CustomEvent('signalRError', { detail: { message: errorMessage } });
      window.dispatchEvent(event);
    });
  };

  // Send fire reaction (matches backend SendFireReaction method)
  const sendFireReaction = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendFireReaction', debateId);
      } catch (error) {
        console.error('Error sending fire reaction:', error);
      }
    }
  };

  // Round control methods for debate managers
  const startRound = async (debateId, roundNumber) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('StartRound', debateId, roundNumber);
      } catch (error) {
        console.error('Error starting round:', error);
      }
    }
  };

  const stopRound = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('StopRound', debateId);
      } catch (error) {
        console.error('Error stopping round:', error);
      }
    }
  };

  const nextQuestion = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('NextQuestion', debateId);
      } catch (error) {
        console.error('Error going to next question:', error);
      }
    }
  };

  const previousQuestion = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('PreviousQuestion', debateId);
      } catch (error) {
        console.error('Error going to previous question:', error);
      }
    }
  };

  const broadcastQuestion = async (debateId, roundNumber, questionText) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('BroadcastQuestion', debateId, roundNumber, questionText);
      } catch (error) {
        console.error('Error broadcasting question:', error);
      }
    }
  };

  // Room management for viewer count
  const joinDebateRoom = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('JoinDebateRoom', debateId);
      } catch (error) {
        console.error('Error joining debate room:', error);
      }
    }
  };

  const leaveDebateRoom = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('LeaveDebateRoom', debateId);
      } catch (error) {
        console.error('Error leaving debate room:', error);
      }
    }
  };

  const getViewerCount = async (debateId) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('GetViewerCount', debateId);
      } catch (error) {
        console.error('Error getting viewer count:', error);
      }
    }
  };

  return {
    connection,
    isConnected,
    viewerCount,
    fireEvents,
    sendFireReaction,
    startRound,
    stopRound,
    nextQuestion,
    previousQuestion,
    broadcastQuestion,
    joinDebateRoom,
    leaveDebateRoom,
    getViewerCount
  };
}