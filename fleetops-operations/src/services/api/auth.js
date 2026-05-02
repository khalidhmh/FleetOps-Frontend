import api from "/shared/api-handler.js";

// التوجيه لباك إند لارافل (بورت 8000)
api.setBaseURL("http://localhost:8000");

export async function login(email, password) {
    try {
        // استخدام الـ api utility زي الملف اللي إنت بعته
        const { data, status } = await api.post("/api/v1/auth/login", {
            email: email,
            password: password
        });

        if (status === 200 && data.success) {
            // حفظ التوكن في الـ LocalStorage عشان نستخدمه في باقي الصفحات
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            return { success: true, data: data.data };
        }
        return { success: false, message: data.message };
    } catch (error) {
        console.error("Login Error:", error);
        return { 
            success: false, 
            message: error.data?.message || "تعذر الاتصال بالسيرفر" 
        };
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

const AuthApi = { login, logout };
export default AuthApi;