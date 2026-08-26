"""
URL configuration for library_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
import os
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 登录页面
    path('login/', TemplateView.as_view(template_name='login.html')),
    # 首页
    path('', TemplateView.as_view(template_name='index.html')),
    
    # 静态HTML页面路由（公开页面）
    path('index.html', TemplateView.as_view(template_name='index.html')),
    path('book-preview/', TemplateView.as_view(template_name='book-preview.html')),
    path('book-preview.html', TemplateView.as_view(template_name='book-preview.html')),
    
    # 静态HTML页面路由（管理员端）
    path('books/', TemplateView.as_view(template_name='books.html')),
    path('books.html', TemplateView.as_view(template_name='books.html')),
    path('add-book/', TemplateView.as_view(template_name='add-book.html')),
    path('add-book.html', TemplateView.as_view(template_name='add-book.html')),
    path('edit-book/<str:id>/', TemplateView.as_view(template_name='edit-book.html')),
    path('book-detail/<str:id>/', TemplateView.as_view(template_name='book-detail.html')),
    path('search-results/', TemplateView.as_view(template_name='search-results.html')),
    path('search-results.html', TemplateView.as_view(template_name='search-results.html')),
    path('categories/', TemplateView.as_view(template_name='categories.html')),
    path('categories.html', TemplateView.as_view(template_name='categories.html')),
    
    # 用户端页面路由
    path('user-home/', TemplateView.as_view(template_name='user-home.html')),
    path('user-dashboard/', TemplateView.as_view(template_name='user-dashboard.html')),
    path('user-books/', TemplateView.as_view(template_name='user-books.html')),
    path('user-borrow-records/', TemplateView.as_view(template_name='user-borrow-records.html')),
    
    # 包含library应用的URL（API路由）
    path('api/', include('library.urls')),
    
    # 直接从根路径提供CSS和JS文件
    path('css/<path:path>', serve, {'document_root': os.path.join(settings.BASE_DIR, 'css')}),
    path('js/<path:path>', serve, {'document_root': os.path.join(settings.BASE_DIR, 'js')}),
]

# 开发环境静态文件配置
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static('/css/', document_root=os.path.join(settings.BASE_DIR, 'css'))
    urlpatterns += static('/js/', document_root=os.path.join(settings.BASE_DIR, 'js'))
