<h1 align="center">RunAPI MCP Server</h1>

<p align="center">
  <strong>一个 MCP Server，把 RunAPI 的模型发现、价格查询、媒体任务和账户状态接入 AI 编程工具。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@runapi.ai/mcp"><img src="https://img.shields.io/npm/v/%40runapi.ai/mcp?style=flat-square&color=blue" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-lightgrey?style=flat-square" alt="Apache-2.0 license"></a>
  <img src="https://img.shields.io/badge/Type-MCP_Server-blue?style=flat-square" alt="MCP Server">
</p>

---

## 这是什么？

RunAPI MCP Server 让 Claude Code、Cursor、VS Code、Windsurf、Roo 等 MCP Host 可以直接使用 RunAPI。
它支持浏览模型目录、查看模型输入参数、查询价格快照、创建媒体任务、轮询任务状态和查询账户余额。

目录发现工具不需要 API Key，因为它们使用包内嵌的构建时目录数据。
认证工具可以使用 `login` tool、`runapi login`、`RUNAPI_API_KEY` 或共享的 RunAPI config。

---

## 快速开始

Claude Code、Cursor、Windsurf 和 VS Code 推荐使用 Claude Code 的 MCP 命令安装：

```bash
claude mcp add runapi -s user -- npx -y @runapi.ai/mcp
```

scope 参数决定 MCP Server 配置保存在哪里：

- `-s user`：全局配置，对当前用户的所有项目可用。
- `-s project`：团队共享配置，写入当前仓库的 `.mcp.json`，可以提交到 repo。

如果希望团队共享同一份配置，使用 project scope：

```bash
claude mcp add runapi -s project -- npx -y @runapi.ai/mcp
```

非 Claude Code 平台或手动 JSON 配置的兼容 fallback：

```json
{
  "mcpServers": {
    "runapi": {
      "command": "npx",
      "args": ["-y", "@runapi.ai/mcp"]
    }
  }
}
```

如果你的 MCP Host 需要生成平台专用配置文件，可以把旧的 `init` 命令作为 fallback：

```bash
npx @runapi.ai/mcp init claude
npx @runapi.ai/mcp init cursor
npx @runapi.ai/mcp init vscode
npx @runapi.ai/mcp init windsurf
npx @runapi.ai/mcp init roo
```

免费目录工具登录前即可使用。
创建任务、查询任务和查询余额时，让助手调用 `login` tool。它会打开浏览器登录，并把凭据保存到 `~/.config/runapi/config.json`，也就是 `runapi login` 使用的同一个文件。
无浏览器或 CI 环境仍然可以在启动 MCP Host 前设置 `RUNAPI_API_KEY`。

---

## 工具

| Tool | 认证 | 用途 |
|---|---|---|
| `list_models` | 否 | 从内嵌目录列出 RunAPI 模型，支持 `modality`、`service`、`action` 过滤。 |
| `get_model_info` | 否 | 返回某个模型 slug 的 service、action、modality、输入约束和价格快照。模型出现在多个 endpoint 时，带上 `service` + `action` 精确查询。 |
| `list_actions` | 否 | 按 modality 分组列出 endpoint action 名称。 |
| `check_pricing` | 否 | 查询 `service` + `action` + `model` 组合的价格快照。 |
| `search_prompts` | 否 | 按 `modality`、`category`、`tags`、`q`、`model`、`featured` 和分页搜索可复用 prompt 示例。 |
| `login` | 否 | 打开浏览器登录，并把 RunAPI 凭据保存到共享本地配置。 |
| `create_task` | 是 | 使用调用方生成的必填 `idempotency_key` 创建媒体任务，并可选择轮询到完成。 |
| `get_task` | 是 | 查询已有媒体任务的状态和最新 payload。 |
| `check_balance` | 是 | 查询账户余额和消费指标。 |

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

### 搜索 Prompt 示例

```text
找一些 logo 图片 prompt 示例。
```

预期行为：

1. 调用 `search_prompts`，传入 `modality: "image"` 和 `q: "logo"`。
2. 总结返回的 title、prompt text、model slug、category 和 tags。
3. 创建任务前，先用 `get_model_info` 检查选中模型的参数约束。

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
4. 为这个逻辑任务生成一个 opaque `idempotency_key`，再调用 `create_task`。
5. 返回 task ID、status、output URLs 和可用的 cost 字段。

### 只提交不等待

```text
创建任务，但不要等待完成。
```

预期行为：

1. 生成一个 opaque `idempotency_key`，再调用 `create_task` 并传入 `wait: false`。
2. 返回 task ID。
3. 之后可以用 `get_task` 查询状态。

### 安全重放任务创建

`create_task` 要求 1 到 512 个字符的 opaque `idempotency_key`。每个逻辑任务生成一个新 key，并把它与该任务的 `service`、`action`、`model` 和 `params` 一起保留。

如果连接中断或超时导致创建结果未知，不要自动创建另一个任务。只有在确实需要重试时，才对相同输入复用原 key；对不同输入复用同一个 key 会返回 conflict。不要从 JSON-RPC request ID 或 `X-Client-Request-Id` 推导这个 key。

如果 task 创建成功，但可选轮询超时或连接中断，响应仍会返回已创建的 `task_id`、当前状态和 warning。继续使用 `get_task` 查询，不要创建替代 task。

工具参数结构见 [`examples/create-task.arguments.json`](examples/create-task.arguments.json)。

### 查询余额

```text
查询我的 RunAPI 余额。
```

预期行为：

1. 调用 `check_balance`。
2. 如果没有配置 key，调用 `login` 进行浏览器登录；无浏览器环境则说明如何设置 `RUNAPI_API_KEY`。

## Catalog Coverage

内嵌目录来自 RunAPI 的 contract 快照。
它包含媒体模型、工具类 endpoint 和用于发现的 LLM model slugs。

| Modality | 使用方式 |
|---|---|
| Image | `list_models` with `modality: "image"` |
| Video | `list_models` with `modality: "video"` |
| Audio and music | `list_models` with `modality: "audio"` |
| LLM | `list_models` with `modality: "llm"` |
| Utility | `list_models` with `modality: "utility"` |

目录内容会随着版本变化。
请用 `list_models` 获取当前 service/action/model slugs，用 `get_model_info` 查看当前约束。
LLM 推理请直接通过 RunAPI API 或 SDK 接入。

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

### Claude Code、Cursor、Windsurf 和 VS Code

运行：

```bash
claude mcp add runapi -s user -- npx -y @runapi.ai/mcp
```

`-s user` 表示全局安装，对所有项目可用。
`-s project` 表示让 Claude Code 在仓库里写入 `.mcp.json`，用于团队共享配置。

修改 MCP 配置后，重启或重新加载你的 MCP Host。

### 兼容 Fallback：生成配置文件

只有当 Host 需要平台专用 JSON 文件，或无法使用 Claude Code MCP 命令时，才使用 `init`。

Claude Code fallback：

```bash
npx @runapi.ai/mcp init claude
```

会在当前目录写入 `.mcp.json`。

Cursor fallback：

```bash
npx @runapi.ai/mcp init cursor
```

会写入 `.cursor/mcp.json`。

VS Code fallback：

```bash
npx @runapi.ai/mcp init vscode
```

会写入 `.vscode/mcp.json`。
VS Code 生成配置使用顶层 `servers` 和 `type: "stdio"`。

Windsurf fallback：

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

1. `RUNAPI_API_KEY` 环境变量，适合无浏览器和 CI 环境
2. `~/.config/runapi/config.json`，由 MCP `login` tool 或 `runapi login` 创建
3. 无 key，仅允许免费目录工具

配置文件通常由登录流程管理。无浏览器环境预置配置时可以使用：

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
- eval scenarios
- README、CHANGELOG、LICENSE、package metadata

不包含 `node_modules`、`.env`、本地配置文件或 API Key。

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
