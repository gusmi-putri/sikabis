import '../css/app.css';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'SI-KABIS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob<{ default: ComponentType }>('./Pages/**/*.tsx')).then(
            (page) => page.default,
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <ToastProvider>
                    <App {...props} />
                </ToastProvider>
            </ThemeProvider>
        );
    },
    progress: {
        color: '#10b981',
    },
});
