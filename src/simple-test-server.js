const http = require('http');

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);

    // Set headers
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });

    // Simple HTML response
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Simple Test Server</title>
</head>
<body style="background: yellow; padding: 20px; font-family: Arial;">
    <h1 style="color: red;">🔥 MINIMAL SERVER TEST</h1>
    <p>If you can see this yellow page, the basic HTTP server works!</p>
    <p>Request URL: ${req.url}</p>
    <p>Time: ${new Date().toISOString()}</p>
    <h2>This completely bypasses Express.js</h2>
</body>
</html>`;

    res.end(html);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Simple test server running on http://localhost:${PORT}`);
    console.log('This server completely bypasses Express.js');
});
