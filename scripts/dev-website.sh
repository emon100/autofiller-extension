#!/bin/bash

echo "========================================="
echo "  AutoFiller 本地开发环境启动"
echo "========================================="
echo ""

# 检查 website 目录
if [ ! -d "website" ]; then
    echo "错误: website 目录不存在"
    exit 1
fi

# 检查 node_modules
if [ ! -d "website/node_modules" ]; then
    echo "正在安装网站依赖..."
    cd website && npm install && cd ..
fi

echo "启动官网开发服务器 (http://localhost:3000)..."
echo ""
echo "提示:"
echo "  - 首页: http://localhost:3000"
echo "  - 登录: http://localhost:3000/login"
echo "  - 定价: http://localhost:3000/pricing"
echo "  - 控制面板: http://localhost:3000/dashboard"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

cd website && npm run dev
