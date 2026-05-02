import AuthApi from "../../services/api/auth.js";

export function mount() {
    // 1. برمجة زرار اللوجين والاتصال بالباك إند
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // قراءة الإيميل والباسوورد
            const email = document.querySelector('input[type="email"]')?.value;
            const password = document.getElementById('password')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            if (!email || !password) {
                alert("Please enter email and password");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Signing in...';
            }

            const result = await AuthApi.login(email, password);

            if (result.success) {
                window.location.href = '/';
            } else {
                alert(result.message || 'Login failed. Please check your credentials.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Sign In';
                }
            }
        });
    }

    // 2. برمجة إظهار/إخفاء الباسوورد (باستخدام SVG مباشر لتجنب تهنيج المتصفح)
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        // أكواد الـ SVG الخاصة بالعين بدلاً من تحميل المكتبة كاملة
        const eyeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const eyeOffIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

        // تعيين الأيقونة الافتراضية
        togglePasswordBtn.innerHTML = eyeIcon;

        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // التبديل بين شكل العين المفتوحة والمغلقة
            togglePasswordBtn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
        });
    }
}

export function unmount() {
    // إرجاع الـ Layout الأساسي
    const sidebar = document.querySelector('.dashboard-sidebar');
    const topbar = document.querySelector('.dashboard-topbar');
    const shell = document.querySelector('.dashboard-shell');
    
    if(sidebar) sidebar.style.display = '';
    if(topbar) topbar.style.display = '';
    if(shell) shell.style.gridTemplateColumns = '';
}