// 图书管理系统 - 主入口文件

/**
 * 页面加载完成后的初始化入口
 * 依次初始化过渡动画、滚动效果、工具提示、回到顶部、访问控制、用户菜单，
 * 最后应用用户设置（用户菜单内部已调用 initSettings 创建设置弹窗）
 */
document.addEventListener('DOMContentLoaded', function() {
    initPageTransitions();
    initScrollEffects();
    initTooltips();
    initScrollToTop();
    initAccessControl();
    initRoleNavbar();
    initUserMenu();
    applySettings();
});

// 初始化页面过渡动画
function initPageTransitions() {
    // 为所有链接添加平滑过渡效果
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            // 如果是下载链接或邮件链接，不添加过渡效果
            if (this.href.startsWith('mailto:') || this.href.startsWith('tel:') || this.download) {
                return;
            }
            
            // 下拉菜单中的链接（设置、退出登录）不添加过渡效果，保持原有行为
            if (this.classList.contains('dropdown-item')) {
                return;
            }
            
            // 外部链接不添加过渡效果
            if (this.hostname && this.hostname !== window.location.hostname) {
                return;
            }
            
            // 阻止默认跳转
            e.preventDefault();
            
            // 添加离开动画
            document.body.classList.add('page-transition-out');
            
            // 延迟跳转，等待动画完成
            setTimeout(() => {
                window.location.href = this.href;
            }, 300);
        });
    });
    
    // 添加页面进入动画
    document.body.classList.add('page-transition-in');
    setTimeout(() => {
        document.body.classList.remove('page-transition-in');
    }, 500);
}

// 初始化滚动效果
function initScrollEffects() {
    window.addEventListener('scroll', function() {
        // 导航栏滚动效果
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        
        // 元素滚动显示效果
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    });
}

// 初始化工具提示
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                z-index: 1000;
                pointer-events: none;
                transform: translateX(-50%);
                left: 50%;
                top: -30px;
                animation: fadeInUp 0.15s ease-out;
            `;
            
            this.style.position = 'relative';
            this.appendChild(tooltip);
        });
        
        element.addEventListener('mouseleave', function() {
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });
}

/**
 * 初始化回到顶部按钮
 * 创建回到顶部按钮并绑定滚动显示/隐藏逻辑和点击事件
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function initScrollToTop() {
    try {
        let scrollBtn = document.getElementById('scroll-to-top');
        
        if (!scrollBtn) {
            scrollBtn = document.createElement('button');
            scrollBtn.id = 'scroll-to-top';
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            scrollBtn.setAttribute('aria-label', '回到顶部');
            document.body.appendChild(scrollBtn);
        }

        scrollBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        window.addEventListener('scroll', function() {
            if (window.scrollY > 500) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });
    } catch (error) {
        console.error('初始化回到顶部按钮失败:', error);
    }
}

// 添加CSS样式到页面
function addCSS(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

// 添加页面过渡动画样式
addCSS(`
    /* 页面过渡动画 */
    .page-transition-out {
        animation: pageFadeOut 0.3s ease-out;
    }
    
    .page-transition-in {
        animation: pageFadeIn 0.5s ease-in;
    }
    
    @keyframes pageFadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
    
    @keyframes pageFadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* 导航栏滚动效果 */
    .navbar.scrolled {
        box-shadow: var(--shadow-lg);
        background: var(--navbar-scrolled-bg);
        backdrop-filter: blur(10px);
    }
    
    /* 滚动显示动画 */
    .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }
    
    .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* 工具提示样式 */
    .tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        z-index: 1000;
        pointer-events: none;
    }
    
    /* 加载动画 */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--card-background);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        transition: opacity 0.5s ease;
    }
    
    .loading-overlay.hidden {
        opacity: 0;
        pointer-events: none;
    }
    
    /* 卡片悬停效果增强 */
    .book-card, .stat-card, .category-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .book-card:hover, .stat-card:hover, .category-card:hover {
        transform: translateY(-5px) scale(1.02);
    }
    
    /* 按钮点击效果 */
    .btn {
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
    }
    
    .btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
    }
    
    .btn:active::before {
        width: 300px;
        height: 300px;
    }
    
    /* 输入框聚焦效果 */
    input:focus, select:focus, textarea:focus {
        transition: all 0.3s ease;
    }
    
    /* 平滑滚动 */
    html {
        scroll-behavior: smooth;
    }
    
    /* 用户菜单样式 */
    .navbar .container {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .navbar-nav {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-right: 0;
        flex-grow: 1;
    }
    
    .search-container {
        display: flex;
        align-items: center;
        margin: 0 1rem;
    }
    
    .user-menu-container {
        display: flex;
        align-items: center;
        margin-left: auto !important;
        position: relative;
    }
    
    .user-menu-item {
        display: flex;
        align-items: center;
    }
    
    .login-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
    }

    .login-btn:hover {
        background: var(--primary-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }

    /* 用户下拉菜单样式 - 使用 CSS 变量以支持深色模式 */
    .user-dropdown-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border-radius: 0.5rem;
        transition: all 0.3s ease;
        background: var(--surface-hover);
        color: var(--text-primary);
        font-weight: 600;
    }

    .user-dropdown-trigger:hover {
        background: var(--border-color);
    }

    .user-dropdown-trigger i {
        font-size: 0.75rem;
        transition: transform 0.3s ease;
    }

    .user-dropdown-menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: var(--card-background);
        border-radius: 0.5rem;
        box-shadow: var(--shadow-xl);
        min-width: 200px;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);
    }

    .user-dropdown-menu.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        color: var(--text-primary);
        text-decoration: none;
        transition: all 0.2s ease;
        border-bottom: 1px solid var(--border-color);
    }

    .dropdown-item:last-child {
        border-bottom: none;
    }

    .dropdown-item:hover {
        background: var(--surface-hover);
        color: var(--primary-color);
    }

    .dropdown-item i {
        width: 1rem;
        text-align: center;
        color: var(--text-secondary);
    }

    .dropdown-item:hover i {
        color: var(--primary-color);
    }

    .dropdown-divider {
        height: 1px;
        background: var(--border-color);
        margin: 0.5rem 0;
    }

    .logout-btn:hover {
        background: rgba(185, 28, 28, 0.08) !important;
        color: var(--danger-color) !important;
    }

    .logout-btn:hover i {
        color: var(--danger-color) !important;
    }
`);

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
});

/**
 * 初始化用户菜单
 * 根据登录状态切换显示登录按钮或用户下拉菜单，并绑定退出、设置等交互事件
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function initUserMenu() {
    try {
        // 检查用户登录状态
        const userJson = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        let userData = null;

        if (userJson) {
            try {
                userData = JSON.parse(userJson);
            } catch (e) {
                console.warn('解析本地用户信息失败:', e);
            }
        }

        const loginBtnContainer = document.getElementById('login-btn-container');
        const userDropdownContainer = document.getElementById('user-dropdown-container');
        const currentUsername = document.getElementById('current-username');

        if (userData && token) {
            // 用户已登录，显示用户菜单
            if (currentUsername) currentUsername.textContent = userData.username;
            if (loginBtnContainer) loginBtnContainer.style.display = 'none';
            if (userDropdownContainer) userDropdownContainer.style.display = 'block';
        } else {
            // 用户未登录，显示登录按钮
            if (loginBtnContainer) loginBtnContainer.style.display = 'block';
            if (userDropdownContainer) userDropdownContainer.style.display = 'none';
        }

        // 初始化下拉菜单交互
        const dropdownTrigger = document.querySelector('.user-dropdown-trigger');
        const dropdownMenu = document.querySelector('.user-dropdown-menu');

        if (dropdownTrigger && dropdownMenu) {
            dropdownTrigger.addEventListener('click', function() {
                dropdownMenu.classList.toggle('show');
            });

            // 点击外部关闭下拉菜单
            document.addEventListener('click', function(event) {
                if (!dropdownTrigger.contains(event.target) && !dropdownMenu.contains(event.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }

        // 初始化退出登录功能
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();

                // 调用退出登录API
                fetch('/api/logout/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    // 清除本地存储
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');

                    // 刷新页面
                    window.location.reload();
                })
                .catch(error => {
                    console.error('退出登录失败:', error);
                    // 即使API调用失败，也清除本地存储并刷新
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                });
            });
        }

        // 初始化编辑个人信息功能
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                openSettingsModal();
                // 自动滚动到个人信息区域
                const profileSection = document.querySelector('.settings-section:last-child');
                if (profileSection) {
                    profileSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // 初始化设置功能
        initSettings();
    } catch (error) {
        console.error('初始化用户菜单失败:', error);
    }
}

// ============================================
// 设置功能相关函数
// ============================================

/**
 * 初始化设置弹窗
 * 动态创建设置面板DOM并绑定事件，最后将当前设置加载到表单中
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function initSettings() {
    try {
        createSettingsModal();
        bindSettingsEvents();
        loadSettingsToForm();
    } catch (error) {
        console.error('初始化设置弹窗失败:', error);
    }
}

/**
 * 创建设置弹窗DOM结构
 * 如果弹窗已存在则跳过，避免重复创建
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function createSettingsModal() {
    try {
        // 如果已存在则不再创建
        if (document.getElementById('settings-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'settings-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'settings-title');

    modal.innerHTML = `
        <div class="settings-panel">
            <div class="settings-header">
                <h3 id="settings-title">系统设置</h3>
                <button type="button" class="settings-close" id="settings-close" aria-label="关闭设置">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-body">
                <div id="settings-message" class="settings-message"></div>

                <div class="settings-section">
                    <div class="settings-section-title">外观</div>
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <span>主题模式</span>
                            <small>选择您喜欢的界面主题</small>
                        </div>
                        <select id="settings-theme" class="settings-select">
                            <option value="light">浅色模式</option>
                            <option value="dark">深色模式</option>
                            <option value="auto">跟随系统</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">通知</div>
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <span>操作提示</span>
                            <small>显示保存、删除等操作结果提示</small>
                        </div>
                        <div class="settings-toggle active" id="settings-notifications-toggle" data-active="true"></div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">图书列表</div>
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <span>默认排序</span>
                            <small>图书列表默认采用的排序方式</small>
                        </div>
                        <select id="settings-sort" class="settings-select">
                            <option value="newest">最新添加</option>
                            <option value="rating">评分最高</option>
                            <option value="title">书名排序</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">个人信息</div>
                    <div class="settings-item" style="flex-direction: column; align-items: stretch; gap: 0.75rem;">
                        <label class="settings-item-label" style="gap: 0.5rem;">
                            <span>邮箱</span>
                            <input type="email" id="settings-email" class="settings-input" style="width: 100%;" placeholder="请输入邮箱" value="">
                        </label>
                        <label class="settings-item-label" style="gap: 0.5rem;">
                            <span>手机号</span>
                            <input type="tel" id="settings-phone" class="settings-input" style="width: 100%;" placeholder="请输入手机号" value="">
                        </label>
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <button type="button" class="btn btn-secondary" id="settings-cancel">取消</button>
                <button type="button" class="btn btn-primary" id="settings-save">保存设置</button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('创建设置弹窗DOM失败:', error);
    }
}

/**
 * 绑定设置弹窗事件
 * 为设置按钮、关闭按钮、保存按钮、通知开关、主题选择等绑定交互事件
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function bindSettingsEvents() {
    try {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                openSettingsModal();
            });
        }

        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        const closeBtn = document.getElementById('settings-close');
        const cancelBtn = document.getElementById('settings-cancel');
        const saveBtn = document.getElementById('settings-save');
        const notificationsToggle = document.getElementById('settings-notifications-toggle');

        if (closeBtn) closeBtn.addEventListener('click', closeSettingsModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeSettingsModal);
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSettingsModal();
            }
        });

        if (notificationsToggle) {
            notificationsToggle.addEventListener('click', function() {
                const isActive = this.getAttribute('data-active') === 'true';
                this.setAttribute('data-active', String(!isActive));
                this.classList.toggle('active', !isActive);
            });
        }

        const themeSelect = document.getElementById('settings-theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', applyThemePreview);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeSettingsModal();
            }
        });
    } catch (error) {
        console.error('绑定设置弹窗事件失败:', error);
    }
}

/**
 * 打开设置弹窗
 * 加载当前设置到表单，保存当前主题以便取消时恢复，并禁止背景页面滚动
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function openSettingsModal() {
    try {
        // 记录打开弹窗前的主题，用于取消时恢复
        const settings = loadSettings();
        window._settingsOriginalTheme = settings.theme || 'light';

        loadSettingsToForm();
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('打开设置弹窗失败:', error);
    }
}

/**
 * 关闭设置弹窗
 * 恢复背景页面滚动，取消时恢复原始主题
 * @param {boolean} [restoreTheme=true] 是否恢复打开弹窗前的主题，保存成功后应传入 false
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function closeSettingsModal(restoreTheme = true) {
    try {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }

        // 取消关闭时恢复原始主题，避免预览主题残留
        if (restoreTheme && window._settingsOriginalTheme) {
            applyTheme(window._settingsOriginalTheme);
            window._settingsOriginalTheme = null;
        }
    } catch (error) {
        console.error('关闭设置弹窗失败:', error);
    }
}

/**
 * 加载设置到表单
 * 从本地存储读取设置并填充到弹窗中的各类控件
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function loadSettingsToForm() {
    try {
        const settings = loadSettings();
        const user = getCurrentUser();

        const themeSelect = document.getElementById('settings-theme');
        const sortSelect = document.getElementById('settings-sort');
        const notificationsToggle = document.getElementById('settings-notifications-toggle');
        const emailInput = document.getElementById('settings-email');
        const phoneInput = document.getElementById('settings-phone');

        if (themeSelect) themeSelect.value = settings.theme || 'light';
        if (sortSelect) sortSelect.value = settings.defaultSort || 'newest';

        if (notificationsToggle) {
            const active = settings.notificationsEnabled !== false;
            notificationsToggle.setAttribute('data-active', String(active));
            notificationsToggle.classList.toggle('active', active);
        }

        if (emailInput && user) emailInput.value = user.email || '';
        if (phoneInput && user) phoneInput.value = user.phone || '';
    } catch (error) {
        console.error('加载设置到表单失败:', error);
    }
}

/**
 * 保存设置
 * 收集弹窗表单中的设置项，持久化到本地存储并应用主题/排序等配置，
 * 同时将邮箱和手机号同步到服务端
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function saveSettings() {
    try {
        const themeSelect = document.getElementById('settings-theme');
        const sortSelect = document.getElementById('settings-sort');
        const notificationsToggle = document.getElementById('settings-notifications-toggle');
        const emailInput = document.getElementById('settings-email');
        const phoneInput = document.getElementById('settings-phone');

        const settings = {
            theme: themeSelect ? themeSelect.value : 'light',
            defaultSort: sortSelect ? sortSelect.value : 'newest',
            notificationsEnabled: notificationsToggle ? notificationsToggle.getAttribute('data-active') === 'true' : true,
            email: emailInput ? emailInput.value.trim() : '',
            phone: phoneInput ? phoneInput.value.trim() : ''
        };

        localStorage.setItem('library_settings', JSON.stringify(settings));

        applySettings();

        const user = getCurrentUser();
        if (user && user.profile_id) {
            updateUserProfile(user.profile_id, settings.email, settings.phone)
                .then(() => {
                    showSettingsMessage('设置已保存', 'success');
                    // 保存成功，不恢复原始主题
                    setTimeout(() => closeSettingsModal(false), 800);
                })
                .catch(error => {
                    showSettingsMessage('设置已本地保存，但同步到服务器失败：' + error.message, 'error');
                });
        } else {
            showSettingsMessage('设置已保存', 'success');
            // 保存成功，不恢复原始主题
            setTimeout(() => closeSettingsModal(false), 800);
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showSettingsMessage('保存设置失败，请重试。', 'error');
    }
}

/**
 * 显示设置弹窗消息
 * 在设置弹窗顶部显示成功或错误提示，3秒后自动隐藏
 * @param {string} message 消息内容
 * @param {string} type 消息类型：success 或 error
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function showSettingsMessage(message, type) {
    try {
        const messageEl = document.getElementById('settings-message');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = `settings-message ${type} show`;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    } catch (error) {
        console.error('显示设置弹窗消息失败:', error);
    }
}

/**
 * 从本地存储加载设置
 * @returns {Object} 用户设置对象；解析失败时返回空对象
 */
function loadSettings() {
    try {
        const stored = localStorage.getItem('library_settings');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.warn('加载本地设置失败:', e);
        return {};
    }
}

/**
 * 获取当前登录用户信息
 * @returns {Object|null} 用户对象或 null；解析失败时返回 null
 */
function getCurrentUser() {
    try {
        const userJson = localStorage.getItem('user');
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.warn('获取当前用户信息失败:', e);
        return null;
    }
}

/**
 * 获取图书默认排序方式
 * 优先读取本地设置中的 defaultSort，未设置时返回 newest
 * @returns {string} 排序方式：newest | rating | title
 */
function getDefaultBookSort() {
    const settings = loadSettings();
    const validSorts = ['newest', 'rating', 'title'];
    const sort = settings.defaultSort || 'newest';
    return validSorts.includes(sort) ? sort : 'newest';
}

/**
 * 应用用户设置
 * 从本地存储读取设置并依次应用主题、排序、通知等配置
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function applySettings() {
    try {
        const settings = loadSettings();
        applyTheme(settings.theme || 'light');
    } catch (error) {
        console.error('应用用户设置失败:', error);
    }
}

/**
 * 应用主题预览
 * 在设置弹窗中切换主题选项时即时预览效果，不会保存到本地存储
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function applyThemePreview() {
    try {
        const themeSelect = document.getElementById('settings-theme');
        const theme = themeSelect ? themeSelect.value : 'light';
        applyTheme(theme);
    } catch (error) {
        console.error('应用主题预览失败:', error);
    }
}

/**
 * 应用主题
 * 根据传入的主题值切换 body 上的样式类，auto 模式会监听系统主题变化并动态切换深色模式
 * @param {string} theme 主题模式：light、dark 或 auto
 */
function applyTheme(theme) {
    try {
        document.body.classList.remove('dark-mode', 'auto-mode');

        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'auto') {
            document.body.classList.add('auto-mode');
            syncAutoTheme();
        }

        // 监听系统主题变化，仅 auto 模式下需要动态响应
        if (theme === 'auto' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            // 先移除旧的监听器避免重复绑定
            if (window._themeMediaQueryListener) {
                mediaQuery.removeEventListener('change', window._themeMediaQueryListener);
            }
            window._themeMediaQueryListener = function() {
                syncAutoTheme();
            };
            mediaQuery.addEventListener('change', window._themeMediaQueryListener);
        }
    } catch (error) {
        console.error('应用主题失败:', error);
    }
}

/**
 * 同步自动主题
 * 根据当前系统主题偏好切换 dark-mode 类，仅在 body 已处于 auto-mode 时生效
 */
function syncAutoTheme() {
    try {
        if (!document.body.classList.contains('auto-mode')) {
            return;
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    } catch (error) {
        console.error('同步自动主题失败:', error);
    }
}

/**
 * 更新用户资料
 * 通过 UserProfile 接口同步邮箱和手机号到服务端，并更新本地缓存
 * @param {number} profileId 用户资料ID（UserProfile 主键）
 * @param {string} email 邮箱
 * @param {string} phone 手机号
 * @returns {Promise<Object>} 请求结果
 * @throws {Error} 用户未登录或请求失败时抛出异常
 */
function updateUserProfile(profileId, email, phone) {
    const token = localStorage.getItem('token');
    if (!token) {
        return Promise.reject(new Error('用户未登录'));
    }

    if (!profileId) {
        return Promise.reject(new Error('用户资料ID不存在'));
    }

    return fetch(`/api/user-profiles/${profileId}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user: { email: email },
            phone: phone
        })
    }).then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.detail || data.error || '更新失败');
            }).catch(() => {
                throw new Error('更新失败，请检查网络连接');
            });
        }
        return response.json();
    }).then(data => {
        // 更新本地存储的用户信息
        const user = getCurrentUser();
        if (user) {
            user.email = email;
            user.phone = phone;
            localStorage.setItem('user', JSON.stringify(user));
        }
        return data;
    });
}

// 全局未捕获的Promise拒绝处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
});

/**
 * 初始化访问控制
 * 按登录状态与角色限制页面访问：
 * - 游客：仅可访问公开页面（首页、登录、图书预览、图书详情、搜索结果），其余重定向到首页
 * - 普通用户：禁止访问管理员管理页（图书管理/添加/编辑/分类），重定向到用户中心
 * - 管理员：可访问所有页面，并补充管理导航链接
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function initAccessControl() {
    try {
        // 检查用户登录状态
        const userJson = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        // 公开页面列表（游客可访问）
        const publicPages = [
            '/',
            '/index.html',
            '/login/',
            '/login.html',
            '/book-preview/',
            '/book-preview.html',
            '/book-detail/',
            '/search-results/'
        ];

        // 管理员专属页面列表（普通用户不可访问）
        const adminPages = [
            '/books/',
            '/books.html',
            '/add-book/',
            '/add-book.html',
            '/edit-book/',
            '/categories/',
            '/categories.html'
        ];

        // 获取当前页面路径
        const currentPath = window.location.pathname;

        // 判断当前页面是否为公开页面
        const isPublicPage = publicPages.some(page => currentPath.startsWith(page));
        // 判断当前页面是否为管理员专属页面
        const isAdminPage = adminPages.some(page => currentPath.startsWith(page));

        // 未登录用户：仅公开页面可访问
        if (!userJson || !token) {
            if (!isPublicPage) {
                console.log('未登录用户尝试访问受保护页面，重定向到首页');
                window.location.href = '/';
                return;
            }
            return;
        }

        // 已登录用户，解析用户数据
        let userData = null;
        try {
            userData = JSON.parse(userJson);
        } catch (e) {
            console.warn('解析本地用户信息失败:', e);
            return;
        }

        // 普通用户访问管理员专属页面：重定向到用户中心
        if (userData.user_type !== 'admin' && isAdminPage) {
            console.log('普通用户尝试访问管理员页面，重定向到用户中心');
            window.location.href = '/user-home/';
            return;
        }
    } catch (error) {
        console.error('初始化访问控制失败:', error);
    }
}

/**
 * 按角色动态生成导航栏菜单项
 * 根据当前登录用户角色露出不同的功能入口：
 * - 游客：首页 / 图书预览
 * - 普通用户：首页 / 图书预览 / 我的借阅 / 还书
 * - 管理员：首页 / 图书列表 / 添加图书 / 分类管理 / 图书预览
 * 同时根据当前页面路径高亮对应的导航项
 * @returns {void} 无返回值
 * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
 */
function initRoleNavbar() {
    try {
        const navbarNav = document.querySelector('.navbar-nav');
        if (!navbarNav) return;

        // 解析当前用户角色
        let userData = null;
        try {
            const userJson = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (userJson && token) {
                userData = JSON.parse(userJson);
            }
        } catch (e) {
            console.warn('解析本地用户信息失败:', e);
        }
        const isAdmin = userData && userData.user_type === 'admin';
        const isUser = userData && !isAdmin;

        // 构建导航项（首页始终展示）
        const navItems = [
            { href: '/', text: '首页', page: 'home' },
            { href: '/book-preview/', text: '图书预览', page: 'book-preview' }
        ];

        if (isUser) {
            navItems.push(
                { href: '/user-home/', text: '用户中心', page: 'user-home' },
                { href: '/user-borrow-records/', text: '我的借阅', page: 'user-borrow-records' }
            );
        }

        if (isAdmin) {
            navItems.push(
                { href: '/books/', text: '图书列表', page: 'books' },
                { href: '/add-book/', text: '添加图书', page: 'add-book' },
                { href: '/categories/', text: '分类管理', page: 'categories' }
            );
        }

        // 获取当前页面路径，用于高亮
        const currentPath = window.location.pathname;

        // 渲染导航项并高亮当前页
        navbarNav.innerHTML = navItems.map(item => {
            const isActive = currentPath.startsWith(item.href)
                && (currentPath === item.href || currentPath.startsWith(item.href + '/'));
            return `<a href="${item.href}" class="nav-link${isActive ? ' active' : ''}" data-page="${item.page}">${item.text}</a>`;
        }).join('');
    } catch (error) {
        console.error('生成角色化导航失败:', error);
    }
}

// 打印系统信息（开发环境）
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    console.log('图书管理系统初始化完成');
    console.log('当前版本:', '1.0.0');
    console.log('数据存储方式:', 'localStorage');
}
