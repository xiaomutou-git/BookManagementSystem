// 图书管理系统 - 数据管理模块

// API基础URL
const API_BASE_URL = '/api';

// 通用API请求函数
async function apiRequest(endpoint, options = {}) {
    try {
        // 自动附加认证令牌（若已登录），保证需要权限的接口可用
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Token ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers,
            ...options
        });

        // 优先提取后端返回的友好错误信息（detail/error），否则回退到状态码描述
        if (!response.ok) {
            let message = `API请求失败: ${response.status} ${response.statusText}`;
            try {
                const data = await response.json();
                if (data && (data.detail || data.error)) {
                    message = data.detail || data.error;
                }
            } catch (e) { /* 响应体非 JSON 时忽略 */ }
            throw new Error(message);
        }

        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 图书数据管理
const BookData = {
    // 获取所有图书
    async getAllBooks() {
        return await apiRequest('/books/');
    },

    // 根据ID获取图书
    async getBookById(id) {
        return await apiRequest(`/books/${id}/`);
    },

    // 添加图书
    async addBook(book) {
        return await apiRequest('/books/', {
            method: 'POST',
            body: JSON.stringify(book)
        });
    },

    // 更新图书
    async updateBook(id, updatedBook) {
        return await apiRequest(`/books/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(updatedBook)
        });
    },

    // 删除图书
    async deleteBook(id) {
        await apiRequest(`/books/${id}/`, {
            method: 'DELETE'
        });
        return true;
    },

    // 搜索图书
    async searchBooks(query, category = '', minRating = 0) {
        let url = '/books/?';
        const params = new URLSearchParams();
        
        if (query) params.append('q', query);
        if (category) params.append('category', category);
        if (minRating) params.append('min_rating', minRating);
        
        return await apiRequest(`${url}${params.toString()}`);
    },

    // 获取图书统计信息
    async getStats() {
        return await apiRequest('/stats/');
    }
};

// 分类数据管理
const CategoryData = {
    // 获取所有分类
    async getAllCategories() {
        return await apiRequest('/categories/');
    },
    // 根据ID获取分类
    async getCategoryById(id) {
        return await apiRequest(`/categories/${id}/`);
    },

    // 根据名称获取分类
    async getCategoryByName(name) {
        const categories = await this.getAllCategories();
        return categories.find(category => category.name === name);
    },

    // 添加分类
    async addCategory(category) {
        return await apiRequest('/categories/', {
            method: 'POST',
            body: JSON.stringify(category)
        });
    },

    // 更新分类
    async updateCategory(id, updatedCategory) {
        return await apiRequest(`/categories/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(updatedCategory)
        });
    },

    // 删除分类
    async deleteCategory(id) {
        try {
            await apiRequest(`/categories/${id}/`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('删除分类失败:', error);
            return false;
        }
    }
};

/**
 * 解包分页响应（DRF PageNumberPagination）
 * 兼容两种返回结构：普通数组 或 {count, next, previous, results}
 * @param {object|Array} data 接口返回的原始数据
 * @returns {Array} 解包后的列表数组
 */
function unwrapList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
}

// 借阅记录数据管理
const BorrowRecordData = {
    /**
     * 获取当前用户的借阅记录
     * @param {string} [status=''] 状态过滤（borrowed/returned），空为全部
     * @returns {Promise<Array>} 借阅记录数组
     * @throws {Error} 请求失败或未登录时抛出
     */
    async getRecords(status = '') {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('用户未登录');
        // 复用统一 apiRequest：自动附加认证 token 并统一错误处理
        let url = '/borrow-records/?';
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        const data = await apiRequest(`${url}${params.toString()}`);
        return unwrapList(data);
    },

    /**
     * 借阅图书
     * @param {number} bookId 图书ID
     * @returns {Promise<object>} 创建成功的借阅记录
     * @throws {Error} 库存不足/重复借阅/未登录等时抛出
     */
    async borrow(bookId) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('用户未登录');
        const response = await fetch('/api/borrow-records/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ book: bookId, status: 'borrowed' })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.detail || data.error || '借阅失败');
        }
        return data;
    },

    /**
     * 归还图书
     * @param {number} recordId 借阅记录ID
     * @returns {Promise<object>} 归还结果
     * @throws {Error} 归还失败时抛出
     */
    async returnBook(recordId) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('用户未登录');
        const response = await fetch(`/api/borrow-records/${recordId}/return_book/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || data.detail || '归还失败');
        }
        return data;
    }
};

// 书评/评分数据管理
const BookReviewData = {
    /**
     * 获取某本书的评论列表
     * @param {number} bookId 图书ID
     * @returns {Promise<Array>} 评论数组（含用户信息）
     * @throws {Error} 请求失败时抛出
     */
    async getReviews(bookId) {
        const response = await fetch(`/api/reviews/?book=${bookId}`);
        if (!response.ok) throw new Error('获取评论失败');
        const data = await response.json();
        return unwrapList(data);
    },

    /**
     * 提交或更新当前用户对某本书的评分评论
     * 同一用户对同一本书仅保留一条，重复提交会更新
     * @param {number} bookId 图书ID
     * @param {number} rating 评分（0-5）
     * @param {string} comment 评论内容
     * @returns {Promise<object>} 保存成功的评论
     * @throws {Error} 未登录或校验失败时抛出
     */
    async addOrUpdateReview(bookId, rating, comment) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('用户未登录');
        const response = await fetch('/api/reviews/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ book: bookId, rating: rating, comment: comment })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errors = Object.values(data).flat().join('；');
            throw new Error(errors || '提交评论失败');
        }
        return data;
    }
};