import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Tu Turno Pro',
        short_name: 'Tu Turno',
        description: 'Gestión integral para complejos deportivos',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#059669',
        orientation: 'portrait-primary',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };
}
