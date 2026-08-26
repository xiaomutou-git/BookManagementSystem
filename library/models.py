from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# Create your models here.

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='books')
    isbn = models.CharField(max_length=20, blank=True, null=True)
    publish_date = models.DateField(blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    description = models.TextField(blank=True, null=True)
    cover_image = models.URLField(blank=True, null=True)
    # 库存字段：total_copies 总册数，available_copies 当前可借册数
    total_copies = models.PositiveIntegerField(default=1, verbose_name='总册数')
    available_copies = models.PositiveIntegerField(default=1, verbose_name='可借册数')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='books')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

# 用户资料模型，扩展Django默认User模型
class UserProfile(models.Model):
    USER_TYPE_CHOICES = (
        ('admin', '管理员'),
        ('user', '普通用户'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='user')
    phone = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - {self.user_type}'

# 借阅记录模型
class BorrowRecord(models.Model):
    STATUS_CHOICES = (
        ('borrowed', '已借阅'),
        ('returned', '已归还'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrow_records')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    borrow_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(blank=True, null=True, verbose_name='应还日期')
    return_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='borrowed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_overdue(self):
        """
        判断借阅记录是否逾期
        仅未归还且当前时间超过应还日期时视为逾期
        @return bool: 是否逾期
        """
        if self.status == 'borrowed' and self.due_date:
            return timezone.now() > self.due_date
        return False

    @property
    def overdue_days(self):
        """
        计算逾期天数
        @return int: 逾期天数，未逾期返回 0
        """
        if self.is_overdue and self.due_date:
            return (timezone.now() - self.due_date).days
        return 0

    def __str__(self):
        return f'{self.user.username} - {self.book.title} - {self.status}'


# 图书评论/评分模型
class BookReview(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='book_reviews')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=5.0, verbose_name='评分')
    comment = models.TextField(blank=True, null=True, verbose_name='评论内容')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # 同一用户对同一本书只能有一条评分/评论
        unique_together = ('user', 'book')

    def __str__(self):
        return f'{self.user.username} - {self.book.title} - {self.rating}'

# 操作日志模型
class ActionLog(models.Model):
    ACTION_TYPE_CHOICES = (
        ('login', '登录'),
        ('logout', '登出'),
        ('borrow', '借阅'),
        ('return', '归还'),
        ('search', '搜索'),
        ('create', '创建'),
        ('edit', '编辑'),
        ('delete', '删除'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_logs')
    action_type = models.CharField(max_length=10, choices=ACTION_TYPE_CHOICES)
    object_type = models.CharField(max_length=50, blank=True, null=True)
    object_id = models.PositiveIntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.action_type} - {self.created_at}'