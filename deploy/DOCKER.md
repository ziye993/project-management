# Docker 部署说明（在服务器上执行，本仓库仅提供模板）

## 架构

- 单容器跑 Node 服务（端口 `30014`），前端构建产物打进镜像的 `/app/html`
- `data/` 用命名卷持久化（上传、配置、应用商店包等）
- MySQL 仍用现有库（`server/.env` 里的 `LOG_DB_*`），一般不随本 compose 起库

## 一次性部署

```bash
# 1. 服务器克隆仓库
git clone <你的仓库地址> /opt/project-management
cd /opt/project-management

# 2. 准备环境变量（勿提交到 git）
cp server/.env.example server/.env
# 编辑 server/.env：JWT_SECRET、LOG_DB_*、PUBLIC_BASE_URL、LOG_API_BASE_URL 等

# 3. 构建并启动
docker compose up -d --build

# 4. 看日志
docker compose logs -f app
```

浏览器访问：`http://服务器IP:30014`（或经 Nginx 反代到 443）。

若 MySQL 在宿主机：`LOG_DB_HOST` 可试 `host.docker.internal`，并在 `docker-compose.yml` 打开 `extra_hosts`。

## 每天 0 点自动拉代码并重启

脚本：`scripts/docker-daily-update.sh`（`git pull` → `compose build` → `up -d`）。

```bash
chmod +x /opt/project-management/scripts/docker-daily-update.sh

# crontab -e，加入（每天 00:00；若要中午 12:00 则改成 0 12 * * *）
0 0 * * * REPO_DIR=/opt/project-management BRANCH=main /opt/project-management/scripts/docker-daily-update.sh
```

日志默认：`/var/log/project-management-update.log`。

注意：服务器上该目录应是干净 git 工作区；改配置用 `server/.env` 和 data 卷，不要改已跟踪源码，以免 `git pull` 冲突。

## 常用命令

```bash
docker compose ps
docker compose restart app
docker compose logs -f --tail=200 app
docker compose down          # 停服务（保留 volume）
docker volume ls | grep pm   # 数据卷
```

## 与本项目的权限模块无关说明

「权限管理」授权的是日志租户/项目，不是 Docker 权限。模块显隐在「系统配置 → 模块访问控制」。
