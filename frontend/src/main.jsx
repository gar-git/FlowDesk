import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes/index.jsx';
import { SnackbarProvider } from './utils/SnackbarProvider.jsx';
import { JWTProvider } from './context/JWTContext.jsx';
import LenisProvider from './utils/LenisProvider.jsx';
import './styles.css';
import { initTheme } from './utils/theme';

initTheme();

// ==============================|| APP BOOTSTRAP ||============================== //
//
// Provider stack (mirrors src/main.jsx pattern):
//   RouterProvider
//     └─ SnackbarProvider   (toast notifications)
//        └─ JWTProvider     (auth state + token lifecycle)
//           └─ LenisProvider (smooth scroll)
//              └─ RouterProvider routes

ReactDOM.createRoot(document.getElementById('root')).render(
    <SnackbarProvider>
        <JWTProvider>
            <LenisProvider>
                <RouterProvider router={router} />
            </LenisProvider>
        </JWTProvider>
    </SnackbarProvider>
);
