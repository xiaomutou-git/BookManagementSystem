/**
 * 图书管理系统 - UI管理模块
 * 负责页面渲染、事件绑定、消息提示、图书排序等前端交互逻辑
 * 所有涉及 DOM 操作和异步请求的方法均包含异常处理，避免页面崩溃
 */
/**
 * HTML 转义工具函数（防 XSS）
 * 将用户可控字符串中的 HTML 特殊字符转义，避免被当作标签/脚本执行
 * @param {string} str 待转义的原始字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const UI = {
    /**
     * 初始化页面
     * 更新统计数据、设置事件监听、初始化搜索功能
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async init() {
        try {
            await this.updateStats();
            this.setupEventListeners();
            this.initSearch();
        } catch (error) {
            console.error('页面初始化失败:', error);
        }
    },

    /**
     * 设置事件监听器
     * 绑定导航链接激活状态、模态框关闭、ESC 键关闭等事件
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    setupEventListeners() {
        try {
            // 导航链接点击事件
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    // 移除所有活动状态
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    // 添加当前活动状态
                    e.target.classList.add('active');
                });
            });

            // 模态框关闭事件
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
                    this.closeModal();
                }
            });

            // 键盘事件 - ESC关闭模态框
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModal();
                }
            });
        } catch (error) {
            console.error('设置事件监听器失败:', error);
        }
    },

    /**
     * 初始化搜索功能
     * 绑定搜索按钮点击和输入框回车事件
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    initSearch() {
        try {
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');

            if (searchInput && searchBtn) {
                // 搜索按钮点击事件
                searchBtn.addEventListener('click', () => {
                    this.performSearch();
                });

                // 回车键搜索
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.performSearch();
                    }
                });
            }
        } catch (error) {
            console.error('初始化搜索功能失败:', error);
        }
    },

    /**
     * 执行搜索
     * 获取搜索框内容并跳转到搜索结果页
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    performSearch() {
        try {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                const query = searchInput.value.trim();
                if (query) {
                    // 跳转到搜索结果页
                    window.location.href = `/search-results/?query=${encodeURIComponent(query)}`;
                }
            }
        } catch (error) {
            console.error('执行搜索失败:', error);
        }
    },

    /**
     * 更新统计数据
     * 从后端获取图书、分类、平均评分、借阅中、可借册数、今日新增等统计信息，
     * 并以动画形式更新页面显示
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async updateStats() {
        try {
            const stats = await BookData.getStats();

            const totalBooksEl = document.getElementById('total-books');
            const totalCategoriesEl = document.getElementById('total-categories');
            const avgRatingEl = document.getElementById('avg-rating');
            const borrowedNowEl = document.getElementById('borrowed-now');
            const availableBooksEl = document.getElementById('available-books');
            const booksAddedTodayEl = document.getElementById('books-added-today');

            if (totalBooksEl) {
                this.animateNumber(totalBooksEl, 0, stats.total_books, 1000);
            }
            if (totalCategoriesEl) {
                this.animateNumber(totalCategoriesEl, 0, stats.total_categories, 1000);
            }
            if (avgRatingEl) {
                this.animateNumber(avgRatingEl, 0, stats.avg_rating, 1000, 1);
            }
            if (borrowedNowEl) {
                this.animateNumber(borrowedNowEl, 0, stats.borrowed_now || 0, 1000);
            }
            if (availableBooksEl) {
                this.animateNumber(availableBooksEl, 0, stats.available_books || 0, 1000);
            }
            if (booksAddedTodayEl) {
                this.animateNumber(booksAddedTodayEl, 0, stats.books_added_today || 0, 1000);
            }
        } catch (error) {
            console.error('更新统计数据失败:', error);
            this.showMessage('更新统计数据失败，请刷新页面重试。', 'error');
        }
    },

    /**
     * 数字动画效果
     * 在指定时间内将元素数值从 start 平滑过渡到 end，使用缓动函数确保动画流畅
     * @param {HTMLElement} element 需要更新的 DOM 元素
     * @param {number} start 起始数值
     * @param {number} end 结束数值
     * @param {number} duration 动画持续时间（毫秒）
     * @param {number} [decimals=0] 保留小数位数，默认为 0
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    animateNumber(element, start, end, duration, decimals = 0) {
        try {
            const startTime = performance.now();
            const range = end - start;

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = start + (range * easeOutQuart);
                
                element.textContent = current.toFixed(decimals);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = end.toFixed(decimals);
                }
            };

            requestAnimationFrame(animate);
        } catch (error) {
            console.error('数字动画效果失败:', error);
            element.textContent = end.toFixed(decimals);
        }
    },

    /**
     * 渲染图书列表
     * 从 API 或传入数据中获取图书，应用用户设置的默认排序后渲染到页面
     * @param {Array<Object>} [books=null] 可选的图书数据，为空时从 API 获取
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async renderBooks(books = null) {
        const booksGrid = document.getElementById('books-grid');
        if (!booksGrid) return;

        // 显示加载动画
        booksGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // 如果没有提供图书数据，则从API获取
            let booksData = books || await BookData.getAllBooks();

            // 当加载全部图书时，应用用户设置的默认排序
            if (!books) {
                booksData = this.sortBooks(booksData, getDefaultBookSort());
            }

            if (booksData.length === 0) {
                booksGrid.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>未找到图书</h3>
                        <p>没有符合条件的图书，请尝试其他搜索条件。</p>
                    </div>
                `;
                return;
            }

            booksGrid.innerHTML = booksData.map(book => this.createBookCard(book)).join('');

            // 添加图书卡片事件监听器
            this.addBookCardEventListeners();
        } catch (error) {
            console.error('渲染图书列表失败:', error);
            booksGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>加载失败</h3>
                    <p>图书数据加载失败，请刷新页面重试。</p>
                    <button class="btn btn-primary" onclick="UI.renderBooks()">重新加载</button>
                </div>
            `;
        }
    },

    /**
     * 对图书列表进行排序
     * 根据排序类型对图书数组进行排序，返回新数组不修改原数组
     * @param {Array<Object>} booksData 图书数据数组
     * @param {string} sortType 排序类型：newest（最新添加）| rating（评分最高）| title（书名排序）
     * @returns {Array<Object>} 排序后的图书数组
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    sortBooks(booksData, sortType) {
        try {
            const sorted = [...booksData];
            switch (sortType) {
                case 'rating':
                    sorted.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
                    break;
                case 'title':
                    sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
                    break;
                case 'newest':
                default:
                    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    break;
            }
            return sorted;
        } catch (error) {
            console.error('图书排序失败:', error);
            return [...booksData];
        }
    },

    /**
     * 创建图书卡片HTML
     * 根据图书对象生成图书卡片的 HTML 字符串
     * @param {Object} book 图书对象，包含 id、title、author、category、rating、cover_image 等字段
     * @returns {string} 图书卡片的 HTML 字符串
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    createBookCard(book) {
        try {
            // 对所有用户可控字段进行 HTML 转义，防止存储型 XSS
            const bookId = escapeHtml(book.id);
            const title = escapeHtml(book.title);
            const author = escapeHtml(book.author);
            const categoryName = escapeHtml(book.category && book.category.name);
            const coverImage = book.cover_image ? escapeHtml(book.cover_image) : '';
            const rating = parseFloat(book.rating).toFixed(1);

            return `
                <div class="book-card" data-id="${bookId}">
                    <div class="book-card-image">
                        ${coverImage ? `<img src="${coverImage}" alt="${title}">` : '<i class="fas fa-book"></i>'}
                    </div>
                    <div class="book-card-content">
                        <h3 class="book-card-title">${title}</h3>
                        <p class="book-card-author">${author}</p>
                        <div class="book-card-meta">
                            <span class="book-card-category">${categoryName}</span>
                            <span class="book-card-rating">
                                <i class="fas fa-star"></i>
                                ${rating}
                            </span>
                        </div>
                        <div class="book-card-stock">
                            ${book.available_copies > 0
                                ? `<span class="stock-available">可借 ${escapeHtml(book.available_copies)} 本</span>`
                                : '<span class="stock-empty">暂时无库存</span>'}
                        </div>
                        <div class="book-card-actions">
                            <button class="btn btn-primary btn-sm view-btn" data-id="${bookId}">
                                <i class="fas fa-eye"></i> 查看
                            </button>
                            <button class="btn btn-secondary btn-sm edit-btn" data-id="${bookId}">
                                <i class="fas fa-edit"></i> 编辑
                            </button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${bookId}">
                                <i class="fas fa-trash"></i> 删除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('创建图书卡片HTML失败:', error);
            return '';
        }
    },

    /**
     * 添加图书卡片事件监听器
     * 为查看、编辑、删除按钮以及卡片点击事件绑定处理函数
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    addBookCardEventListeners() {
        try {
            // 查看按钮事件
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const bookId = e.target.closest('.btn').dataset.id;
                    window.location.href = `/book-detail/${bookId}/`;
                });
            });

            // 编辑按钮事件
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const bookId = e.target.closest('.btn').dataset.id;
                    window.location.href = `/edit-book/${bookId}/`;
                });
            });

            // 删除按钮事件
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const bookId = e.target.closest('.btn').dataset.id;
                    this.showDeleteConfirmation(bookId);
                });
            });

            // 图书卡片点击事件（查看详情）
            document.querySelectorAll('.book-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    // 如果点击的不是按钮，则跳转到详情页
                    if (!e.target.closest('.btn')) {
                        const bookId = card.dataset.id;
                        window.location.href = `/book-detail/${bookId}/`;
                    }
                });
            });
        } catch (error) {
            console.error('添加图书卡片事件监听器失败:', error);
        }
    },

    /**
     * 显示删除确认
     * 弹出确认对话框，确认后调用 API 删除图书并刷新页面数据
     * @param {number|string} bookId 图书ID
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async showDeleteConfirmation(bookId) {
        if (confirm('确定要删除这本图书吗？此操作不可恢复。')) {
            try {
                // 发送删除请求
                await BookData.deleteBook(bookId);

                // 显示成功消息
                this.showMessage('图书删除成功！', 'success');

                // 检查当前是否在详情页
                const currentPage = window.location.pathname;
                if (currentPage.includes('/book-detail/')) {
                    // 如果在详情页，删除成功后跳转到图书列表页
                    setTimeout(() => {
                        window.location.href = '/books/';
                    }, 1500);
                } else {
                    // 如果在列表页，立即从DOM中移除对应的图书卡片（优化用户体验）
                    const bookCard = document.querySelector(`.book-card[data-id="${bookId}"]`);
                    if (bookCard) {
                        bookCard.remove();
                    }

                    // 重新渲染图书列表（确保数据一致性）
                    await this.renderBooks();

                    // 更新统计数据
                    await this.updateStats();
                }
            } catch (error) {
                console.error('删除图书失败:', error);
                // 检查错误类型
                if (error.message.includes('404')) {
                    this.showMessage('该图书已被删除。', 'error');
                    // 检查当前是否在详情页
                    const currentPage = window.location.pathname;
                    if (currentPage.includes('/book-detail/')) {
                        // 如果在详情页，跳转到图书列表页
                        setTimeout(() => {
                            window.location.href = '/books/';
                        }, 1500);
                    } else {
                        // 如果在列表页，从DOM中移除对应的图书卡片
                        const bookCard = document.querySelector(`.book-card[data-id="${bookId}"]`);
                        if (bookCard) {
                            bookCard.remove();
                        }
                    }
                } else {
                    this.showMessage('图书删除失败，请重试。', 'error');
                }
            }
        }
    },

    /**
     * 显示消息提示
     * 在页面右上角显示消息提示，支持根据用户设置关闭通知
     * @param {string} message 消息内容
     * @param {string} [type='info'] 消息类型：info | success | error
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    showMessage(message, type = 'info') {
        try {
            // 检查用户是否关闭通知提示
            try {
                const settings = JSON.parse(localStorage.getItem('library_settings') || '{}');
                if (settings.notificationsEnabled === false) {
                    return;
                }
            } catch (e) {
                // 解析失败时继续显示消息
            }

            // 创建消息元素
            const messageEl = document.createElement('div');
            messageEl.className = `message message-${type}`;
            messageEl.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                max-width: 320px;
                animation: slideInRight 0.25s ease-out;
            `;
            messageEl.textContent = message;

            // 添加到页面
            document.body.appendChild(messageEl);

            // 3秒后自动移除
            setTimeout(() => {
                messageEl.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('显示消息提示失败:', error);
        }
    },

    /**
     * 渲染分类列表
     * 从 API 或传入数据中获取分类并渲染到页面
     * @param {Array<Object>} [categories=null] 可选的分类数据，为空时从 API 获取
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async renderCategories(categories = null) {
        const categoriesGrid = document.getElementById('categories-grid');
        if (!categoriesGrid) return;

        // 显示加载动画
        categoriesGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // 如果没有提供分类数据，则从API获取
            const categoriesData = categories || await CategoryData.getAllCategories();

            if (categoriesData.length === 0) {
                categoriesGrid.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-tags"></i>
                        <h3>暂无分类</h3>
                        <p>请添加新的分类。</p>
                    </div>
                `;
                return;
            }

            // 使用Promise.all等待所有异步函数完成
            const categoryCards = await Promise.all(categoriesData.map(category => this.createCategoryCard(category)));
            categoriesGrid.innerHTML = categoryCards.join('');

            // 添加分类卡片事件监听器
            this.addCategoryCardEventListeners();
        } catch (error) {
            console.error('渲染分类列表失败:', error);
            categoriesGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>加载失败</h3>
                    <p>分类数据加载失败，请刷新页面重试。</p>
                    <button class="btn btn-primary" onclick="UI.renderCategories()">重新加载</button>
                </div>
            `;
        }
    },

    /**
     * 创建分类卡片HTML
     * 根据分类对象生成分类卡片的 HTML 字符串，并统计该分类下的图书数量
     * @param {Object} category 分类对象，包含 id、name、description 等字段
     * @returns {Promise<string>} 分类卡片的 HTML 字符串
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async createCategoryCard(category) {
        try {
            // 对用户可控字段进行 HTML 转义，防止存储型 XSS
            const categoryId = escapeHtml(category.id);
            const categoryName = escapeHtml(category.name);
            const categoryDescription = escapeHtml(category.description);
            // 分类图书数量由后端聚合返回，避免前端全量统计
            const bookCount = Number(category.book_count) || 0;

            return `
                <div class="category-card" data-id="${categoryId}">
                    <div class="category-info">
                        <h3>${categoryName}</h3>
                        <p>${categoryDescription}</p>
                        <p class="category-count">${bookCount} 本图书</p>
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-secondary btn-sm edit-category-btn" data-id="${categoryId}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm delete-category-btn" data-id="${categoryId}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('创建分类卡片HTML失败:', error);
            return '';
        }
    },

    /**
     * 添加分类卡片事件监听器
     * 为编辑、删除分类按钮绑定处理函数
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    addCategoryCardEventListeners() {
        try {
            // 编辑分类按钮事件
            document.querySelectorAll('.edit-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const categoryId = e.target.closest('.btn').dataset.id;
                    // 这里可以打开编辑模态框
                    console.log('编辑分类:', categoryId);
                });
            });

            // 删除分类按钮事件
            document.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const categoryId = e.target.closest('.btn').dataset.id;
                    this.showCategoryDeleteConfirmation(categoryId);
                });
            });
        } catch (error) {
            console.error('添加分类卡片事件监听器失败:', error);
        }
    },

    /**
     * 显示分类删除确认
     * 检查分类下是否存在图书，确认后调用 API 删除分类
     * @param {number|string} categoryId 分类ID
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async showCategoryDeleteConfirmation(categoryId) {
        try {
            const category = await CategoryData.getCategoryById(categoryId);
            const books = await BookData.getAllBooks();
            const bookCount = books.filter(book => book.category.id === category.id).length;

            if (bookCount > 0) {
                this.showMessage(`无法删除分类 "${category.name}"，该分类下还有 ${bookCount} 本图书。`, 'error');
                return;
            }

            if (confirm(`确定要删除分类 "${category.name}" 吗？此操作不可恢复。`)) {
                if (await CategoryData.deleteCategory(categoryId)) {
                    this.showMessage('分类删除成功！', 'success');
                    // 重新渲染分类列表
                    await this.renderCategories();
                    // 更新统计数据
                    await this.updateStats();
                } else {
                    this.showMessage('分类删除失败，请重试。', 'error');
                }
            }
        } catch (error) {
            console.error('删除分类失败:', error);
            this.showMessage('分类删除失败，请重试。', 'error');
        }
    },

    /**
     * 渲染分类选择下拉框
     * 从 API 获取分类列表并填充到指定的 select 元素中
     * @param {string} selectId select 元素的 ID
     * @param {number|string} [selectedCategory=''] 默认选中的分类ID
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async renderCategorySelect(selectId, selectedCategory = '') {
        const select = document.getElementById(selectId);
        if (!select) return;

        try {
            const categories = await CategoryData.getAllCategories();

            select.innerHTML = '<option value="">请选择分类</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                if (category.id.toString() === selectedCategory.toString()) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('渲染分类选择失败:', error);
            this.showMessage('加载分类失败，请刷新页面重试。', 'error');
        }
    },

    /**
     * 初始化图书表单
     * 渲染分类选择并填充编辑模式下的图书数据，绑定表单提交事件
     * @param {string} formId 表单元素的 ID
     * @param {Object} [book=null] 编辑模式下的图书数据，新增时为 null
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initBookForm(formId, book = null) {
        try {
            const form = document.getElementById(formId);
            if (!form) return;

            // 渲染分类选择
            await this.renderCategorySelect('category', book?.category?.id);

            // 如果是编辑模式，填充表单数据
            if (book) {
                const titleEl = document.getElementById('title');
                const authorEl = document.getElementById('author');
                const isbnEl = document.getElementById('isbn');
                const publishDateEl = document.getElementById('publishDate');
                const ratingEl = document.getElementById('rating');
                const descriptionEl = document.getElementById('description');
                const coverImageEl = document.getElementById('coverImage');
                const totalCopiesEl = document.getElementById('totalCopies');
                const availableCopiesEl = document.getElementById('availableCopies');

                if (titleEl) titleEl.value = book.title;
                if (authorEl) authorEl.value = book.author;
                if (isbnEl) isbnEl.value = book.isbn;
                if (publishDateEl) publishDateEl.value = book.publish_date ? book.publish_date.split('T')[0] : '';
                if (ratingEl) ratingEl.value = book.rating;
                if (descriptionEl) descriptionEl.value = book.description;
                if (coverImageEl) coverImageEl.value = book.cover_image || '';
                if (totalCopiesEl) totalCopiesEl.value = book.total_copies || 1;
                if (availableCopiesEl) availableCopiesEl.value = book.available_copies != null ? book.available_copies : '';
            }

            // 表单提交事件
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBookFormSubmit(form, book?.id);
            });
        } catch (error) {
            console.error('初始化图书表单失败:', error);
        }
    },

    /**
     * 处理图书表单提交
     * 收集表单数据并校验，调用 API 添加或更新图书
     * @param {HTMLFormElement} form 图书表单元素
     * @param {number|string|null} [bookId=null] 编辑模式下的图书ID，新增时为 null
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async handleBookFormSubmit(form, bookId = null) {
        try {
            const formData = new FormData(form);
            const bookData = {
                title: formData.get('title').trim(),
                author: formData.get('author').trim(),
                category: parseInt(formData.get('category')),
                isbn: formData.get('isbn').trim(),
                publish_date: formData.get('publishDate'),
                rating: formData.get('rating'),
                description: formData.get('description').trim(),
                cover_image: formData.get('coverImage').trim()
            };

            // 表单验证
            if (!bookData.title || !bookData.author || !bookData.category) {
                this.showMessage('请填写必填字段：书名、作者和分类。', 'error');
                return;
            }

            // 库存处理：仅当填写了总册数时才随请求提交，避免覆盖既有库存
            const totalCopiesRaw = formData.get('totalCopies');
            const availableCopiesRaw = formData.get('availableCopies');
            const hasInventoryInput = totalCopiesRaw !== '' && totalCopiesRaw !== null;

            if (hasInventoryInput) {
                const totalCopies = parseInt(totalCopiesRaw);
                // 可借册数缺省时默认等于总册数，且不能超过总册数
                let availableCopies = availableCopiesRaw !== '' && availableCopiesRaw !== null
                    ? parseInt(availableCopiesRaw)
                    : totalCopies;
                if (availableCopies > totalCopies) {
                    this.showMessage('可借册数不能大于总册数。', 'error');
                    return;
                }
                bookData.total_copies = totalCopies;
                bookData.available_copies = availableCopies;
            }

            let result;
            if (bookId) {
                // 更新图书
                result = await BookData.updateBook(bookId, bookData);
            } else {
                // 添加图书
                result = await BookData.addBook(bookData);
            }

            if (result) {
                this.showMessage(bookId ? '图书更新成功！' : '图书添加成功！', 'success');
                // 跳转到图书列表页
                setTimeout(() => {
                    window.location.href = '/books/';
                }, 1500);
            } else {
                this.showMessage(bookId ? '图书更新失败，请重试。' : '图书添加失败，请重试。', 'error');
            }
        } catch (error) {
            console.error('提交图书表单失败:', error);
            this.showMessage(bookId ? '图书更新失败，请重试。' : '图书添加失败，请重试。', 'error');
        }
    },

    /**
     * 打开模态框
     * 显示指定 ID 的模态框并禁止背景页面滚动
     * @param {string} modalId 模态框元素的 ID
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    openModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            }
        } catch (error) {
            console.error('打开模态框失败:', error);
        }
    },

    /**
     * 关闭模态框
     * 隐藏当前活动的模态框并恢复背景页面滚动
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    closeModal() {
        try {
            const modal = document.querySelector('.modal.active');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // 恢复背景滚动
            }
        } catch (error) {
            console.error('关闭模态框失败:', error);
        }
    },

    /**
     * 初始化首页
     * 更新首页统计数据
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initHomePage() {
        try {
            await this.updateStats();
        } catch (error) {
            console.error('初始化首页失败:', error);
        }
    },

    /**
     * 初始化图书列表页
     * 渲染图书列表并初始化过滤器
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initBooksPage() {
        try {
            // 渲染所有图书
            await this.renderBooks();

            // 初始化过滤器
            this.initBookFilters();
        } catch (error) {
            console.error('初始化图书列表页失败:', error);
        }
    },

    /**
     * 初始化图书过滤器
     * 渲染分类过滤选项并绑定分类、评分、重置等过滤事件
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initBookFilters() {
        try {
            const categoryFilter = document.getElementById('category-filter');
            const ratingFilter = document.getElementById('rating-filter');
            const resetFilter = document.getElementById('reset-filter');

            // 渲染分类过滤器选项
            await this.renderCategorySelect('category-filter');

            // 过滤器变化事件
            if (categoryFilter) {
                categoryFilter.addEventListener('change', async () => {
                    await this.applyFilters();
                });
            }

            if (ratingFilter) {
                ratingFilter.addEventListener('change', async () => {
                    await this.applyFilters();
                });
            }

            // 重置过滤器
            if (resetFilter) {
                resetFilter.addEventListener('click', async () => {
                    if (categoryFilter) categoryFilter.value = '';
                    if (ratingFilter) ratingFilter.value = '0';
                    await this.renderBooks();
                });
            }
        } catch (error) {
            console.error('初始化图书过滤器失败:', error);
        }
    },

    /**
     * 应用过滤器
     * 根据分类和评分过滤条件从后端获取图书并重新渲染
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async applyFilters() {
        try {
            const categoryFilter = document.getElementById('category-filter');
            const ratingFilter = document.getElementById('rating-filter');

            const category = categoryFilter ? categoryFilter.value : '';
            const minRating = ratingFilter ? parseFloat(ratingFilter.value) : 0;

            // 使用后端API进行过滤，提高性能
            const filteredBooks = await BookData.searchBooks('', category, minRating);

            // 重新渲染图书列表
            await this.renderBooks(filteredBooks);
        } catch (error) {
            console.error('应用过滤器失败:', error);
            this.showMessage('过滤图书失败，请重试。', 'error');
        }
    },

    /**
     * 初始化搜索结果页
     * 从 URL 参数中获取搜索条件，调用 API 搜索并渲染结果
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initSearchResultsPage() {
        try {
            // 获取URL参数
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('query') || '';
            const category = urlParams.get('category') || '';
            const minRating = parseFloat(urlParams.get('minRating')) || 0;

            // 执行搜索
            const results = await BookData.searchBooks(query, category, minRating);

            // 显示搜索结果数量
            const resultsCountEl = document.getElementById('results-count');
            if (resultsCountEl) {
                resultsCountEl.textContent = results.length;
            }

            // 显示搜索关键词
            const searchQueryEl = document.getElementById('search-query');
            if (searchQueryEl) {
                searchQueryEl.textContent = query;
            }

            // 渲染搜索结果
            await this.renderBooks(results);
        } catch (error) {
            console.error('搜索图书失败:', error);
            this.showMessage('搜索图书失败，请重试。', 'error');
        }
    },

    /**
     * 初始化图书详情页
     * 从 URL 中获取图书ID，加载详情数据并渲染页面
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initBookDetailPage() {
        try {
            // 获取图书ID
            let bookId;
            const urlParams = new URLSearchParams(window.location.search);
            const queryBookId = urlParams.get('id');

            if (queryBookId) {
                // 从查询参数获取ID (旧格式)
                bookId = queryBookId;
            } else {
                // 从URL路径获取ID (新格式)
                const pathSegments = window.location.pathname.split('/').filter(segment => segment);
                bookId = pathSegments[pathSegments.length - 1];
            }

            if (!bookId) return;

            const book = await BookData.getBookById(bookId);
            if (book) {
                this.renderBookDetail(book);
                this.setupBookDetailEventListeners(bookId);
            } else {
                // 图书不存在，显示错误信息
                const detailContainer = document.querySelector('.book-detail');
                if (detailContainer) {
                    // 转义 URL 传入的 bookId，防止反射型 XSS
                    detailContainer.innerHTML = `
                        <div class="no-results">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>图书不存在</h3>
                            <p>未找到ID为 ${escapeHtml(bookId)} 的图书。</p>
                            <a href="/books/" class="btn btn-primary">返回图书列表</a>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('获取图书详情失败:', error);
            const detailContainer = document.querySelector('.book-detail');
            if (detailContainer) {
                let message = '图书数据加载失败，请刷新页面重试。';
                let title = '加载失败';
                if (error.message.includes('404')) {
                    title = '图书不存在';
                    // 转义 URL 传入的 bookId，防止反射型 XSS
                    message = `未找到ID为 ${escapeHtml(bookId)} 的图书。`;
                }
                detailContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(message)}</p>
                        <a href="/books/" class="btn btn-primary">返回图书列表</a>
                    </div>
                `;
            }
        }
    },

    /**
     * 渲染图书详情
     * 根据图书对象生成图书详情页的 HTML 内容
     * @param {Object} book 图书对象
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    renderBookDetail(book) {
        try {
            const detailContainer = document.querySelector('.book-detail');
            if (detailContainer) {
                // 对所有用户可控字段进行 HTML 转义，防止存储型 XSS
                const bookId = escapeHtml(book.id);
                const title = escapeHtml(book.title);
                const author = escapeHtml(book.author);
                const categoryName = escapeHtml(book.category && book.category.name);
                const isbn = escapeHtml(book.isbn);
                const description = escapeHtml(book.description);
                const coverImage = book.cover_image ? escapeHtml(book.cover_image) : '';
                const publishDate = book.publish_date ? new Date(book.publish_date).toLocaleDateString() : '未知';
                // 综合评分：有用户评分时优先展示用户评分，否则展示管理员预设评分
                const displayRating = (book.avg_rating != null && book.review_count > 0)
                    ? parseFloat(book.avg_rating).toFixed(1)
                    : parseFloat(book.rating).toFixed(1);
                const totalCopies = Number(book.total_copies) || 1;
                const availableCopies = Number(book.available_copies) || 0;

                // 根据用户角色与库存生成操作按钮
                let userData = null;
                try {
                    userData = JSON.parse(localStorage.getItem('user'));
                } catch (e) { /* 忽略解析错误 */ }
                const isAdmin = userData && userData.user_type === 'admin';

                let actionsHtml = '';
                if (!userData) {
                    // 游客：提示登录后可借阅
                    actionsHtml = `
                        <a href="/login/" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt"></i> 登录后借阅
                        </a>
                        <a href="/book-preview/" class="btn btn-secondary">
                            <i class="fas fa-arrow-left"></i> 返回列表
                        </a>
                    `;
                } else if (isAdmin) {
                    // 管理员：编辑/删除
                    actionsHtml = `
                        <a href="/edit-book/${bookId}/" class="btn btn-primary">
                            <i class="fas fa-edit"></i> 编辑图书
                        </a>
                        <button class="btn btn-danger delete-btn" data-id="${bookId}">
                            <i class="fas fa-trash"></i> 删除图书
                        </button>
                        <a href="/books/" class="btn btn-secondary">
                            <i class="fas fa-arrow-left"></i> 返回列表
                        </a>
                    `;
                } else {
                    // 普通用户：借阅
                    actionsHtml = availableCopies > 0
                        ? `<button class="btn btn-primary borrow-btn" data-id="${bookId}">
                                <i class="fas fa-book-open"></i> 借阅图书
                           </button>`
                        : `<button class="btn btn-primary btn-disabled" disabled>
                                <i class="fas fa-book-open"></i> 暂无库存
                           </button>`;
                    actionsHtml += `
                        <a href="/user-books/" class="btn btn-secondary">
                            <i class="fas fa-arrow-left"></i> 返回列表
                        </a>
                    `;
                }

                detailContainer.innerHTML = `
                    <div class="book-detail-image">
                        ${coverImage ? `<img src="${coverImage}" alt="${title}">` : '<i class="fas fa-book"></i>'}
                    </div>
                    <div class="book-detail-content">
                        <h1>${title}</h1>
                        <p class="book-detail-author">${author}</p>
                        <div class="book-detail-meta">
                            <div class="meta-item">
                                <span class="meta-label">分类</span>
                                <span class="meta-value">${categoryName}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">ISBN</span>
                                <span class="meta-value">${isbn}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">出版日期</span>
                                <span class="meta-value">${publishDate}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">评分</span>
                                <span class="meta-value">
                                    <i class="fas fa-star" style="color: var(--accent-color);"></i>
                                    ${displayRating}
                                    ${book.review_count > 0 ? `<small>(${escapeHtml(book.review_count)} 条评价)</small>` : ''}
                                </span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">库存</span>
                                <span class="meta-value">
                                    ${availableCopies > 0
                                        ? `<span class="stock-available">可借 ${availableCopies} / ${totalCopies} 本</span>`
                                        : '<span class="stock-empty">暂时无库存</span>'}
                                </span>
                            </div>
                        </div>
                        <div class="book-detail-description">
                            <h3>内容简介</h3>
                            <p>${description}</p>
                        </div>
                        <div class="book-detail-actions">
                            ${actionsHtml}
                        </div>
                    </div>
                    <!-- 书评区域（动态渲染） -->
                    <div class="book-detail-reviews" id="reviews-section">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                `;
                // 异步加载书评
                this.renderBookReviews(book.id);
            }
        } catch (error) {
            console.error('渲染图书详情失败:', error);
        }
    },

    /**
     * 渲染图书书评区域
     * 展示评论列表与评分表单；未登录用户仅可查看评论
     * @param {number|string} bookId 图书ID
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async renderBookReviews(bookId) {
        try {
            const section = document.getElementById('reviews-section');
            if (!section) return;

            const reviews = await BookReviewData.getReviews(bookId);
            const userJson = localStorage.getItem('user');
            let userData = null;
            try { userData = JSON.parse(userJson); } catch (e) { /* 忽略解析错误 */ }

            let reviewsHtml = '';
            if (reviews.length > 0) {
                reviewsHtml = reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-user">
                                <i class="fas fa-user"></i> ${escapeHtml(review.user && review.user.username)}
                            </span>
                            <span class="review-rating">
                                <i class="fas fa-star"></i> ${escapeHtml(parseFloat(review.rating).toFixed(1))} 分
                            </span>
                            <span class="review-time">${escapeHtml(new Date(review.created_at).toLocaleDateString())}</span>
                        </div>
                        ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ''}
                    </div>
                `).join('');
            } else {
                reviewsHtml = `<p class="review-empty">暂无评论，快来抢沙发吧～</p>`;
            }

            // 评分表单（仅登录用户可提交）
            const reviewFormHtml = userData ? `
                <div class="review-form">
                    <h4>发表评分与评论</h4>
                    <div class="review-form-row">
                        <label>评分：</label>
                        <select id="review-rating">
                            <option value="5">5 分</option>
                            <option value="4">4 分</option>
                            <option value="3">3 分</option>
                            <option value="2">2 分</option>
                            <option value="1">1 分</option>
                        </select>
                    </div>
                    <textarea id="review-comment" placeholder="分享你的读后感（选填）"></textarea>
                    <button class="btn btn-primary" id="submit-review-btn">
                        <i class="fas fa-paper-plane"></i> 提交评价
                    </button>
                </div>
            ` : `<p class="review-login-tip"><a href="/login/">登录</a>后即可参与评分与评论</p>`;

            section.innerHTML = `
                <h3 class="reviews-title">读者评价 (${escapeHtml(reviews.length)})</h3>
                <div class="reviews-list">${reviewsHtml}</div>
                ${reviewFormHtml}
            `;

            // 绑定提交评价事件
            const submitBtn = document.getElementById('submit-review-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', async () => {
                    try {
                        const rating = document.getElementById('review-rating').value;
                        const comment = document.getElementById('review-comment').value.trim();
                        await BookReviewData.addOrUpdateReview(bookId, rating, comment);
                        this.showMessage('评价提交成功！', 'success');
                        // 重新渲染书评
                        await this.renderBookReviews(bookId);
                        // 刷新图书信息（评分变化）
                        try {
                            const book = await BookData.getBookById(bookId);
                            if (book) this.renderBookDetail(book);
                        } catch (refreshError) {
                            console.warn('刷新图书信息失败:', refreshError);
                        }
                    } catch (error) {
                        this.showMessage(error.message || '提交评价失败', 'error');
                    }
                });
            }
        } catch (error) {
            console.error('渲染书评失败:', error);
            const section = document.getElementById('reviews-section');
            if (section) {
                section.innerHTML = `<p class="review-empty">评论加载失败</p>`;
            }
        }
    },

    /**
     * 设置图书详情页事件监听器
     * 为删除按钮绑定删除确认事件
     * @param {number|string} bookId 图书ID
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    setupBookDetailEventListeners(bookId) {
        try {
            const deleteBtn = document.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.showDeleteConfirmation(bookId);
                });
            }

            // 普通用户借阅按钮
            const borrowBtn = document.querySelector('.book-detail-actions .borrow-btn');
            if (borrowBtn) {
                borrowBtn.addEventListener('click', async () => {
                    try {
                        await BorrowRecordData.borrow(bookId);
                        this.showMessage('图书借阅成功！', 'success');
                        // 刷新图书详情（库存变化）
                        setTimeout(async () => {
                            try {
                                const book = await BookData.getBookById(bookId);
                                if (book) {
                                    this.renderBookDetail(book);
                                    this.setupBookDetailEventListeners(bookId);
                                }
                            } catch (refreshError) {
                                console.warn('刷新图书详情失败:', refreshError);
                            }
                        }, 1500);
                    } catch (error) {
                        console.error('借阅图书失败:', error);
                        this.showMessage(error.message || '借阅图书失败，请稍后重试。', 'error');
                    }
                });
            }
        } catch (error) {
            console.error('设置图书详情页事件监听器失败:', error);
        }
    },

    /**
     * 初始化分类管理页
     * 渲染分类列表并初始化添加分类表单
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    async initCategoriesPage() {
        try {
            // 渲染分类列表
            await this.renderCategories();

            // 初始化添加分类表单
            this.initAddCategoryForm();
        } catch (error) {
            console.error('初始化分类管理页失败:', error);
        }
    },

    /**
     * 初始化添加分类表单
     * 绑定表单提交事件，提交时调用 API 添加分类
     * @returns {void} 无返回值
     * @throws {Error} 不会抛出异常，内部已捕获所有可预见错误
     */
    initAddCategoryForm() {
        try {
            const form = document.getElementById('add-category-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const categoryData = {
                        name: formData.get('name').trim(),
                        description: formData.get('description').trim()
                    };

                    if (!categoryData.name) {
                        this.showMessage('请填写分类名称。', 'error');
                        return;
                    }

                    try {
                        const result = await CategoryData.addCategory(categoryData);
                        if (result) {
                            this.showMessage('分类添加成功！', 'success');
                            form.reset(); // 重置表单
                            await this.renderCategories(); // 重新渲染分类列表
                            await this.updateStats(); // 更新统计数据
                        } else {
                            this.showMessage('分类名称已存在，请使用其他名称。', 'error');
                        }
                    } catch (error) {
                        console.error('添加分类失败:', error);
                        this.showMessage('添加分类失败，请重试。', 'error');
                    }
                });
            }
        } catch (error) {
            console.error('初始化添加分类表单失败:', error);
        }
    }
};

/**
 * 页面加载完成后初始化UI
 * 根据当前页面路径调用对应的页面初始化方法
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await UI.init();

        // 根据当前页面初始化特定功能
        const currentPage = window.location.pathname;

        if (currentPage.includes('index.html') || currentPage === '/') {
            await UI.initHomePage();
        } else if (currentPage.includes('books.html') || currentPage.includes('/books/')) {
            await UI.initBooksPage();
        } else if (currentPage.includes('add-book.html') || currentPage.includes('/add-book/')) {
            await UI.initBookForm('add-book-form');
        } else if (currentPage.includes('search-results.html') || currentPage.includes('/search-results/')) {
            await UI.initSearchResultsPage();
        } else if (currentPage.includes('book-detail.html') || currentPage.includes('/book-detail/')) {
            await UI.initBookDetailPage();
        } else if (currentPage.includes('categories.html') || currentPage.includes('/categories/')) {
            await UI.initCategoriesPage();
        } else if (currentPage.includes('edit-book.html') || currentPage.includes('/edit-book/')) {
            // 从URL路径中提取ID
            const pathSegments = window.location.pathname.split('/').filter(segment => segment);
            const bookId = pathSegments[pathSegments.length - 1];
            if (bookId) {
                try {
                    const book = await BookData.getBookById(bookId);
                    if (book) {
                        await UI.initBookForm('edit-book-form', book);
                    }
                } catch (error) {
                    console.error('初始化编辑表单失败:', error);
                    UI.showMessage('加载图书数据失败，请刷新页面重试。', 'error');
                }
            }
        }
    } catch (error) {
        console.error('页面加载完成后初始化UI失败:', error);
    }
});