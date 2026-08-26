from rest_framework import serializers
from .models import Category, Book, UserProfile, BorrowRecord, BookReview, ActionLog
from django.contrib.auth.models import User


class CategorySerializer(serializers.ModelSerializer):
    # 分类下的图书数量（由视图 annotate 提供）
    book_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'book_count', 'created_at', 'updated_at']

class BookSerializer(serializers.ModelSerializer):
    # 将DecimalField转换为FloatField，前端直接使用数字类型
    rating = serializers.FloatField()
    # 用户评分聚合数据（由视图 annotate 提供，无评分时回退为图书默认评分）
    review_count = serializers.IntegerField(read_only=True, default=0)
    avg_rating = serializers.FloatField(read_only=True, default=None)

    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'category', 'isbn', 'publish_date', 'rating',
                  'total_copies', 'available_copies', 'review_count', 'avg_rating',
                  'description', 'cover_image', 'created_by', 'created_at', 'updated_at']
        depth = 1

class BookCreateUpdateSerializer(serializers.ModelSerializer):
    # 将DecimalField转换为FloatField，前端直接使用数字类型
    rating = serializers.FloatField(required=False)
    total_copies = serializers.IntegerField(min_value=1, required=False)

    class Meta:
        model = Book
        fields = ['title', 'author', 'category', 'isbn', 'publish_date', 'rating',
                  'description', 'cover_image', 'total_copies', 'available_copies']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True}
        }

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'user_type', 'phone', 'created_at', 'updated_at']

class UserProfileCreateUpdateSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'user_type', 'phone']
    
    def validate(self, attrs):
        """
        越权防护校验（第二层防线）
        非管理员请求不允许将 user_type 设置为 admin，防止普通用户自我提权
        @param attrs: 待校验数据字典
        @return dict: 校验通过后的数据
        @raises serializers.ValidationError: 普通用户尝试提权时抛出
        """
        request = self.context.get('request')
        user_type = attrs.get('user_type')
        if user_type == 'admin' and request and request.user.is_authenticated:
            # 判断请求用户是否为管理员（通过 profile 或 superuser 兜底）
            profile = getattr(request.user, 'profile', None)
            is_admin = (profile is not None and profile.user_type == 'admin') or request.user.is_superuser
            if not is_admin:
                raise serializers.ValidationError({'user_type': '无权设置管理员角色'})
        return attrs
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = User.objects.create_user(**user_data)
        user_profile = UserProfile.objects.create(user=user, **validated_data)
        return user_profile
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user
        
        # 更新用户信息
        for attr, value in user_data.items():
            if attr == 'password':
                user.set_password(value)
            else:
                setattr(user, attr, value)
        user.save()
        
        # 更新用户资料
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance

class BorrowRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    book = BookSerializer()
    # 逾期状态与逾期天数（只读计算字段）
    is_overdue = serializers.BooleanField(read_only=True)
    overdue_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = BorrowRecord
        fields = ['id', 'user', 'book', 'borrow_date', 'due_date', 'return_date',
                  'status', 'is_overdue', 'overdue_days', 'created_at', 'updated_at']
        depth = 1

class BorrowRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BorrowRecord
        fields = ['id', 'book', 'status']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BookReviewSerializer(serializers.ModelSerializer):
    # 评论用户信息（只读，展示用）
    user = UserSerializer(read_only=True)
    # 评分校验：0 ~ 5
    rating = serializers.DecimalField(max_digits=2, decimal_places=1, min_value=0, max_value=5)

    class Meta:
        model = BookReview
        fields = ['id', 'user', 'book', 'rating', 'comment', 'created_at', 'updated_at']

    def validate(self, attrs):
        """
        校验书评数据：评论用户强制为当前登录用户
        @param attrs: 待校验数据字典
        @return dict: 校验通过后的数据
        @raises serializers.ValidationError: book 缺失时抛出
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            attrs['user'] = request.user
        if 'book' not in attrs or not attrs.get('book'):
            raise serializers.ValidationError({'book': '必须指定图书'})
        return attrs

class ActionLogSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    
    class Meta:
        model = ActionLog
        fields = ['id', 'user', 'action_type', 'object_type', 'object_id', 'description', 'ip_address', 'created_at']
        depth = 1