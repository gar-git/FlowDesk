import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/getSocketBaseUrl';

/**
 * Connects to the backend Socket.IO server, registers the current user, and refetches
 * the task list when a notification is pushed (e.g. task assigned by a lead).
 */
export function useTaskSocket({ userId, onRefresh, showSnackbar }) {
    const onRefreshRef = useRef(onRefresh);
    const showSnackbarRef = useRef(showSnackbar);
    onRefreshRef.current = onRefresh;
    showSnackbarRef.current = showSnackbar;

    useEffect(() => {
        const id = userId != null ? Number(userId) : NaN;
        if (!Number.isFinite(id) || id <= 0) return undefined;

        const base = getSocketBaseUrl();
        if (!base) return undefined;

        const socket = io(base, { transports: ['websocket', 'polling'] });

        const register = () => {
            socket.emit('register', id);
        };

        const onNotification = (msg) => {
            onRefreshRef.current?.();
            const t = msg?.type;
            if (t === 'task_assigned') {
                const title = msg?.payload?.task?.title;
                showSnackbarRef.current?.(
                    title ? `New task assigned: ${title}` : 'A new task was assigned to you',
                    'info'
                );
            } else if (t === 'forward_request' || t === 'task_forward_request') {
                showSnackbarRef.current?.('A task was forwarded to you', 'info');
            } else if (t === 'forward_accepted') {
                showSnackbarRef.current?.('A forwarded task was accepted', 'info');
            } else if (t === 'forward_rejected') {
                showSnackbarRef.current?.('Your transfer request was declined', 'info');
            }
        };

        socket.on('connect', register);
        socket.on('notification', onNotification);
        if (socket.connected) register();

        return () => {
            socket.off('connect', register);
            socket.off('notification', onNotification);
            socket.disconnect();
        };
    }, [userId]);
}
