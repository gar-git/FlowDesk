import { Suspense } from 'react';
import LoadingScreen from '../LoadingScreen/LoadingScreen';

// ==============================|| LOADABLE — lazy-load wrapper ||============================== //

const Loadable = (Component) => {
    const WrappedComponent = (props) => (
        <Suspense fallback={<LoadingScreen />}>
            <Component {...props} />
        </Suspense>
    );
    WrappedComponent.displayName = `Loadable(${Component.displayName || Component.name || 'Component'})`;
    return WrappedComponent;
};

export default Loadable;
