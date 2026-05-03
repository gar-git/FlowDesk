import { useId } from 'react';

/** Decorative strip for the dashboard / preview frame chrome (replaces placeholder window dots). */
export default function WorkspaceFrameAccent() {
    const uid = useId().replace(/:/g, '');
    const gradId = `wfx-${uid}`;

    return (
        <div className="workspace-frame-accent" aria-hidden>
            <svg
                className="workspace-frame-accent__svg"
                viewBox="0 0 92 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="92" y2="0" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#6c63ff" />
                        <stop offset="0.45" stopColor="#00d4ff" />
                        <stop offset="1" stopColor="#ff6b9d" />
                    </linearGradient>
                </defs>
                <path
                    d="M8 15 Q26 5 46 15 T84 15"
                    stroke={`url(#${gradId})`}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    className="workspace-frame-accent__path"
                />
                <circle cx="8" cy="15" r="4" className="workspace-frame-accent__node workspace-frame-accent__node--a" />
                <circle cx="46" cy="15" r="4" className="workspace-frame-accent__node workspace-frame-accent__node--b" />
                <circle cx="84" cy="15" r="4" className="workspace-frame-accent__node workspace-frame-accent__node--c" />
            </svg>
            <span className="workspace-frame-accent__caption">Flow</span>
        </div>
    );
}
