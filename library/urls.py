from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, BookViewSet, get_stats,
    UserProfileViewSet, BorrowRecordViewSet, ActionLogViewSet,
    BookReviewViewSet,
    login_view, logout_view, register_view, get_current_user
)

# 创建路由
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'books', BookViewSet, basename='book')
router.register(r'user-profiles', UserProfileViewSet, basename='user-profile')
router.register(r'borrow-records', BorrowRecordViewSet, basename='borrow-record')
router.register(r'action-logs', ActionLogViewSet, basename='action-log')
router.register(r'reviews', BookReviewViewSet, basename='review')

urlpatterns = [
    # API路由
    path('', include(router.urls)),
    # 统计信息路由
    path('stats/', get_stats, name='get_stats'),
    # 认证路由
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('register/', register_view, name='register'),
    path('current-user/', get_current_user, name='current-user'),
]