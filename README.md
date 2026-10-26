# NCT Seoul Map 23 · Week 4

当前代码已裁剪为前四周版本，不再包含路线集、公开/共享路线集、共享成员和编辑记录。

## 已保留功能

- Leaflet 地图和多地图源自动切换
- 地点 Marker、地点详情和 Naver Map 链接
- 成员、分队、分类和类型筛选
- 关键词搜索和别名匹配
- 地点收藏
- “我的打卡清单”默认收起，点击收藏按钮后打开，桌面和手机通用
- 按中文、韩文或英文地址添加地点，自动识别大致经纬度
- 新地点保存到本浏览器并立即加入地图和搜索
- 注册、登录、找回问题和 Token 会话
- 公共交通路线规划
- 最近地铁站匹配
- Dijkstra 最短路径
- TSP 最近邻和 2-opt 优化
- 气候卡可用性标注

## 已移除

- 路线集
- 保存路线到路线集
- 公开/共享路线集
- 共享成员管理
- 编辑记录
- 随机抽卡、预设路线和打卡门票导出

## 启动

```powershell
cd D:\ANCT\nct-seoul-map-23
node server/server.js
```

浏览器打开：

```text
http://localhost:8092/
```

## 主要文件

```text
index.html              页面结构
css/style.css           基础样式
css/app.css             页面布局
css/neo.css             暗黑主题
css/route.css           路线规划样式
css/auth.css            登录和注册样式
css/custom-place.css    添加地点界面样式
js/data.js              地点、成员和分队数据
js/transit.js           地铁网络和路线算法
js/app.js               地图、搜索、筛选、详情和路线交互
js/auth.js              注册、登录和会话
js/custom-places.js     地址识别和自定义地点
server/server.js        Node.js 静态托管和认证 API
server/data/nct.sqlite  用户和会话数据库
```

## 账号接口

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/question
POST /api/auth/recover
GET  /api/auth/me
POST /api/auth/logout
```

数据库只保留 `users` 和 `sessions` 两张表。

