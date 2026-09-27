import { useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket.js';

// Subscribes to live seat changes for one show and calls onChange when they happen.
// Returns whether the live connection is currently up.
export function useShowUpdates(showId, onChange) {
  const [connected, setConnected] = useState(socket.connected);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!showId) return;

    // Runs on first connect and on every reconnect: rejoin the room (rooms don't
    // survive a reconnect) and refetch, since events may have been missed while offline.
    const onConnect = () => {
      socket.emit('show:join', showId);
      setConnected(true);
      onChangeRef.current();
    };
    const onDisconnect = () => setConnected(false);
    const onSeatsChanged = (event) => {
      if (event.showId === showId) onChangeRef.current();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('seats:changed', onSeatsChanged);
    if (socket.connected) {
      socket.emit('show:join', showId);
      setConnected(true);
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('show:leave', showId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('seats:changed', onSeatsChanged);
    };
  }, [showId]);

  return connected;
}
