# -*- coding: utf-8 -*-
"""
初始化管理员账号的管理命令
安全要求：禁止使用硬编码弱口令。
- 优先从环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 读取
- 未设置时生成随机强密码并打印到控制台，便于管理员登录后立即修改
"""
import os
import secrets
import string

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from library.models import UserProfile


class Command(BaseCommand):
    """初始化管理员用户命令：创建超级管理员及其用户资料"""
    help = 'Initialize the admin user with secure credentials (env or random)'

    def handle(self, *args, **options):
        """
        执行命令：若管理员不存在则创建，密码优先取环境变量，否则生成随机强密码
        @param args: 命令参数（未使用）
        @param options: 命令选项（未使用）
        """
        if User.objects.filter(username='root').exists():
            self.stdout.write(self.style.WARNING(
                'Admin user "root" already exists. '
                'Use "python manage.py changepassword root" to change its password.'
            ))
            return

        # 从环境变量读取管理员凭据（未设置则生成随机强密码）
        admin_username = os.environ.get('ADMIN_USERNAME', 'root')
        admin_password = os.environ.get('ADMIN_PASSWORD', '')
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@example.com')

        if not admin_password:
            # 生成 20 位随机强密码（包含大小写字母、数字、符号）
            alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
            admin_password = ''.join(secrets.choice(alphabet) for _ in range(20))

        # 创建超级管理员
        admin_user = User.objects.create_superuser(
            username=admin_username,
            password=admin_password,
            email=admin_email
        )

        # 创建管理员用户资料
        UserProfile.objects.create(
            user=admin_user,
            user_type='admin',
            phone=''
        )

        self.stdout.write(self.style.SUCCESS(
            f'Successfully created admin user: {admin_username}'
        ))
        self.stdout.write(self.style.WARNING(
            f'Generated admin password: {admin_password}  (please change it after first login)'
        ))
