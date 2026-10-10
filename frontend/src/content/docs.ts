// Tokensbeat documentation is maintained here in both supported locales.
// Examples use public model IDs and customer keys, never upstream credentials.
export type DocText = { en: string; zh: string }
const l = (en: string, zh: string): DocText => ({ en, zh })
export type DocBlock =
  | { type: 'text' | 'note'; text: DocText }
  | { type: 'steps' | 'list'; items: DocText[] }
  | { type: 'code'; label: string; code: string }
  | { type: 'table'; headings: DocText[]; rows: DocText[][] }
  | { type: 'links'; items: { label: DocText; href: string }[] }
export interface DocSection { id: string; title: DocText; blocks: DocBlock[] }
export interface DocArticle { slug: string; group: string; title: DocText; description: DocText; sections: DocSection[] }

export const docsUi = {
  title: l('Documentation', '使用文档'),
  search: l('Search documentation', '搜索文档'),
  noResults: l('No matching guides. Try “API”, “Codex”, or “billing”.', '未找到相关指南，试试「API」「Codex」或「计费」。'),
  navigation: l('Browse guides', '浏览指南'),
  onThisPage: l('On this page', '本页内容'),
  previous: l('Previous', '上一篇'),
  next: l('Next', '下一篇'),
  copy: l('Copy', '复制'),
  copied: l('Copied', '已复制'),
  copyFailed: l('Select the code and copy it manually.', '请选中代码并手动复制。'),
  notFound: l('Guide not found', '未找到文档'),
  notFoundBody: l('Choose a guide from the sidebar or return to the quickstart.', '请从侧栏选择指南，或返回快速开始。'),
  quickstart: l('Start building', '快速开始'),
  keys: l('Get an API key', '获取 API 密钥'),
  home: l('Home', '主页'),
}
export const docGroups = [
  { id: 'start', title: l('Get started', '快速开始') },
  { id: 'cli', title: l('CLI setup', 'CLI 配置') },
  { id: 'api', title: l('API guides', 'API 接入') },
  { id: 'help', title: l('Help', '常见问题') },
]

const bashKey = `export TOKENSBEAT_API_KEY='YOUR_TOKENSBEAT_API_KEY'`
const powershellKey = `$env:TOKENSBEAT_API_KEY = 'YOUR_TOKENSBEAT_API_KEY'`
const models = String.raw`curl https://api.tokensbeat.com/v1/models \
  -H "Authorization: Bearer $TOKENSBEAT_API_KEY"`
const chat = String.raw`curl https://api.tokensbeat.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKENSBEAT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-3.8",
    "messages": [{"role": "user", "content": "Reply with OK only."}],
    "max_tokens": 128,
    "chat_template_kwargs": {"enable_thinking": false}
  }'`
const responses = String.raw`curl -N https://api.tokensbeat.com/v1/responses \
  -H "Authorization: Bearer $TOKENSBEAT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.6-sol",
    "input": "Reply with OK only.",
    "stream": true,
    "store": false
  }'`
const keyLinks: DocBlock = { type: 'links', items: [
  { label: l('Open API keys', '打开 API 密钥'), href: '/keys' },
  { label: l('View usage', '查看用量'), href: '/usage' },
] }

export const docArticles: DocArticle[] = [
  {
    slug: 'quickstart', group: 'start', title: l('Quickstart', '快速开始'),
    description: l('Your first request, from API key to response.', '从创建密钥到获得第一个响应。'),
    sections: [
      { id: 'connect', title: l('One endpoint for your applications', '统一的 API 地址'), blocks: [
        { type: 'text', text: l('Tokensbeat provides credit-based access to language models through an OpenAI-compatible API. Connect your application with a Tokensbeat API key and choose a model available to its group.', 'Tokensbeat 通过兼容 OpenAI 的 API 提供按用量计费的模型服务。使用 Tokensbeat API 密钥，并选择该密钥分组支持的模型。') },
        { type: 'code', label: 'Base URL', code: 'https://api.tokensbeat.com/v1' },
      ] },
      { id: 'prepare', title: l('Create your account and key', '准备账户与密钥'), blocks: [
        { type: 'steps', items: [
          l('Sign up at tokensbeat.com and verify your email. You will arrive at your dashboard.', '在 tokensbeat.com 注册并验证邮箱，随后进入控制台。'),
          l('Check that your account has a positive credit balance before making requests.', '调用前，确认账户中有可用余额。'),
          l('Open API Keys, create a key, and select the Qwen 3.8 group for this example. Set a spending limit and expiry if needed.', '打开「API 密钥」，创建密钥并选择 Qwen 3.8 分组。可按需设置消费限额和有效期。'),
        ] }, keyLinks,
      ] },
      { id: 'first-request', title: l('Send a request', '发送第一个请求'), blocks: [
        { type: 'text', text: l('In a Bash terminal, replace the placeholder with your customer API key, then run the request below. Keep the key on your server or local machine.', '在 Bash 终端中，将占位符替换为你的用户 API 密钥，然后执行下面的请求。密钥应保存在服务端或本地环境中。') },
        { type: 'code', label: 'Bash · environment', code: bashKey },
        { type: 'code', label: 'cURL · Qwen 3.8', code: chat },
        { type: 'text', text: l('Read the answer from choices[0].message.content. The usage object contains token counts. Open Usage in your dashboard to see the recorded charge.', '回答位于 choices[0].message.content，usage 包含 token 数量。前往控制台的「使用记录」查看扣费。') },
        { type: 'links', items: [{ label: l('Windows and WSL instructions', 'Windows 与 WSL 配置'), href: '/docs/windows-wsl' }, { label: l('Use Codex instead', '配置 Codex'), href: '/docs/codex' }] },
      ] },
    ],
  },
  {
    slug: 'api-keys', group: 'start', title: l('API keys', 'API 密钥管理'),
    description: l('Create credentials for each app and control how they are used.', '为不同应用创建密钥，并控制使用范围。'),
    sections: [
      { id: 'create', title: l('Create a key', '创建密钥'), blocks: [
        { type: 'steps', items: [l('Sign in and open API Keys.', '登录后打开「API 密钥」。'), l('Choose a descriptive name and the model group your application needs.', '填写便于识别的名称，并选择应用需要的模型分组。'), l('Set a quota in USD and an expiration date if required, then copy the generated key.', '按需设置美元消费限额和有效期，然后复制生成的密钥。')] }, keyLinks,
      ] },
      { id: 'authentication', title: l('Authenticate requests', '请求认证'), blocks: [
        { type: 'code', label: 'HTTP header', code: 'Authorization: Bearer YOUR_TOKENSBEAT_API_KEY' },
        { type: 'text', text: l('Use the API key created in Tokensbeat. Website login sessions and upstream provider keys are not customer API credentials.', '请使用在 Tokensbeat 创建的 API 密钥。网站登录会话和上游服务商密钥不能代替用户 API 密钥。') },
      ] },
      { id: 'limits', title: l('Groups, quotas, and rotation', '分组、额度与密钥更换'), blocks: [
        { type: 'list', items: [
          l('A key belongs to one group. Use a Qwen 3.8 key for qwen-3.8 and a Right Code key for the available GPT models.', '每个密钥绑定一个分组。qwen-3.8 使用 Qwen 3.8 分组密钥，GPT 模型使用 Right Code 分组密钥。'),
          l('A key quota limits spending; it does not add funds to your account. A positive account balance is also required.', '密钥限额用于限制消费，不会增加账户余额。调用仍需要可用余额。'),
          l('Quota checks happen before a request. A request already running can cross the limit; later requests are blocked.', '限额在请求开始前检查。正在执行的请求可能超出剩余额度，之后的请求将被拦截。'),
          l('Use a separate key per app. If a key is exposed, revoke it and create a replacement. Never put keys in public repositories or browser bundles.', '建议每个应用使用独立密钥。泄露后立即撤销并更换，不要把密钥放入公开仓库或浏览器代码。'),
        ] },
      ] },
    ],
  },
  {
    slug: 'models', group: 'start', title: l('Groups and models', '分组与模型'),
    description: l('Choose the right group, model ID, and API protocol.', '选择对应的分组、模型 ID 和 API 协议。'),
    sections: [
      { id: 'available-models', title: l('Available model groups', '可用模型分组'), blocks: [
        { type: 'table', headings: [l('Group', '分组'), l('Model IDs', '模型 ID'), l('API', '接口')], rows: [
          [l('Qwen 3.8', 'Qwen 3.8'), l('qwen-3.8', 'qwen-3.8'), l('Chat Completions; Responses compatibility', 'Chat Completions；Responses 兼容接口')],
          [l('Right Code', 'Right Code'), l('gpt-5.5, gpt-5.6-sol, gpt-6-sol, gpt-6.1-sol, gpt-6-astra', 'gpt-5.5, gpt-5.6-sol, gpt-6-sol, gpt-6.1-sol, gpt-6-astra'), l('Responses', 'Responses')],
        ] },
        { type: 'note', text: l('Model availability can change. Query /models with the same key your application uses. The quickstart uses qwen-3.8; the Codex guide uses gpt-5.6-sol.', '模型供应可能变化，请使用应用实际使用的密钥查询 /models。快速开始示例使用 qwen-3.8，Codex 指南使用 gpt-5.6-sol。') },
      ] },
      { id: 'discovery', title: l('List models for your key', '查询密钥可用的模型'), blocks: [
        { type: 'code', label: 'cURL · Bash', code: models },
        { type: 'text', text: l('Use an exact id from data in your model field. A key in one group does not automatically grant access to the other group.', '将 data 中的准确 id 填入 model 字段。一个分组的密钥不会自动获得另一个分组的访问权限。') },
      ] },
      { id: 'qwen', title: l('Qwen3.8-Flash', 'Qwen3.8-Flash'), blocks: [
        { type: 'text', text: l('The public model ID is qwen-3.8. This deployment has a 262,144-token context window. Start with the Chat Completions examples for ordinary text requests.', '公开模型 ID 为 qwen-3.8。当前部署的上下文窗口为 262,144 tokens。普通文本调用可直接使用 Chat Completions 示例。') },
        { type: 'links', items: [{ label: l('Qwen pricing and billing', 'Qwen 价格与计费'), href: '/docs/billing' }] },
      ] },
    ],
  },
  {
    slug: 'billing', group: 'start', title: l('Credits and billing', '余额与计费'),
    description: l('Understand token charges and check every request in your usage history.', '了解 token 费用，并在使用记录中核对每次请求。'),
    sections: [
      { id: 'credits', title: l('Pay from your credit balance', '按用量扣除余额'), blocks: [
        { type: 'text', text: l('Tokensbeat currently uses prepaid credits. Successful model requests deduct their recorded usage cost from your balance. Check your dashboard for available credit and Usage for request details.', 'Tokensbeat 当前使用预付余额。模型请求按记录的用量扣费。可在控制台查看余额，并在「使用记录」查看请求详情。') },
        { type: 'text', text: l('When online top-ups are available, choose an amount and an enabled payment method on the homepage. A payment must be confirmed before credit is added. If checkout is unavailable, contact your account administrator.', '开放在线充值时，可在主页选择金额和已启用的支付方式。支付确认后余额才会入账。如果暂时无法充值，请联系账户管理员。') },
        { type: 'links', items: [{ label: l('Open dashboard', '打开控制台'), href: '/dashboard' }, { label: l('View usage', '查看使用记录'), href: '/usage' }] },
      ] },
      { id: 'qwen-rates', title: l('Qwen3.8-Flash prices', 'Qwen3.8-Flash 价格'), blocks: [
        { type: 'table', headings: [l('Token type', 'Token 类型'), l('USD per 1 million tokens', '每 100 万 tokens，美元')], rows: [
          [l('Input', '输入'), l('$0.15', '$0.15')], [l('Output', '输出'), l('$0.47', '$0.47')], [l('Reported cached input', '上游报告的缓存输入'), l('$0.016', '$0.016')],
        ] },
        { type: 'text', text: l('Rates configured on October 8, 2026. Cached-input pricing applies only to cache-hit tokens reported by the upstream. Reported reasoning tokens are part of output usage. For other models, check the current prices in Available Channels.', '以上价格配置于 2026 年 10 月 8 日。缓存价格仅适用于上游报告的缓存命中 tokens，报告的推理 tokens 计入输出用量。其他模型请在「可用渠道」查看当前价格。') },
        { type: 'links', items: [{ label: l('Available channels', '可用渠道'), href: '/available-channels' }, { label: l('Alibaba Cloud price reference', '阿里云价格参考'), href: 'https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash' }] },
      ] },
      { id: 'calculation', title: l('Check a charge', '核对费用'), blocks: [
        { type: 'code', label: 'USD', code: 'cost = uncached_input_tokens × 0.15 / 1,000,000\n     + cached_input_tokens   × 0.016 / 1,000,000\n     + output_tokens         × 0.47 / 1,000,000' },
        { type: 'text', text: l('For example, 17 uncached input tokens and 2 output tokens cost $0.00000349. Usage history records the model, tokens, time, and charge. For a discrepancy, share the request ID with your administrator, never your API key.', '例如，17 个非缓存输入 tokens 加上 2 个输出 tokens 的费用为 $0.00000349。使用记录包含模型、tokens、时间与扣费。如需核查，请向管理员提供请求 ID，不要提供 API 密钥。') },
      ] },
    ],
  },
  {
    slug: 'codex', group: 'cli', title: l('Codex configuration', 'Codex 配置'),
    description: l('Connect Codex CLI to Tokensbeat with your own API key.', '通过 Tokensbeat API 密钥接入 Codex CLI。'),
    sections: [
      { id: 'install', title: l('Install Codex CLI', '安装 Codex CLI'), blocks: [
        { type: 'text', text: l('Create a Tokensbeat key in the Right Code group. Install the current Codex CLI with Node.js and npm available on your machine.', '先创建 Right Code 分组的 Tokensbeat 密钥。在已安装 Node.js 和 npm 的环境中安装 Codex CLI。') },
        { type: 'code', label: 'Terminal', code: 'npm install -g @openai/codex@latest\ncodex --version' },
      ] },
      { id: 'key', title: l('Set your API key', '设置 API 密钥'), blocks: [
        { type: 'text', text: l('Set this variable in the terminal where you will launch Codex. Replace the placeholder with your Tokensbeat key.', '在将要启动 Codex 的终端中设置环境变量，并用你的 Tokensbeat 密钥替换占位符。') },
        { type: 'code', label: 'macOS / Linux / WSL · Bash', code: bashKey },
        { type: 'code', label: 'Windows · PowerShell', code: powershellKey },
      ] },
      { id: 'configuration', title: l('Configure the provider', '配置服务商'), blocks: [
        { type: 'text', text: l('Back up your existing user configuration, then merge these settings into ~/.codex/config.toml (Windows: %USERPROFILE%\\.codex\\config.toml). Keep top-level settings before TOML tables and avoid duplicate keys. Leave your existing approval and sandbox settings in place.', '先备份用户配置，再将以下设置合并至 ~/.codex/config.toml（Windows：%USERPROFILE%\\.codex\\config.toml）。顶层配置需放在 TOML 表之前，避免重复定义。保留原有审批和沙箱设置。') },
        { type: 'code', label: 'config.toml', code: 'model = "gpt-5.6-sol"\nmodel_provider = "tokensbeat"\n\n[model_providers.tokensbeat]\nname = "Tokensbeat"\nbase_url = "https://api.tokensbeat.com/v1"\nwire_api = "responses"\nenv_key = "TOKENSBEAT_API_KEY"\nrequires_openai_auth = false\nsupports_websockets = false' },
      ] },
      { id: 'launch', title: l('Launch and verify', '启动并验证'), blocks: [
        { type: 'code', label: 'Terminal', code: 'codex' },
        { type: 'text', text: l('Restart Codex after changing provider settings. Send a short prompt and check Tokensbeat Usage for the request. Your key must allow gpt-5.6-sol and your account must have credit. GUI clients also need access to the environment variable.', '更改服务商设置后重启 Codex。发送一个简短提示词，并在 Tokensbeat 使用记录中确认请求。密钥需支持 gpt-5.6-sol，且账户需有余额。图形界面客户端也需要能读取该环境变量。') },
        { type: 'links', items: [{ label: l('Official Codex configuration reference', 'Codex 官方配置参考'), href: 'https://learn.chatgpt.com/docs/config-file/config-reference' }] },
      ] },
    ],
  },
  {
    slug: 'windows-wsl', group: 'cli', title: l('Windows and WSL', 'Windows 与 WSL'),
    description: l('Use the correct environment and shell syntax on Windows.', '在 Windows 上使用正确的环境和命令语法。'),
    sections: [
      { id: 'powershell', title: l('PowerShell quickstart', 'PowerShell 快速开始'), blocks: [
        { type: 'text', text: l('Use Invoke-RestMethod for a native PowerShell request. This example requires a Qwen 3.8 group key.', '使用 PowerShell 原生的 Invoke-RestMethod 发起请求。此示例需要 Qwen 3.8 分组密钥。') },
        { type: 'code', label: 'PowerShell', code: powershellKey + String.raw`

$headers = @{ Authorization = "Bearer $env:TOKENSBEAT_API_KEY" }
$body = @{
  model = 'qwen-3.8'
  messages = @(@{ role = 'user'; content = 'Reply with OK only.' })
  max_tokens = 128
  chat_template_kwargs = @{ enable_thinking = $false }
} | ConvertTo-Json -Depth 5

$reply = Invoke-RestMethod ` + '`' + String.raw`
  -Uri 'https://api.tokensbeat.com/v1/chat/completions' ` + '`' + String.raw`
  -Method Post -Headers $headers -ContentType 'application/json' -Body $body
$reply.choices[0].message.content` },
      ] },
      { id: 'wsl', title: l('Keep WSL configuration inside WSL', '在 WSL 内配置运行环境'), blocks: [
        { type: 'text', text: l('If you run Codex inside WSL, install Node.js and Codex there, set TOKENSBEAT_API_KEY in that shell, and edit the Linux user’s ~/.codex/config.toml. The Windows user directory and environment are separate.', '如果在 WSL 内运行 Codex，请在 WSL 中安装 Node.js 和 Codex，设置 TOKENSBEAT_API_KEY，并编辑 Linux 用户目录下的 ~/.codex/config.toml。Windows 用户目录与环境变量是独立的。') },
        { type: 'code', label: 'WSL · Bash', code: 'node --version\nnpm --version\ncodex --version' },
        { type: 'links', items: [{ label: l('Continue with Codex configuration', '继续配置 Codex'), href: '/docs/codex' }] },
      ] },
    ],
  },
  {
    slug: 'chat-completions', group: 'api', title: l('Chat Completions', 'Chat Completions'),
    description: l('Send messages to Qwen and receive JSON or a text stream.', '向 Qwen 发送消息，获得 JSON 响应或文本流。'),
    sections: [
      { id: 'request', title: l('Create a completion', '创建对话请求'), blocks: [
        { type: 'text', text: l('POST /v1/chat/completions accepts a model and messages array. Use a key in the Qwen 3.8 group. The example disables Qwen thinking for a short answer.', 'POST /v1/chat/completions 接收 model 和 messages 数组。请使用 Qwen 3.8 分组密钥。示例关闭了 Qwen 思考模式，以便得到简短回答。') },
        { type: 'code', label: 'cURL · Bash', code: chat },
      ] },
      { id: 'streaming', title: l('Stream the answer', '流式输出'), blocks: [
        { type: 'text', text: l('Add stream: true and stream_options.include_usage: true to the request. Use curl -N to display events as they arrive. Read text from choices[].delta.content and usage from the final usage event.', '在请求中添加 stream: true 和 stream_options.include_usage: true。使用 curl -N 实时显示事件，从 choices[].delta.content 读取文本，从最后的用量事件读取 usage。') },
        { type: 'code', label: 'JSON · additional fields', code: '{\n  "stream": true,\n  "stream_options": { "include_usage": true }\n}' },
        { type: 'note', text: l('A streaming HTTP 200 only confirms that the stream opened. Check error events and the final completion marker before treating the response as successful.', '流式请求的 HTTP 200 仅表示连接已经建立。请检查流中的错误事件和最终结束标记，确认响应是否完整成功。') },
      ] },
    ],
  },
  {
    slug: 'responses', group: 'api', title: l('Responses API', 'Responses API'),
    description: l('Use the endpoint that powers GPT requests and Codex.', '使用 GPT 请求与 Codex 对应的接口。'),
    sections: [
      { id: 'request', title: l('Create a streamed response', '创建流式响应'), blocks: [
        { type: 'text', text: l('Use POST /v1/responses with a Right Code group key for GPT models. The example below uses the verified model gpt-5.6-sol.', 'GPT 模型使用 Right Code 分组密钥调用 POST /v1/responses。以下示例使用已验证的 gpt-5.6-sol。') },
        { type: 'code', label: 'cURL · Bash', code: responses },
      ] },
      { id: 'events', title: l('Read server-sent events', '处理 SSE 事件'), blocks: [
        { type: 'list', items: [
          l('Append response.output_text.delta events to display the answer.', '将 response.output_text.delta 事件中的内容追加显示为回答。'),
          l('Wait for response.completed with completed status and inspect its usage.', '等待状态为 completed 的 response.completed 事件，并读取其中的 usage。'),
          l('Handle response.failed and error events, even after an HTTP 200.', '即使 HTTP 状态为 200，也需处理 response.failed 和 error 事件。'),
        ] },
      ] },
      { id: 'compatibility', title: l('Compatibility and state', '兼容性与会话状态'), blocks: [
        { type: 'text', text: l('Use HTTP streaming, with store: false. For multi-turn conversations, send the needed conversation history in input. Do not assume provider-hosted response storage or WebSocket support.', '请使用 HTTP 流式传输，并设置 store: false。多轮对话请在 input 中传入所需的历史上下文，不要依赖服务商托管的响应存储或 WebSocket。') },
        { type: 'text', text: l('Qwen 3.8 keys can also send basic text requests here using model qwen-3.8. Those requests are adapted to Chat Completions; advanced Responses features depend on upstream support.', 'Qwen 3.8 分组密钥也可以使用 qwen-3.8 调用此接口发送基本文本请求。请求会转换为 Chat Completions，高级 Responses 功能取决于上游支持情况。') },
      ] },
    ],
  },
  {
    slug: 'sdks', group: 'api', title: l('Python and JavaScript', 'Python 与 JavaScript'),
    description: l('Use the OpenAI SDK with the Tokensbeat base URL.', '通过 OpenAI SDK 连接 Tokensbeat API。'),
    sections: [
      { id: 'python', title: l('Python', 'Python'), blocks: [
        { type: 'code', label: 'Install', code: 'python -m pip install openai' },
        { type: 'code', label: 'Python · Qwen 3.8', code: 'import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    api_key=os.environ["TOKENSBEAT_API_KEY"],\n    base_url="https://api.tokensbeat.com/v1",\n)\n\nreply = client.chat.completions.create(\n    model="qwen-3.8",\n    messages=[{"role": "user", "content": "Reply with OK only."}],\n    max_tokens=128,\n    extra_body={"chat_template_kwargs": {"enable_thinking": False}},\n)\nprint(reply.choices[0].message.content)\nprint(reply.usage)' },
      ] },
      { id: 'javascript', title: l('JavaScript', 'JavaScript'), blocks: [
        { type: 'code', label: 'Install', code: 'npm install openai' },
        { type: 'code', label: 'Node.js · Qwen 3.8 · example.mjs', code: 'import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: process.env.TOKENSBEAT_API_KEY,\n  baseURL: "https://api.tokensbeat.com/v1",\n});\n\nconst reply = await client.chat.completions.create({\n  model: "qwen-3.8",\n  messages: [{ role: "user", content: "Reply with OK only." }],\n  max_tokens: 128,\n  chat_template_kwargs: { enable_thinking: false },\n});\nconsole.log(reply.choices[0].message.content);\nconsole.log(reply.usage);' },
        { type: 'note', text: l('Run these examples on your server or local machine with TOKENSBEAT_API_KEY set. Do not enable browser-side API-key use.', '请先设置 TOKENSBEAT_API_KEY，然后在服务端或本地运行示例。不要在浏览器端暴露 API 密钥。') },
      ] },
    ],
  },
  {
    slug: 'compatible-apps', group: 'api', title: l('Compatible apps', '第三方应用接入'),
    description: l('Connect an app that supports a custom OpenAI-compatible provider.', '接入支持自定义 OpenAI 兼容服务商的应用。'),
    sections: [
      { id: 'settings', title: l('Provider settings', '服务商设置'), blocks: [
        { type: 'text', text: l('For apps with a custom OpenAI-compatible Chat Completions provider, use a Qwen 3.8 key and the values below. Field names vary between apps.', '如果应用支持自定义 OpenAI 兼容 Chat Completions 服务商，可使用 Qwen 3.8 分组密钥和以下配置。不同应用的字段名称可能不同。') },
        { type: 'table', headings: [l('Setting', '设置'), l('Value', '值')], rows: [
          [l('Provider name', '服务商名称'), l('Tokensbeat', 'Tokensbeat')],
          [l('API base URL', 'API 基础地址'), l('https://api.tokensbeat.com/v1', 'https://api.tokensbeat.com/v1')],
          [l('API key', 'API 密钥'), l('Your Tokensbeat customer key', '你的 Tokensbeat 用户密钥')],
          [l('Model', '模型'), l('qwen-3.8', 'qwen-3.8')],
        ] },
      ] },
      { id: 'check', title: l('Verify the connection', '验证连接'), blocks: [
        { type: 'steps', items: [
          l('Save the provider, refresh the model list if supported, and select qwen-3.8.', '保存服务商，按需刷新模型列表，然后选择 qwen-3.8。'),
          l('Send a short text message and check that a usage entry appears in Tokensbeat.', '发送简短文本，并确认 Tokensbeat 中出现对应使用记录。'),
          l('If the app appends /v1 automatically, enter https://api.tokensbeat.com as its host. The final chat endpoint must end in /v1/chat/completions, with /v1 only once.', '如果应用自动添加 /v1，请将主机地址填为 https://api.tokensbeat.com。最终对话地址应以 /v1/chat/completions 结尾，且只出现一次 /v1。'),
        ] },
        { type: 'text', text: l('GPT models require an app with Responses API support and a Right Code group key. Selecting an OpenAI label alone does not guarantee that the app uses Responses.', 'GPT 模型需要应用支持 Responses API，并使用 Right Code 分组密钥。仅选择名为 OpenAI 的服务商，并不代表应用一定使用 Responses。') },
      ] },
    ],
  },
  {
    slug: 'troubleshooting', group: 'help', title: l('Troubleshooting', '常见问题'),
    description: l('Resolve authentication, model, balance, and connection errors.', '排查认证、模型、余额与连接问题。'),
    sections: [
      { id: 'errors', title: l('Common responses', '常见响应状态'), blocks: [
        { type: 'table', headings: [l('Status', '状态'), l('What to check', '检查方法')], rows: [
          [l('400', '400'), l('Check JSON, model parameters, and the API protocol used by your client.', '检查 JSON 格式、模型参数和客户端使用的 API 协议。')],
          [l('401', '401'), l('Check the Bearer header and whether your Tokensbeat key is valid and active.', '检查 Bearer 认证头，以及 Tokensbeat 密钥是否有效且已启用。')],
          [l('403', '403'), l('Check your balance, group access, key restrictions, and account status.', '检查账户余额、分组权限、密钥限制与账户状态。')],
          [l('404', '404'), l('Check the endpoint and model ID. Run /models with the same key.', '检查接口地址与模型 ID，使用同一密钥查询 /models。')],
          [l('429', '429'), l('Check the key quota and rate limits. For rate limits, reduce concurrency and retry with backoff; an exhausted spending quota needs adjustment.', '检查密钥消费限额与请求速率。速率受限时请降低并发并退避重试；消费限额耗尽则需要调整限额。')],
          [l('5xx', '5xx'), l('The service or upstream may be unavailable. Retry cautiously and check usage before repeating a completed request.', '服务或上游可能暂时不可用。请谨慎重试，并在重复已完成的请求前检查使用记录。')],
        ] },
      ] },
      { id: 'codex-login', title: l('Codex keeps asking you to sign in', 'Codex 仍然要求登录'), blocks: [
        { type: 'text', text: l('Confirm model_provider is tokensbeat, requires_openai_auth is false, and TOKENSBEAT_API_KEY exists in the process that starts Codex. Check for another configuration overriding your provider, then restart the client.', '确认 model_provider 为 tokensbeat，requires_openai_auth 为 false，且启动 Codex 的进程能读取 TOKENSBEAT_API_KEY。检查是否有其他配置覆盖服务商设置，然后重启客户端。') },
      ] },
      { id: 'support', title: l('Share useful diagnostics', '提供有效的排查信息'), blocks: [
        { type: 'text', text: l('Record the request time, model, HTTP status, error message, and request ID. Send those to your account administrator with any sensitive prompt content removed. Never include your full API key.', '记录请求时间、模型、HTTP 状态、错误信息和请求 ID。移除敏感提示词后，将这些信息提供给账户管理员。不要附带完整 API 密钥。') }, keyLinks,
      ] },
    ],
  },
]
