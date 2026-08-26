# Django 图书管理系统

一个基于 **Django + Django REST Framework + SQLite** 的完整图书管理系统，支持图书 / 分类管理、在线借阅归还、库存控制、书评评分、按角色（游客 / 普通用户 / 管理员）的动态界面，以及登录防暴力破解、权限控制等安全能力。

---

## 功能特性

### 图书与分类
- 图书增删改查、按书名 / 作者 / ISBN / 简介模糊搜索
- 按分类、最低评分过滤
- **库存管理**：每本书记录总册数与可借册数，借阅自动扣减、归还自动回补，防止超卖
- 分类内展示图书数量

### 借阅与归还
- 在线借阅 / 归还图书，自动生成应还日期（默认 30 天）
- **逾期检测**：展示应还日期、逾期天数与逾期状态
- 同一本书未归还时禁止重复借阅；库存不足时禁止借阅
- 使用数据库行锁 + 事务保证并发下库存一致

### 书评与评分
- 登录用户可对图书评分（0 ~ 5）并发表评论
- 每位用户对同一本书仅保留一条评论（重复提交自动更新）
- 图书详情页展示平均评分与评论列表

### 角色化界面与权限
- **游客**：浏览图书、搜索、查看详情
- **普通用户**：借阅 / 归还、查看借阅记录、评分评论、用户中心
- **管理员**：图书与分类管理、查看借阅记录、操作日志
- 前端导航按角色动态生成；后端对未授权操作返回 401 / 403

### 安全加固
- 登录防暴力破解：单 IP 连续失败锁定，基于**共享缓存**实现（支持多进程 / Redis）
- 密码强度校验；所有用户可控字段在前端均做 **XSS 转义**
- 管理员密码通过环境变量注入，不硬编码；SECRET_KEY / DEBUG / CORS 均由环境变量配置
- 越权防护：普通用户不可自我提权为管理员，不可访问他人数据

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Django 4.2、Django REST Framework 3.16 |
| 数据库 | SQLite（默认），可平滑切换至 MySQL / PostgreSQL / Redis 缓存 |
| 认证 | Token 认证（`rest_framework.authtoken`） |
| 跨域 | django-cors-headers |
| 前端 | 原生 HTML + CSS + JavaScript（无构建工具，服务端直接渲染） |

---

## 目录结构

```
Django图书管理系统/
├── manage.py                 # Django 管理入口
├── requirements.txt          # 依赖清单
├── .gitignore                # Git 忽略规则
├── library/                  # 核心应用
│   ├── models.py             # 数据模型：Category/Book/UserProfile/BorrowRecord/BookReview/ActionLog
│   ├── views.py              # 视图与 API 逻辑（含登录限流、权限类）
│   ├── serializers.py        # 序列化器
│   ├── urls.py               # API 路由
│   ├── admin.py              # Django 后台注册
│   ├── tests.py              # 自动化测试
│   ├── migrations/           # 数据库迁移
│   └── management/commands/initadmin.py   # 初始化管理员命令
├── library_system/           # 项目配置
│   ├── settings.py           # 全局配置（缓存、CORS、REST 框架等）
│   ├── urls.py               # 页面与静态资源路由
│   ├── asgi.py / wsgi.py     # 部署入口
├── css/style.css             # 全局样式（清新科技蓝）
├── js/
│   ├── data.js               # 数据请求模块（统一 API 封装）
│   ├── ui.js                 # 页面渲染与交互
│   └── main.js               # 页面初始化、导航、访问控制
└── *.html                    # 前端页面（首页/图书预览/图书管理/借阅记录等）
```

---

## 快速开始

### 1. 环境要求
- Python 3.10+
- pip

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 数据库迁移与缓存表
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createcachetable
```

### 4. 初始化管理员账号（可选）
```bash
# 方式一：通过环境变量指定账号密码（推荐）
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='YourStrongPassword!'
python manage.py initadmin

# 方式二：不设置密码，将自动生成 20 位随机强密码并打印到控制台
python manage.py initadmin
```

### 5. 启动服务
```bash
python manage.py runserver
```

访问 http://127.0.0.1:8000/ ，用管理员账号登录即可进入系统。

---

## 环境变量配置

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django 密钥 | 本地开发默认值 |
| `DJANGO_DEBUG` | Debug 开关（生产须为 `False`） | `True` |
| `DJANGO_ALLOWED_HOSTS` | 允许访问的主机（逗号分隔） | `*` |
| `CORS_ALLOWED_ORIGINS` | 允许跨域的来源（逗号分隔） | `http://localhost:8000` 等 |
| `ADMIN_USERNAME` | 初始化管理员用户名 | `root` |
| `ADMIN_PASSWORD` | 初始化管理员密码 | 自动生成随机密码 |
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `DJANGO_CACHE_BACKEND` | 缓存后端（`db` / `redis`） | `db` |
| `DJANGO_REDIS_URL` | 使用 Redis 时的连接地址 | `redis://127.0.0.1:6379/1` |

> 生产部署建议：`DJANGO_DEBUG=False`、使用强 `DJANGO_SECRET_KEY`、配置 `DJANGO_ALLOWED_HOSTS` 与 `CORS_ALLOWED_ORIGINS`，并可按需开启 **Redis** 缓存以提升限流并发能力。

---

## API 一览

| 方法 | 地址 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/api/login/` | 登录（含限流） | 公开 |
| POST | `/api/logout/` | 登出 | 登录 |
| POST | `/api/register/` | 注册 | 公开 |
| GET | `/api/current-user/` | 获取当前用户信息 | 登录 |
| GET | `/api/stats/` | 首页统计数据 | 公开 |
| GET/POST | `/api/books/` | 图书列表 / 创建 | 读公开，写管理员 |
| GET/PUT/DELETE | `/api/books/{id}/` | 图书详情 / 更新 / 删除 | 读公开，写管理员 |
| GET/POST | `/api/categories/` | 分类列表 / 创建 | 读公开，写管理员 |
| GET/POST | `/api/borrow-records/` | 借阅记录（借阅） | 登录（仅本人） |
| POST | `/api/borrow-records/{id}/return_book/` | 归还图书 | 登录（仅本人） |
| GET/POST | `/api/reviews/` | 书评列表 / 提交评分评论 | 读公开，写登录 |
| GET | `/api/action-logs/` | 操作日志 | 管理员 |

---

## 自动化测试

```bash
python manage.py test library -v 2
```

测试覆盖：安全权限控制（未认证 / 普通用户越权 / 提权防护 / 弱密码注册）、借阅库存业务（扣减 / 回补 / 重复借阅 / 库存不足 / 逾期判断 / 图书被删归还）、书评评分（校验 / 去重更新）等。

---

## 使用说明

1. **游客**：可直接浏览图书与搜索，登录后可借阅。
2. **普通用户**：在「用户中心」「我的借阅」中借书、还书、查看逾期情况；在图书详情页评分评论。
3. **管理员**：通过「图书列表」「添加图书」「分类管理」维护馆藏；可查看全部借阅记录与操作日志。

---

## 开源说明

本项目用于学习与演示，代码遵循 Python 与 Web 开发常见最佳实践。如需在生产环境使用，请结合实际情况完成安全审计（HTTPS、密钥管理、备份策略等）。