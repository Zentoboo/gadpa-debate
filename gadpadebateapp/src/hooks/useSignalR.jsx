import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export default function useSignalR() {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [fireEvents, setFireEvents] = useState([]);
  const connectionRef = useRef(null);

  useEffect(() => {
    // Create SignalR connection
    const newConnection = new HubConnectionBuilder()
      .withUrl('http://localhost:5076/debateHub')
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
    // Viewer count updates
    connection.on('ViewerCountChanged', (count) => {
      setViewerCount(count);
    });

    // Fire events from other users
    connection.on('FireAdded', (fireData) => {
      setFireEvents(prev => [...prev, {
        id: Date.now() + Math.random(),
        ...fireData
      }].slice(-50)); // Keep only last 50 events
    });

    // Live reactions from other users
    connection.on('ReceiveFireReaction', (reactionData) => {
      // This will be used for floating animations from other users
      const event = new CustomEvent('externalFireReaction', { detail: reactionData });
      window.dispatchEvent(event);
    });

    // Debate status changes
    connection.on('DebateStatusChanged', (statusData) => {
      const event = new CustomEvent('debateStatusChanged', { detail: statusData });
      window.dispatchEvent(event);
    });

    // Question changes
    connection.on('QuestionChanged', (questionData) => {
      const event = new CustomEvent('questionChanged', { detail: questionData });
      window.dispatchEvent(event);
    });

    // Connection established
    connection.on('Connected', (data) => {
      console.log('Connected to debate hub:', data);
    });
  };

  // Send fire reaction with coordinates
  const sendFireReaction = async (x, y, userName = 'Anonymous') => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendFireReaction', userName, x, y);
      } catch (error) {
        console.error('Error sending fire reaction:', error);
      }
    }
  };

  // Get current viewer count
  const requestViewerCount = async () => {
    if (connection && isConnected) {
      try {
        await connection.invoke('GetViewerCount');
      } catch (error) {
        console.error('Error requesting viewer count:', error);
      }
    }
  };

  // Send typing indicator (for moderators)
  const sendTypingIndicator = async (isTyping) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendTypingIndicator', isTyping);
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  };

  return {
    connection,
    isConnected,
    viewerCount,
    fireEvents,
    sendFireReaction,
    requestViewerCount,
    sendTypingIndicator
  };
}