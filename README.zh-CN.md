<h1 align="center">RunAPI MCP Server</h1>

<p align="center">
  <strong>一个 MCP Server，把 RunAPI 的模型发现、价格查询、媒体任务、账户状态和 LLM Chat 接入 AI 编程工具。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@runapi.ai/mcp"><img src="https://img.shields.io/npm/v/%40runapi.ai/mcp?style=flat-square&color=blue" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/Type-MCP_Server-blue?style=flat-square" alt="MCP Server">
</p>

---

## 这是什么？

RunAPI MCP Server 让 Claude Code、Cursor、VS Code、Windsurf、Roo 等 MCP Host 可以直接使用 RunAPI。
它支持浏览模型目录、查看模型输入参数、查询价格快照、创建媒体任务、轮询任务状态、查询账户余额，以及调用 RunAPI LLM 端点。

目录发现工具不需要 API Key，因为它们使用包内嵌的构建时目录数据。
创建任务、查询余额和 LLM Chat 需要 `RUNAPI_API_KEY`。

---

## 快速开始

在 MCP Host 配置中加入：

```json
{
  "mcpServers": {
    "runapi": {
      "command": "npx",
      "args": ["-y", "@runapi.ai/mcp"],
      "env": {
        "RUNAPI_API_KEY": "${RUNAPI_API_KEY}"
      }
    }
  }
}
```

也可以用 init 命令生成配置：

```bash
npx @runapi.ai/mcp init claude
npx @runapi.ai/mcp init cursor
npx @runapi.ai/mcp init vscode
npx @runapi.ai/mcp init windsurf
npx @runapi.ai/mcp init roo
```

免费目录工具即使没有 `RUNAPI_API_KEY` 也可用。
认证工具需要先在 RunAPI Dashboard 创建 API Key，并把它设置为 `RUNAPI_API_KEY`。

---

## 工具

| Tool | 认证 | 用途 |
|---|---|---|
| `list_models` | 否 | 从内嵌目录列出 RunAPI 模型，支持 `modality`、`service`、`action` 过滤。 |
| `get_model_info` | 否 | 返回某个模型 slug 的 service、action、modality、输入约束和价格快照。模型出现在多个 endpoint 时，带上 `service` + `action` 精确查询。 |
| `list_actions` | 否 | 按 modality 分组列出 endpoint action 名称。 |
| `check_pricing` | 否 | 查询 `service` + `action` + `model` 组合的价格快照。 |
| `create_task` | 是 | 创建媒体任务，并可选择轮询到完成。 |
| `get_task` | 是 | 查询已有媒体任务的状态和最新 payload。 |
| `check_balance` | 是 | 查询账户余额和消费指标。 |
| `chat` | 是 | 向 RunAPI LLM 端点发送 messages，并在可用时返回 usage。 |

---

## 示例

你可以用自然语言让助手调用工具。
助手应该通过工具发现当前模型 slug 和价格，而不是依赖记忆里的模型名。

### 浏览目录

```text
RunAPI 有哪些图片模型？
```

预期行为：

1. 调用 `list_models`，传入 `modality: "image"`。
2. 总结返回的 model slug、service、action 和 required fields。
3. 除非调用 `check_pricing`，否则不直接报价。

### 查看模型参数

```text
查看这个模型 slug 的必填参数：<model-slug>
```

预期行为：

1. 调用 `get_model_info`。
2. 如果返回 ambiguous，从 matches 里选择相关 service/action，并带上 `service` 和 `action` 再调用一次 `get_model_info`。
3. 展示 required fields、enum、range、条件输入规则、支持的 action 和价格快照。
4. 如果 slug 不存在，提示先用 `list_models` 选择有效 slug。

### 创建媒体任务

```text
用 RunAPI 生成一张方形产品图，帮我选合适的图片模型。
```

预期行为：

1. 调用 `list_models` 选择兼容的图片模型。
2. 带上选定的 service/action/model 调用 `get_model_info` 验证参数和条件输入规则。
3. 如果请求昂贵、耗时或批量，先确认。
4. 调用 `create_task`。
5. 返回 task ID、status、output URLs 和可用的 cost 字段。

### 只提交不等待

```text
创建任务，但不要等待完成。
```

预期行为：

1. 调用 `create_task`，传入 `wait: false`。
2. 返回 task ID。
3. 之后可以用 `get_task` 查询状态。

### 查询余额

```text
查询我的 RunAPI 余额。
```

预期行为：

1. 调用 `check_balance`。
2. 如果没有配置 key，说明如何设置 `RUNAPI_API_KEY`。

### LLM Chat

```text
用 RunAPI 的 LLM 模型总结这个文件。
```

预期行为：

1. 必要时用目录工具查找当前 LLM model slug。
2. 调用 `chat`，不要调用 `create_task`。
3. 返回模型响应和可用的 usage metadata。

---

## Catalog Coverage

内嵌目录来自 RunAPI 的 contract 快照。
它包含媒体模型、工具类 endpoint 和 LLM model slugs。

| Modality | 使用方式 |
|---|---|
| Image | `list_models` with `modality: "image"` |
| Video | `list_models` with `modality: "video"` |
| Audio and music | `list_models` with `modality: "audio"` |
| LLM | `list_models` with `modality: "llm"` |
| Utility | `list_models` with `modality: "utility"` |

目录内容会随着版本变化。
请用 `list_models` 获取当前 service/action/model slugs，用 `get_model_info` 查看当前约束。

---

## Pricing

价格通过 `check_pricing` 工具和公开 pricing 页面查询。
不要依赖 README 示例里的固定数字。

推荐流程：

1. 调用 `list_models` 找候选模型。
2. 调用 `check_pricing`，传入 `service`、`action` 和 `model`。
3. 展示返回的价格快照，或链接到 [runapi.ai/pricing](https://runapi.ai/pricing)。

免费目录工具不会创建任务，也不会消耗余额。

---

## 平台配置

### Claude Code

```bash
npx @runapi.ai/mcp init claude
```

会在当前目录写入 `.mcp.json`。
修改 MCP 配置后需要重启 Claude Code。

### Cursor

```bash
npx @runapi.ai/mcp init cursor
```

会写入 `.cursor/mcp.json`。

### VS Code

```bash
npx @runapi.ai/mcp init vscode
```

会写入 `.vscode/mcp.json`。
VS Code 生成配置使用顶层 `servers` 和 `type: "stdio"`。

### Windsurf

```bash
npx @runapi.ai/mcp init windsurf
```

### Roo Code

```bash
npx @runapi.ai/mcp init roo
```

会写入 `.roo/mcp.json`。

---

## 配置

Server 按以下顺序读取配置：

1. `RUNAPI_API_KEY` 环境变量
2. `~/.config/runapi/config.json`
3. 无 key，仅允许免费目录工具

示例配置：

```json
{
  "apiKey": "your_runapi_key"
}
```

不要提交真实 API Key。

---

## Data Sync

包内包含构建时数据：

- `data/contract.json`：目录、action、model slug 和输入约束
- `data/pricing.json`：`check_pricing` 使用的价格快照

发布前刷新数据：

```bash
npm run sync:data
```

---

## 开发

```bash
npm install
npm run typecheck
npm test
npm pack --dry-run
```

本地启动：

```bash
npm run dev
```

---

## Package Contents

npm 包包含：

- 编译后的 `dist/`
- 内嵌 `data/`
- 平台示例
- Claude Code plugin 文件
- eval scenarios
- README、CHANGELOG、LICENSE、package metadata

不包含 `node_modules`、`.env`、本地配置文件或 API Key。

---

## License

[MIT](LICENSE)
