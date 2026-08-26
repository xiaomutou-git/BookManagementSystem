# -*- coding: utf-8 -*-
"""Django 后台管理注册：便于管理员通过 /admin/ 快速维护业务数据"""
from django.contrib import admin
from .models import Category, Book, UserProfile, BorrowRecord, BookReview, ActionLog


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """分类管理：按名称搜索，按创建时间倒序展示"""
    list_display = ['id', 'name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    """图书管理：支持标题/作者/ISBN 搜索与库存、评分列表展示"""
    list_display = ['id', 'title', 'author', 'category', 'rating',
                    'total_copies', 'available_copies', 'created_at']
    list_filter = ['category']
    search_fields = ['title', 'author', 'isbn']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """用户资料管理：展示用户类型与联系方式"""
    list_display = ['id', 'user', 'user_type', 'phone', 'created_at']
    list_filter = ['user_type']
    search_fields = ['user__username']


@admin.register(BorrowRecord)
class BorrowRecordAdmin(admin.ModelAdmin):
    """借阅记录管理：展示借还状态、应还日期，支持按状态/用户筛选"""
    list_display = ['id', 'user', 'book', 'status', 'borrow_date', 'due_date', 'return_date']
    list_filter = ['status']
    search_fields = ['user__username', 'book__title']


@admin.register(BookReview)
class BookReviewAdmin(admin.ModelAdmin):
    """书评管理：展示评分与评论内容"""
    list_display = ['id', 'user', 'book', 'rating', 'comment', 'created_at']
    list_filter = ['rating']
    search_fields = ['user__username', 'book__title']


@admin.register(ActionLog)
class ActionLogAdmin(admin.ModelAdmin):
    """操作日志管理：展示全部操作记录"""
    list_display = ['id', 'user', 'action_type', 'object_type', 'object_id',
                    'description', 'ip_address', 'created_at']
    list_filter = ['action_type']
    search_fields = ['user__username', 'description']
    # 日志只读，禁止在后台增改删
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
