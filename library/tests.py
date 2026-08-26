# -*- coding: utf-8 -*-
"""图书管理系统自动化测试
覆盖：安全权限控制、借阅库存/归还业务、书评评分、登录限流等核心逻辑
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from .models import Category, Book, UserProfile, BorrowRecord, BookReview


class BaseTestCase(TestCase):
    """测试基类：准备管理员、普通用户、图书等公共数据"""

    def setUp(self):
        """初始化公共测试数据"""
        # 管理员
        self.admin = User.objects.create_user(username='admin', password='Admin123!')
        UserProfile.objects.create(user=self.admin, user_type='admin')
        # 普通用户
        self.user = User.objects.create_user(username='user', password='User123!')
        UserProfile.objects.create(user=self.user, user_type='user')
        # 分类与图书（总册数 2，可借 2）
        self.category = Category.objects.create(name='测试分类', description='')
        self.book = Book.objects.create(
            title='测试图书', author='作者', category=self.category,
            rating=4.5, total_copies=2, available_copies=2
        )
        # API 客户端
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)
        self.user_client = APIClient()
        self.user_client.force_authenticate(user=self.user)
        self.anon_client = APIClient()


class SecurityTests(BaseTestCase):
    """安全权限控制测试"""

    def test_anonymous_cannot_write_books(self):
        """未认证用户不能创建/删除图书"""
        resp = self.anon_client.post('/api/books/', {'title': 'x', 'author': 'y', 'category': self.category.id})
        self.assertIn(resp.status_code, (401, 403))
        resp = self.anon_client.delete(f'/api/books/{self.book.id}/')
        self.assertIn(resp.status_code, (401, 403))

    def test_regular_user_cannot_write_books(self):
        """普通用户不能创建/删除图书（垂直越权防护）"""
        resp = self.user_client.post('/api/books/', {'title': 'x', 'author': 'y', 'category': self.category.id})
        self.assertIn(resp.status_code, (401, 403))
        resp = self.user_client.delete(f'/api/books/{self.book.id}/')
        self.assertIn(resp.status_code, (401, 403))

    def test_regular_user_cannot_escalate_admin(self):
        """普通用户不能通过 user-profiles 接口自我提权为管理员"""
        profile = UserProfile.objects.get(user=self.user)
        resp = self.user_client.patch(f'/api/user-profiles/{profile.id}/', {'user_type': 'admin'})
        self.assertNotEqual(resp.status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.user_type, 'user')

    def test_regular_user_cannot_create_admin_user(self):
        """普通用户不能通过 user-profiles 创建管理员账号"""
        resp = self.user_client.post('/api/user-profiles/', {
            'user': {'username': 'hacked', 'password': 'Hack123!', 'email': ''},
            'user_type': 'admin'
        }, format='json')
        self.assertIn(resp.status_code, (401, 403))
        self.assertFalse(User.objects.filter(username='hacked').exists())

    def test_regular_user_cannot_view_others_borrow(self):
        """普通用户不能查看他人借阅记录（水平越权防护）"""
        # 管理员给普通用户创建一条记录
        BorrowRecord.objects.create(user=self.user, book=self.book)
        other = User.objects.create_user(username='other', password='Other123!')
        UserProfile.objects.create(user=other, user_type='user')
        BorrowRecord.objects.create(user=other, book=self.book)
        resp = self.user_client.get('/api/borrow-records/')
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get('results', resp.data)
        for record in results:
            self.assertEqual(record['user']['username'], 'user')

    def test_weak_password_registration_rejected(self):
        """弱密码注册被拒绝"""
        resp = self.anon_client.post('/api/register/', {'username': 'weak', 'password': '123', 'email': ''})
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(username='weak').exists())


class BorrowBusinessTests(BaseTestCase):
    """借阅库存与归还业务测试"""

    def test_borrow_decreases_stock(self):
        """借阅扣减可借册数并设置应还日期"""
        resp = self.user_client.post('/api/borrow-records/', {'book': self.book.id})
        self.assertEqual(resp.status_code, 201)
        self.book.refresh_from_db()
        self.assertEqual(self.book.available_copies, 1)
        record = BorrowRecord.objects.get(user=self.user, book=self.book)
        self.assertIsNotNone(record.due_date)
        self.assertFalse(record.is_overdue)

    def test_duplicate_borrow_rejected(self):
        """同一本书未归还时禁止重复借阅"""
        BorrowRecord.objects.create(user=self.user, book=self.book)
        resp = self.user_client.post('/api/borrow-records/', {'book': self.book.id})
        self.assertEqual(resp.status_code, 400)
        self.book.refresh_from_db()
        self.assertEqual(self.book.available_copies, 2)

    def test_borrow_without_stock_rejected(self):
        """库存不足时禁止借阅"""
        self.book.available_copies = 0
        self.book.save()
        resp = self.user_client.post('/api/borrow-records/', {'book': self.book.id})
        self.assertEqual(resp.status_code, 400)

    def test_return_restores_stock(self):
        """归还回补可借册数"""
        # 通过 API 借阅以正确扣减库存
        resp = self.user_client.post('/api/borrow-records/', {'book': self.book.id})
        self.assertEqual(resp.status_code, 201)
        self.book.refresh_from_db()
        self.assertEqual(self.book.available_copies, 1)
        record = BorrowRecord.objects.get(user=self.user, book=self.book)
        resp = self.user_client.post(f'/api/borrow-records/{record.id}/return_book/')
        self.assertEqual(resp.status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual(self.book.available_copies, 2)
        record.refresh_from_db()
        self.assertEqual(record.status, 'returned')
        self.assertIsNotNone(record.return_date)

    def test_overdue_flag(self):
        """逾期状态判断正确"""
        record = BorrowRecord.objects.create(
            user=self.user, book=self.book,
            due_date=timezone.now() - timedelta(days=5)
        )
        self.assertTrue(record.is_overdue)
        self.assertGreaterEqual(record.overdue_days, 1)

    def test_regular_user_cannot_modify_others_fields(self):
        """普通用户更新借阅记录时只能执行归还，不能修改其它字段"""
        record = BorrowRecord.objects.create(user=self.user, book=self.book)
        # 普通用户尝试把状态改回 borrowed（不允许）
        resp = self.user_client.patch(f'/api/borrow-records/{record.id}/', {'status': 'borrowed'})
        self.assertEqual(resp.status_code, 400)

    def test_return_book_when_book_deleted(self):
        """图书被删除后归还接口应返回 400 而非 500（防御孤儿记录场景）"""
        from unittest import mock
        record = BorrowRecord.objects.create(user=self.user, book=self.book)
        # 模拟图书查询抛出 DoesNotExist（对应真实场景中图书被外部删除的情形），
        # 验证归还接口能优雅降级返回 400 而非抛出 500
        with mock.patch(
            'library.views.Book.objects.select_for_update',
            side_effect=Book.DoesNotExist('Book matching query does not exist.')
        ):
            resp = self.user_client.post(f'/api/borrow-records/{record.id}/return_book/')
        self.assertEqual(resp.status_code, 400)
        # 事务回滚后借阅记录仍为 borrowed，未被错误标记为已归还
        record.refresh_from_db()
        self.assertEqual(record.status, 'borrowed')


class ReviewTests(BaseTestCase):
    """书评评分测试"""

    def test_create_review(self):
        """登录用户可对图书评分评论"""
        resp = self.user_client.post('/api/reviews/', {
            'book': self.book.id, 'rating': 5, 'comment': '非常好看'
        })
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(BookReview.objects.filter(user=self.user, book=self.book).exists())

    def test_review_rating_range_validated(self):
        """评分超出 0-5 范围被拒绝"""
        resp = self.user_client.post('/api/reviews/', {
            'book': self.book.id, 'rating': 10, 'comment': 'x'
        })
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_review_updates_not_creates(self):
        """同一用户对同一本书重复评论时更新而非新建"""
        BookReview.objects.create(user=self.user, book=self.book, rating=3.0, comment='old')
        resp = self.user_client.post('/api/reviews/', {
            'book': self.book.id, 'rating': 5, 'comment': 'new'
        })
        self.assertIn(resp.status_code, (200, 201))
        self.assertEqual(BookReview.objects.filter(user=self.user, book=self.book).count(), 1)
        review = BookReview.objects.get(user=self.user, book=self.book)
        self.assertEqual(float(review.rating), 5.0)
        self.assertEqual(review.comment, 'new')

    def test_book_avg_rating_annotated(self):
        """图书接口返回用户评分聚合数据"""
        BookReview.objects.create(user=self.user, book=self.book, rating=4.0)
        admin2 = User.objects.create_user(username='u2', password='U2123!')
        UserProfile.objects.create(user=admin2, user_type='user')
        BookReview.objects.create(user=admin2, book=self.book, rating=2.0)
        resp = self.anon_client.get(f'/api/books/{self.book.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(float(resp.data['avg_rating']), 3.0)
        self.assertEqual(resp.data['review_count'], 2)
