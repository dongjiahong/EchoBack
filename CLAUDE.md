# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

EchoBack 是一个基于"回译法"的英语学习工具，使用 AI 生成地道的英语内容，帮助用户通过"学习-隐藏-翻译"的循环来提高英语水平，并提供详细的差距分析。

技术栈：
- React 19.2 + TypeScript
- Vite 构建工具
- Google Gemini API (gemini-2.5-flash 模型)
- IndexedDB (本地数据持久化)
- WebDAV (可选的远程同步)

## 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器，运行在 http://0.0.0.0:3000

# 构建
npm run build        # 生产构建

# 预览
npm run preview      # 预览生产构建
```

## 环境配置

需要在项目根目录创建 `.env` 文件并配置：
```
GEMINI_API_KEY=your_api_key_here
```

Vite 会通过 `vite.config.ts` 将其注入为 `process.env.API_KEY` 和 `process.env.GEMINI_API_KEY`。

## 核心架构

### 状态管理模式
采用 React Hooks + 单一状态机模式 (AppState enum):
- `IDLE`: 初始状态
- `GENERATING`: AI 生成挑战中
- `STUDY`: 用户学习原文阶段
- `INPUT`: 用户输入翻译阶段
- `ANALYZING`: AI 分析翻译中
- `REVIEW`: 显示分析结果阶段

状态转换由用户操作驱动，确保学习流程的线性和清晰。

### 数据持久化架构

**三层存储策略**：
1. **React State** (内存): 当前会话的实时状态
2. **IndexedDB** (`services/db.ts`): 本地持久化
   - `history` store: 保存历史练习记录 (HistoryRecord)
   - `notebook` store: 保存错题本条目 (NotebookEntry)
3. **WebDAV** (`services/webdav.ts`): 可选的远程同步
   - 启动时自动合并本地和远程数据
   - 支持多设备数据同步

**同步逻辑** (`App.tsx` initApp):
1. 加载本地 IndexedDB 数据
2. 如果 WebDAV 已启用，执行双向同步（按 ID 去重合并）
3. 合并后的数据同时更新 IndexedDB 和远程

### AI 服务层 (`services/geminiService.ts`)

使用 Google Gemini API 的两个核心功能：

1. **generateChallenge**: 根据难度/主题/长度生成英语练习内容
   - 返回结构化数据：英文原文 + 中文翻译 + 场景上下文
   - 使用 Structured Output (responseSchema) 确保 JSON 格式
   - temperature: 0.85 (保证内容多样性)

2. **analyzeTranslation**: 分析用户翻译与原文的差距
   - 返回：评分 (0-100) + 反馈 + 差距详情数组 (gaps)
   - gaps 包含: 类型 (vocabulary/grammar/tone/structure) + 用户片段 + 原文片段 + 解释
   - temperature: 0.4 (分析任务需要稳定性)

### 组件结构

**容器组件**：
- `App.tsx`: 主应用逻辑，管理所有状态和数据流

**功能组件**：
- `Button.tsx`: 通用按钮组件
- `AnalysisCard.tsx`: 显示分析结果和差距详情
- `SettingsModal.tsx`: 设置面板 (难度/主题/长度/WebDAV 配置)
- `Notebook.tsx`: 错题本，显示和管理保存的错误条目
- `Sidebar.tsx`: 侧边栏历史记录时间线

### 类型系统 (`types.ts`)

核心数据结构：
- `Challenge`: AI 生成的挑战 (english + chinese + context)
- `AnalysisResult`: 分析结果 (score + feedback + gaps + betterAlternative)
- `GapAnalysisItem`: 单个差距项 (type + userSegment + nativeSegment + explanation)
- `HistoryRecord`: 历史记录 (包含完整的练习上下文)
- `NotebookEntry`: 错题本条目 (从 gap 提取并保存)
- `WebDAVConfig`: WebDAV 配置 (url + username + password + enabled)

### 路径别名

tsconfig 和 vite.config 都配置了 `@/*` 指向项目根目录，可以使用绝对路径导入。

## 开发注意事项

1. **API 密钥安全**: GEMINI_API_KEY 必须在 `.env` 文件中配置，不要提交到 Git
2. **WebDAV 代理**: 如果 WebDAV URL 为空，默认使用 `/webdav-proxy/` (需要配置反向代理或本地服务)
3. **IndexedDB 版本**: 当前版本为 1，修改 schema 时需要增加版本号并处理迁移
4. **状态机严格性**: 所有状态转换必须通过 setState(AppState.XXX)，保证流程正确性
5. **数据去重**: History 和 Notebook 都使用 ID (UUID) 去重，同步时按 ID 合并
6. **圈复杂度控制**: App.tsx 较大，但状态机逻辑清晰，修改时注意不要破坏状态转换流程
