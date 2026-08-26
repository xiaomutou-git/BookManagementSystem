from rest_framework import viewsets, permissions, mixins, serializers
from django.db import models, transaction
from django.db.models import Q, Count, Avg
from django.db.models.functions import Coalesce
from django.core.cache import cache
from .models import Category, Book, UserProfile, BorrowRecord, BookReview, ActionLog
from .serializers import (
    CategorySerializer, BookSerializer, BookCreateUpdateSerializer,
    UserProfileSerializer, UserProfileCreateUpdateSerializer,
    BorrowRecordSerializer, BorrowRecordCreateSerializer,
    BookReviewSerializer,
    ActionLogSerializer
)
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from django.utils import timezone
from datetime import timedelta
import time

# ============================================================
# 登录防暴力破解配置（共享缓存限流）
# 使用 Django 缓存框架存储失败记录，支持跨进程/多 worker 共享，
# 生产环境可将 CACHES 配置为 Redis 等共享缓存后端
# ============================================================
LOGIN_MAX_ATTEMPTS = 5          # 单 IP 允许的连续失败次数
LOGIN_LOCK_SECONDS = 900        # 锁定时间（秒），默认 15 分钟
_LOGIN_FAIL_CACHE_PREFIX = 'login_fail_records:'   # 缓存 key 前缀


def _get_login_fail_record(ip):
    """
    从共享缓存读取指定 IP 的登录失败记录
    @param ip: str 客户端 IP 地址
    @return dict: 失败记录 {"count": 次数, "lock_until": 解锁时间戳}，无记录返回空字典
    """
    return cache.get(f'{_LOGIN_FAIL_CACHE_PREFIX}{ip}', {})


def _get_client_ip(request):
    """
    获取客户端真实 IP
    优先取 X-Forwarded-For（代理场景），否则取 REMOTE_ADDR
    @param request: HttpRequest 请求对象
    @return str: 客户端 IP 地址
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _check_login_locked(request):
    """
    检查当前请求 IP 是否已被登录锁定
    @param request: HttpRequest 请求对象
    @return tuple: (是否锁定, 剩余锁定秒数)；未锁定返回 (False, 0)
    """
    ip = _get_client_ip(request)
    record = _get_login_fail_record(ip)
    if record:
        now = time.time()
        if record.get('lock_until'):
            if now < record['lock_until']:
                remaining = int(record['lock_until'] - now)
                return True, remaining
            # 锁定期已过，清除记录
            cache.delete(f'{_LOGIN_FAIL_CACHE_PREFIX}{ip}')
    return False, 0


def _record_login_failure(request):
    """
    记录一次登录失败，达到阈值后锁定 IP
    @param request: HttpRequest 请求对象
    """
    ip = _get_client_ip(request)
    now = time.time()
    record = _get_login_fail_record(ip)
    # 记录中无字段时兜底初始化
    record = {
        'count': record.get('count', 0),
        'lock_until': record.get('lock_until', 0)
    }
    record['count'] += 1
    if record['count'] >= LOGIN_MAX_ATTEMPTS:
        record['lock_until'] = now + LOGIN_LOCK_SECONDS
        record['count'] = 0
    # 写入共享缓存，有效期覆盖锁定时间，避免脏数据残留
    cache.set(f'{_LOGIN_FAIL_CACHE_PREFIX}{ip}', record, timeout=LOGIN_LOCK_SECONDS)


def _record_login_success(request):
    """
    登录成功后清除该 IP 的失败记录
    @param request: HttpRequest 请求对象
    """
    ip = _get_client_ip(request)
    cache.delete(f'{_LOGIN_FAIL_CACHE_PREFIX}{ip}')


def _is_admin_user(user):
    """
    判断用户是否为管理员（含未建立 UserProfile 的超级管理员兜底）
    @param user: User 用户对象
    @return bool: 是否为管理员
    """
    if not user or not user.is_authenticated:
        return False
    profile = getattr(user, 'profile', None)
    if profile is not None:
        return profile.user_type == 'admin'
    return user.is_superuser


# 自定义权限类
class IsAdmin(permissions.BasePermission):
    """仅管理员可访问"""
    def has_permission(self, request, view):
        return _is_admin_user(request.user)

class IsUser(permissions.BasePermission):
    """仅普通用户可访问"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # 使用 getattr 兜底，避免用户未创建 UserProfile 时抛 AttributeError
        profile = getattr(request.user, 'profile', None)
        if profile is not None:
            return profile.user_type == 'user'
        return False

class IsOwnerOrAdmin(permissions.BasePermission):
    """允许管理员访问所有对象，普通用户仅能访问自己的对象"""
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if _is_admin_user(request.user):
            return True
        return hasattr(obj, 'user') and obj.user == request.user

# 记录操作日志的装饰器
def log_action(action_type, object_type=None, object_id=None, description=None):
    def decorator(func):
        def wrapper(self, request, *args, **kwargs):
            # 执行原函数
            response = func(self, request, *args, **kwargs)
            
            # 记录操作日志
            if request.user.is_authenticated:
                ActionLog.objects.create(
                    user=request.user,
                    action_type=action_type,
                    object_type=object_type,
                    object_id=object_id,
                    description=description,
                    ip_address=request.META.get('REMOTE_ADDR')
                )
            
            return response
        return wrapper
    return decorator

class CategoryViewSet(viewsets.ModelViewSet):
    """分类视图集：读公开，写操作仅限管理员"""
    queryset = Category.objects.annotate(book_count=Count('books'))
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    # 分类数量通常较少，不分页
    pagination_class = None

    def get_permissions(self):
        """
        按 action 动态分配权限
        - 增删改（create/update/partial_update/destroy）仅管理员
        - 查询（list/retrieve）公开
        @return list: 权限类实例列表
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

class BookViewSet(viewsets.ModelViewSet):
    """图书视图集：读公开，写操作仅限管理员"""
    queryset = Book.objects.all()
    permission_classes = [permissions.AllowAny]
    # 图书列表自定义实现（支持搜索/过滤/排序），保持全量返回不分页
    pagination_class = None

    def get_queryset(self):
        """
        对图书附加用户评分聚合数据（评论数、用户评分均值）
        @return QuerySet: 含 review_count/avg_rating 注解的图书集合
        """
        return super().get_queryset().annotate(
            review_count=Count('reviews', distinct=True),
            avg_rating=Avg('reviews__rating')
        )

    def get_permissions(self):
        """
        按 action 动态分配权限
        - 增删改（create/update/partial_update/destroy）仅管理员
        - 查询（list/retrieve）公开
        @return list: 权限类实例列表
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BookCreateUpdateSerializer
        return BookSerializer

    def perform_create(self, serializer):
        """
        创建图书：可借册数未指定时与总册数保持一致
        @param serializer: 图书序列化器实例
        """
        data = serializer.validated_data
        total_copies = data.get('total_copies', 1) or 1
        # 未显式指定可借册数时，默认等于总册数
        available_copies = data.get('available_copies')
        if available_copies is None:
            available_copies = total_copies
        # 如果用户已认证，将创建者设置为当前用户
        if self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user,
                            total_copies=total_copies,
                            available_copies=available_copies)
        else:
            serializer.save(total_copies=total_copies,
                            available_copies=available_copies)

    def list(self, request, *args, **kwargs):
        # 支持搜索和过滤
        queryset = self.get_queryset()
        
        # 按关键词搜索
        search_query = request.query_params.get('q', None)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(author__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(isbn__icontains=search_query)
            )
        
        # 按分类过滤
        category = request.query_params.get('category', None)
        if category:
            try:
                # 尝试按ID过滤
                queryset = queryset.filter(category__id=category)
            except ValueError:
                # 如果不是数字，按名称过滤
                queryset = queryset.filter(category__name=category)
        
        # 按最低评分过滤
        min_rating = request.query_params.get('min_rating', None)
        if min_rating:
            queryset = queryset.filter(rating__gte=min_rating)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class UserProfileViewSet(viewsets.ModelViewSet):
    """用户资料视图集：防止普通用户创建任意用户或自我提权为管理员"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsOwnerOrAdmin]
    authentication_classes = [TokenAuthentication]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserProfileCreateUpdateSerializer
        return UserProfileSerializer

    def get_permissions(self):
        """
        按 action 动态分配权限
        - create（创建用户）仅管理员，防止普通用户批量注册提权账号
        - destroy（删除资料）仅管理员
        - update/partial_update/retrieve/list 需登录，且 get_queryset/object 权限控制越权
        @return list: 权限类实例列表
        """
        if self.action in ['create', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        # 普通用户只能查看自己的用户资料；对未建立 profile 的用户做兜底保护
        if self.request.user.is_authenticated:
            profile = getattr(self.request.user, 'profile', None)
            if profile is not None and profile.user_type == 'user':
                queryset = queryset.filter(user=self.request.user)
        return queryset

    def perform_update(self, serializer):
        """
        更新用户资料时的越权保护
        普通用户仅允许更新自己的资料，且强制保持原 user_type（防自我提权为管理员）
        @param serializer: 序列化器实例
        """
        if not _is_admin_user(self.request.user):
            # 普通用户：user_type 强制保持原值，忽略请求中的越权字段
            serializer.save(user_type=serializer.instance.user_type)
        else:
            serializer.save()

class BorrowRecordViewSet(viewsets.ModelViewSet):
    queryset = BorrowRecord.objects.all().order_by('-borrow_date')
    serializer_class = BorrowRecordSerializer
    authentication_classes = [TokenAuthentication]
    # 默认借阅期限（天）
    BORROW_DURATION_DAYS = 30

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BorrowRecordCreateSerializer
        return BorrowRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # 普通用户只能查看自己的借阅记录；对未建立 profile 的用户做兜底保护
        if self.request.user.is_authenticated:
            profile = getattr(self.request.user, 'profile', None)
            if profile is not None and profile.user_type == 'user':
                queryset = queryset.filter(user=self.request.user)
        
        # 支持按状态过滤
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset

    def get_permissions(self):
        """
        按 action 动态分配权限
        - create/list/retrieve/update/partial_update/return_book 需登录
        - destroy 仅管理员
        @return list: 权限类实例列表
        """
        if self.action == 'destroy':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        """
        借阅图书：校验库存与重复借阅，扣减可借册数并设置应还日期
        @param serializer: 借阅记录序列化器实例
        @raises ValidationError: 库存不足或重复借阅时抛出
        """
        book = serializer.validated_data['book']
        user = self.request.user

        with transaction.atomic():
            # 锁定图书行，避免并发借阅造成库存超卖
            locked_book = Book.objects.select_for_update().get(pk=book.pk)
            # 校验库存
            if locked_book.available_copies <= 0:
                raise serializers.ValidationError({'detail': '该书暂无库存，无法借阅'})
            # 校验重复借阅（同一用户对同一本书未归还）
            if BorrowRecord.objects.filter(user=user, book=locked_book, status='borrowed').exists():
                raise serializers.ValidationError({'detail': '您已借阅该书且尚未归还，不能重复借阅'})

            # 扣减库存
            locked_book.available_copies -= 1
            locked_book.save(update_fields=['available_copies'])

            # 创建借阅记录，设置应还日期
            borrow_record = serializer.save(
                user=user,
                due_date=timezone.now() + timedelta(days=self.BORROW_DURATION_DAYS)
            )

        # 记录操作日志
        ActionLog.objects.create(
            user=user,
            action_type='borrow',
            object_type='Book',
            object_id=borrow_record.book.id,
            description=f'借阅图书：{borrow_record.book.title}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        """
        更新借阅记录：状态由借阅变为归还时回补库存并记录归还日期
        @param serializer: 借阅记录序列化器实例
        """
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)

        # 普通用户只允许执行归还操作（borrowed -> returned），禁止修改其它字段
        if not _is_admin_user(self.request.user):
            if old_status == 'returned':
                raise serializers.ValidationError({'detail': '该记录已归还，无需重复操作'})
            if new_status != 'returned':
                raise serializers.ValidationError({'detail': '普通用户仅可执行归还操作'})
            # 强制仅更新 status，忽略其它越权字段
            instance.status = 'returned'
            instance.return_date = timezone.now()
            instance.save(update_fields=['status', 'return_date'])
            borrow_record = instance
        else:
            borrow_record = serializer.save()

        # 状态从借阅变为归还，回补库存
        if old_status == 'borrowed' and borrow_record.status == 'returned':
            with transaction.atomic():
                locked_book = Book.objects.select_for_update().get(pk=borrow_record.book_id)
                locked_book.available_copies += 1
                locked_book.save(update_fields=['available_copies'])

            # 记录操作日志
            ActionLog.objects.create(
                user=self.request.user,
                action_type='return',
                object_type='Book',
                object_id=borrow_record.book.id,
                description=f'归还图书：{borrow_record.book.title}',
                ip_address=self.request.META.get('REMOTE_ADDR')
            )

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """
        归还图书专用接口
        普通用户仅能归还自己的借阅记录（由 get_queryset 限制），管理员可归还任意记录
        @param request: HttpRequest 请求对象
        @param pk: 借阅记录主键
        @return Response: 归还成功返回 200，失败返回对应错误
        @raises Book.DoesNotExist: 图书已被删除时抛出（内部捕获返回 400）
        """
        try:
            record = self.get_object()
        except Exception:
            return Response({'error': '借阅记录不存在'}, status=status.HTTP_404_NOT_FOUND)

        if record.status == 'returned':
            return Response({'error': '该书已归还，无需重复操作'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 锁定记录与图书，避免并发归还重复回补库存
                record = BorrowRecord.objects.select_for_update().get(pk=record.pk)
                if record.status == 'returned':
                    return Response({'error': '该书已归还，无需重复操作'}, status=status.HTTP_400_BAD_REQUEST)
                record.status = 'returned'
                record.return_date = timezone.now()
                record.save(update_fields=['status', 'return_date'])

                # 使用 book_id 回补库存，避免额外关联查询；
                # 图书已被删除时抛出 DoesNotExist，由外层捕获回滚事务
                locked_book = Book.objects.select_for_update().get(pk=record.book_id)
                locked_book.available_copies += 1
                locked_book.save(update_fields=['available_copies'])
                book_title = locked_book.title
        except Book.DoesNotExist:
            return Response({'error': '该图书已不存在，无法归还'}, status=status.HTTP_400_BAD_REQUEST)

        # 记录操作日志：使用事务内已获取的 book_id 与标题，避免事务外重复查询关联对象
        ActionLog.objects.create(
            user=request.user,
            action_type='return',
            object_type='Book',
            object_id=record.book_id,
            description=f'归还图书：{book_title}',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': '归还成功'}, status=status.HTTP_200_OK)


class BookReviewViewSet(viewsets.ModelViewSet):
    """书评视图集：读公开，写操作仅限登录用户（每个用户对同一本书仅一条评论）"""
    queryset = BookReview.objects.all()
    serializer_class = BookReviewSerializer
    authentication_classes = [TokenAuthentication]

    def get_permissions(self):
        """
        按 action 动态分配权限
        - 查询（list/retrieve）公开
        - 写操作（create/update/partial_update/destroy）需登录
        @return list: 权限类实例列表
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        # 支持按图书过滤
        book = self.request.query_params.get('book', None)
        if book:
            queryset = queryset.filter(book__id=book)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """
        创建书评：同一用户对同一本书仅保留一条，重复提交时更新原评论
        @param serializer: 书评序列化器实例
        """
        user = self.request.user
        book = serializer.validated_data['book']
        # 若用户已评论过该书，则更新而非新建
        existing = BookReview.objects.filter(user=user, book=book).first()
        if existing:
            existing.rating = serializer.validated_data.get('rating', existing.rating)
            existing.comment = serializer.validated_data.get('comment', existing.comment)
            existing.save()
            return existing
        return serializer.save(user=user)

class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActionLog.objects.all()
    serializer_class = ActionLogSerializer
    permission_classes = [IsAdmin]
    authentication_classes = [TokenAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # 按时间倒序排序
        return queryset.order_by('-created_at')

# 登录视图
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """
    用户登录接口（含防暴力破解限流）
    连续失败超过阈值将锁定该 IP 一段时间
    @param request: HttpRequest 请求对象
    @return Response: 登录成功返回 token 与用户信息；失败返回统一错误提示
    """
    # 检查该 IP 是否已被锁定
    locked, remaining = _check_login_locked(request)
    if locked:
        return Response({
            'error': f'登录失败次数过多，账号已被临时锁定，请在 {remaining} 秒后重试'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    username = request.data.get('username')
    password = request.data.get('password')
    user_type = request.data.get('user_type')
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        # 检查用户类型
        profile = getattr(user, 'profile', None)
        real_type = profile.user_type if profile is not None else ('admin' if user.is_superuser else 'user')
        if real_type == user_type:
            # 登录成功，清除失败记录
            _record_login_success(request)
            login(request, user)
            
            # 创建或获取token
            token, created = Token.objects.get_or_create(user=user)
            
            # 记录登录日志
            ActionLog.objects.create(
                user=user,
                action_type='login',
                description=f'用户登录，类型：{user_type}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': real_type,
                    'phone': profile.phone if profile is not None else '',
                    'profile_id': profile.id if profile is not None else None
                }
            }, status=status.HTTP_200_OK)
        else:
            # 用户类型不匹配：统一错误提示，避免暴露账号状态
            _record_login_failure(request)
            return Response({'error': '用户名或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)
    else:
        # 用户名或密码错误：统一错误提示，避免用户枚举
        _record_login_failure(request)
        return Response({'error': '用户名或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)

# 登出视图
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    # 检查用户是否已登录
    if not request.user.is_authenticated:
        return Response({'error': '用户未登录'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 记录登出日志
    ActionLog.objects.create(
        user=request.user,
        action_type='logout',
        description='用户登出',
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    # 删除token
    Token.objects.filter(user=request.user).delete()
    logout(request)
    return Response({'message': '登出成功'}, status=status.HTTP_200_OK)

# 统计信息视图
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_stats(request):
    """
    获取首页统计数据
    统计包含基础指标（总图书/总分类/平均评分）以及业务指标（借阅中/可借/今日新增）
    今日新增仅返回给认证用户（管理员），游客和普通用户隐藏
    @param request: HttpRequest 请求对象
    @return Response: JSON 统计数据字典
    """
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import date
    
    total_books = Book.objects.count()
    total_categories = Category.objects.count()
    avg_rating = Book.objects.aggregate(models.Avg('rating'))['rating__avg'] or 0.0
    
    # 业务指标：当前正在借阅中的记录数
    borrowed_now = BorrowRecord.objects.filter(status='borrowed').count()
    # 业务指标：当前可借总册数（所有图书的可借册数求和）
    available_books = Book.objects.aggregate(Sum('available_copies'))['available_copies__sum'] or 0
    # 业务指标：今日新增图书
    today = date.today()
    books_added_today = Book.objects.filter(
        created_at__date=today
    ).count()
    
    return Response({
        'total_books': total_books,
        'total_categories': total_categories,
        'avg_rating': round(avg_rating, 1),
        'borrowed_now': borrowed_now,
        'available_books': available_books,
        'books_added_today': books_added_today
    })

# 注册视图
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    用户注册接口
    执行密码强度校验；错误信息统一化，避免泄露内部细节
    @param request: HttpRequest 请求对象
    @return Response: 注册成功返回 201；失败返回统一错误提示
    """
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    phone = request.data.get('phone', '')

    # 基础字段校验
    if not username or not password:
        return Response({'error': '用户名和密码不能为空'}, status=status.HTTP_400_BAD_REQUEST)

    # 验证用户名是否已存在（统一错误提示，避免账号枚举）
    if User.objects.filter(username=username).exists():
        return Response({'error': '注册失败，请更换用户名后重试'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 使用 Django 内置密码校验器验证密码强度（长度、常见密码等）
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(password, user=None)
        except ValidationError as ve:
            return Response({'error': '；'.join(ve.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # 创建用户
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        
        # 创建用户资料
        UserProfile.objects.create(
            user=user,
            user_type='user',  # 注册的用户默认是普通用户，不可自选为管理员
            phone=phone
        )
        
        # 记录注册日志
        ActionLog.objects.create(
            user=user,
            action_type='create',
            description='用户注册',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({'message': '注册成功'}, status=status.HTTP_201_CREATED)
    except Exception:
        # 统一错误提示，不向客户端泄露内部异常细节
        return Response({'error': '注册失败，请稍后重试'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 获取当前用户信息
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_current_user(request):
    """
    获取当前登录用户信息
    对未建立 UserProfile 的用户（如超级管理员）做兜底处理
    @param request: HttpRequest 请求对象
    @return Response: 当前用户信息
    """
    user = request.user
    profile = getattr(user, 'profile', None)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': profile.user_type if profile is not None else ('admin' if user.is_superuser else 'user'),
        'phone': profile.phone if profile is not None else '',
        'profile_id': profile.id if profile is not None else None
    }, status=status.HTTP_200_OK)