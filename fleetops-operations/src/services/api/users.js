import api from "/shared/api-handler.js";

// إعداد الرابط الأساسي للباك إند
api.setBaseURL("http://localhost:8000/api/v1"); 

// دالة مساعدة لجلب التوكن
const getHeaders = () => ({
    'Accept': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// 1. جلب المستخدمين
// API: GET /api/v1/users
export async function getUsers(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        // التعديل هنا: التأكد إن الـ role مش all (سواء كابيتال أو سمول)
        if (filters.role && filters.role.toLowerCase() !== 'all') {
            queryParams.append('role', filters.role);
        }
        if (filters.search) queryParams.append('search', filters.search);
        
        const response = await fetch(`http://localhost:8000/api/v1/users?${queryParams.toString()}`, {
            method: 'GET',
            headers: getHeaders()
        });

        const result = await response.json();
        
        if (result.success) {
            return result.data.data.map(user => ({
                id: user.user_id,
                fullName: user.name,
                email: user.email,
                phone: user.phone_no || '--',
                role: user.role,
                status: user.is_active ? 'active' : 'inactive',
                city: '--'
            })); 
        }
        console.error("Backend Error:", result.message);
        return [];
    } catch (error) {
        console.error("Network Error:", error);
        return [];
    }
}
// 2. إضافة مستخدم جديد
export async function createUser(userData) {
    try {
        const response = await fetch(`http://localhost:8000/api/v1/users`, {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// 3. تحديث مستخدم (تعديل البيانات أو تغيير الحالة)
export async function updateUsers(userId, userData) {
    try {
        const response = await fetch(`http://localhost:8000/api/v1/users/${userId}`, {
            method: 'PUT',
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
}

const UsersApi = {
    getUsers,
    updateUsers,
    createUser
};

export default UsersApi;