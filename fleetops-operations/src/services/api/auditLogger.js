import api from "/shared/api-handler.js";

// التوجيه لباك إند لارافل
api.setBaseURL("http://localhost:8000/api/v1");

const getHeaders = () => ({
    'Accept': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// الدالة دي مبقاش ليها لازمة في الفرونت لأن الـ Backend بيسجل أوتوماتيك
// بس هنسيبها ترجع success عشان لو في كود في الفرونت بيناديها ميكراشش
export async function logAuditAction(userName, userRole, action, entity, entityId, oldValue = null, newValue = null) {
    console.log("Audit logging is now handled automatically by the Backend Middleware.");
    return { success: true };
}

// API: GET /api/v1/audit/logs
export async function getAuditLogs(filters = {}) {
    try {
        // تجميع فلاتر البحث من الشاشة
        const queryParams = new URLSearchParams();
        if (filters.user) queryParams.append('user_id', filters.user);
        if (filters.entity && filters.entity !== 'All Entities') queryParams.append('entity_type', filters.entity);
        if (filters.action && filters.action !== 'All Actions') queryParams.append('action', filters.action);
        if (filters.dateFrom) queryParams.append('date_from', filters.dateFrom);
        if (filters.dateTo) queryParams.append('date_to', filters.dateTo);
        if (filters.search) queryParams.append('search', filters.search);

        const response = await fetch(`http://localhost:8000/api/v1/audit/system-logs?${queryParams.toString()}`, {
            method: 'GET',
            headers: getHeaders()
        });

        const result = await response.json();
        
        if (result.success) {
    return result.data.data.map(log => {
        // تحويل الميثود لـ Action يفهمه الـ CSS للألوان
        const methodMap = {
            'POST': 'Created',
            'PUT': 'Updated',
            'PATCH': 'Updated',
            'DELETE': 'Deleted'
        };
        return {
            id: log.log_id,
            userId: log.user_id || 'System',
            userRole: log.channel,
            entity: log.module,
            // إذا كان الميثود موجوداً نستخدم الخريطة، وإلا نستخدم القيمة الأصلية
            action: methodMap[log.context?.method] || log.action || 'Updated', 
            timestamp: log.created_at,
            details: log.message,
            oldValue: null,
            newValue: log.context
        };
    });
}
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
    }
}

const AuditApi = {
    logAuditAction,
    getAuditLogs
};

export default AuditApi;