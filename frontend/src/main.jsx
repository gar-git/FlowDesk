import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes/index.jsx';
import { SnackbarProvider } from './utils/SnackbarProvider.jsx';
import { JWTProvider } from './context/JWTContext.jsx';
import './styles.css';

// ==============================|| APP BOOTSTRAP ||============================== //
//
// Provider stack (mirrors src/main.jsx pattern):
//   RouterProvider
//     └─ SnackbarProvider   (toast notifications)
//        └─ JWTProvider     (auth state + token lifecycle)
//           └─ RouterProvider routes

ReactDOM.createRoot(document.getElementById('root')).render(
    <SnackbarProvider>
        <JWTProvider>
            <RouterProvider router={router} />
        </JWTProvider>
    </SnackbarProvider>
);
