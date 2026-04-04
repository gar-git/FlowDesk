import { lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import Loadable from '../commoncomponents/Loadable/Loadable';
import AuthGuard from '../utils/AuthGuard';
import { roleType } from '../utils/constants';

// ==============================|| APP ROUTES — protected routes ||============================== //

const Dashboard = Loadable(lazy(() => import('../pages/Dashboard')));
const NotFound  = Loadable(lazy(() => import('../pages/NotFound')));

export const AppRoutes = () => {
    const routes = [
        {
            path: '/dashboard',
            element: (
                <AuthGuard>
                    <Dashboard />
                </AuthGuard>
            ),
        },
        {
            path: '/page-not-found',
            element: <NotFound />,
        },
        {
            path: '*',
            element: <Navigate to="/page-not-found" replace />,
        },
    ];

    return useRoutes(routes);
};

export default AppRoutes;
