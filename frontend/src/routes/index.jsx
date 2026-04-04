import { createBrowserRouter } from 'react-router-dom';
import AuthRoutes from './AuthRoutes';
import { lazy } from 'react';
import Loadable from '../commoncomponents/Loadable/Loadable';
import AuthGuard from '../utils/AuthGuard';
import { Navigate } from 'react-router-dom';

// ==============================|| ROOT ROUTER ||============================== //

const LandingPage = Loadable(lazy(() => import('../pages/LandingPage')));
const Dashboard   = Loadable(lazy(() => import('../pages/Dashboard')));
const NotFound    = Loadable(lazy(() => import('../pages/NotFound')));

const router = createBrowserRouter([
    // Public landing
    {
        path: '/',
        element: <LandingPage
            onLogin={() => window.location.href = '/login'}
            onSignup={() => window.location.href = '/signup'}
        />,
    },

    // Auth routes (login / signup) — wrapped in GuestGuard
    AuthRoutes,

    // Protected app routes — wrapped in AuthGuard
    {
        path: '/dashboard',
        element: (
            <AuthGuard>
                <Dashboard />
            </AuthGuard>
        ),
    },

    // 404
    {
        path: '/page-not-found',
        element: <NotFound />,
    },
    {
        path: '*',
        element: <Navigate to="/page-not-found" replace />,
    },
]);

export default router;
