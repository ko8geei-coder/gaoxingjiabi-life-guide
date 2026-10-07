#!/usr/bin/env bash
# 一键更新 GitHub Pages 网页版
# 用途：改了 guide.json 或 web/ 代码后，跑这个脚本同步到线上
# 用法：bash deploy-pages.sh
#
# 原理：重新拆分数据 → 同步到 Pages 仓库 → 提交推送（GitHub 自动重建，约 1 分钟生效）

set -e

SRC="$(cd "$(dirname "$0")" && pwd)"
DST="$(cd "$SRC/.." && pwd)/life-guide-pages"
NODE="C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"
ENV="jianfei-app-d9g4k50k22d30d637"
URL="https://ko8geei-coder.github.io/life-guide-web/"

echo "==> 1/4 重新拆分数据"
cd "$SRC"
"$NODE" build-web.js

echo "==> 2/4 同步文件到 Pages 仓库"
mkdir -p "$DST"
cp -r "$SRC/web/." "$DST/"
cp "$SRC/web/DEPLOY_README.md" "$DST/README.md" 2>/dev/null || true

echo "==> 3/4 提交并推送"
cd "$DST"
git add -A
if git diff --cached --quiet; then
  echo "    没有变化，跳过提交"
else
  git -c user.name="ko8geei-coder" \
      -c user.email="ko8geei-coder@users.noreply.github.com" \
      commit -q -m "update: 同步网页版内容与数据"
  git push -q origin main
  echo "    已推送，等待 GitHub 重建（约 1 分钟）"
fi

echo "==> 4/4 完成"
echo "线上地址：$URL"
echo "仓库地址：https://github.com/ko8geei-coder/life-guide-web"
echo ""
echo "查看部署状态："
echo "  gh api repos/ko8geei-coder/life-guide-web/pages"
echo "环境 ID（部署云函数时用）：$ENV"