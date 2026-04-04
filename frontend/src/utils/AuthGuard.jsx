import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// ==============================|| AUTH GUARD — protects authenticated routes ||============================== //

const AuthGuard = ({ children, allowedRoles }) => {
    const { isLoggedIn, isInitialized, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isInitialized) return;

        if (!isLoggedIn) {
            navigate('/login', {
                state: { from: location.pathname },
                replace: true,
            });
            return;
        }

        // Role-based access: if allowedRoles provided, verify the user's role
        if (allowedRoles && !allowedRoles.includes(user?.roleId)) {
            navigate('/dashboard', { replace: true });
        }
    }, [isLoggedIn, isInitialized, user, allowedRoles, location.pathname, navigate]);

    if (!isInitialized || !isLoggedIn) return null;

    if (allowedRoles && !allowedRoles.includes(user?.roleId)) return null;

    return children;
};

export default AuthGuard;
