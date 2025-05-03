const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/health',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'test-request-1'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end(); 