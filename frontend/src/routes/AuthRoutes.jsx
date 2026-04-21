import { lazy } from 'react';
import { Outlet } from 'react-router-dom';
import Loadable from '../commoncomponents/Loadable/Loadable';
import GuestGuard from '../utils/GuestGuard';

// ==============================|| AUTH ROUTES — only accessible when NOT logged in ||============================== //

const AuthPage = Loadable(lazy(() => import('../pages/AuthPage')));
const CreateCompanyPage = Loadable(lazy(() => import('../pages/CreateCompanyPage')));

const AuthRoutes = {
    path: '/',
    element: (
        <GuestGuard>
            <Outlet />
        </GuestGuard>
    ),
    children: [
        {
            path: 'login',
            element: <AuthPage initialTab="login" onBack={() => window.location.href = '/'} />,
        },
        {
            path: 'signup',
            element: <AuthPage initialTab="signup" onBack={() => window.location.href = '/'} />,
        },
        {
            path: 'register-company',
            element: <CreateCompanyPage onBack={() => window.location.href = '/'} />,
        },
    ],
};

export default AuthRoutes;
