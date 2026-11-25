
const common_site_config = require('../../frappe-bench/sites/common_site_config.json');
const { webserver_port } = common_site_config;

export default {
    '^/(app|api|assets|files|private)': {
        target: `http://127.0.0.1:${webserver_port || 8000}`,
        changeOrigin: true,
        ws: true,
        headers: {
            'X-Frappe-Site-Name': 'development.localhost'
        }
    }
};
