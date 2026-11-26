export default {
    '^/(app|api|assets|files|private)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        headers: {
            'X-Frappe-Site-Name': 'development.localhost'
        }
    }
};
