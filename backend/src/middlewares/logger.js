// API Request/Response Logger Middleware
export const apiLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Store original send function
    const originalSend = res.send;
    
    // Intercept response send
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Parse response data
        let responseData = data;
        if (typeof data === 'string') {
            try {
                responseData = JSON.parse(data);
            } catch {
                responseData = data;
            }
        }
        
        // Log the API call
        console.log('\n' + '='.repeat(80));
        console.log(`📤 API REQUEST & RESPONSE`);
        console.log('='.repeat(80));
        console.log(`🔵 METHOD: ${req.method}`);
        console.log(`🔗 URL: ${req.originalUrl}`);
        console.log(`⏱️  TIMESTAMP: ${new Date().toISOString()}`);
        
        // Log request body (for POST, PUT, PATCH)
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body).length > 0) {
            console.log(`📥 REQUEST BODY:`, JSON.stringify(req.body, null, 2));
        }
        
        // Log response
        console.log(`✅ STATUS CODE: ${statusCode}`);
        console.log(`⏳ DURATION: ${duration}ms`);
        console.log(`📤 RESPONSE:`, JSON.stringify(responseData, null, 2));
        console.log('='.repeat(80) + '\n');
        
        // Call original send
        return originalSend.call(this, data);
    };
    
    next();
};
