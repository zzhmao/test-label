# 使用特定版本的 Node.js 作为基础镜像，支持多架构
FROM --platform=$BUILDPLATFORM node:16-alpine AS build

# 安装 git（如果需要）
RUN apk add --no-cache git

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json 文件
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build:stage

# 使用多阶段构建来减小镜像大小
FROM node:16-alpine

WORKDIR /app

# 安装简单的 http 服务
RUN npm install -g http-server

# 从上一阶段复制构建好的文件
COPY --from=0 /app/dist ./dist

# 启动服务
CMD ["http-server", "dist"]
