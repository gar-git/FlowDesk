import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// ==============================|| GUEST GUARD — blocks authenticated users from auth pages ||============================== //

const GuestGuard = ({ children }) => {
    const { isLoggedIn, isInitialized } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            navigate('/dashboard', { replace: true });
        }
    }, [isLoggedIn, isInitialized, navigate]);

    if (!isInitialized) return null;

    return !isLoggedIn ? children : null;
};

export default GuestGuard;
