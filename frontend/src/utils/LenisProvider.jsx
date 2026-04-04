import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export default function LenisProvider({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      direction: 'vertical',
      gestureDirection: 'vertical',
      smoothTouch: true,
      infinite: false,
    });

    let frameId = null;

    const raf = (time) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);
    lenisRef.current = lenis;

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
