# Mercado Libre 商品内容生成器

这是一个独立的美客多商品内容生成工具，首页 `/` 提供：

- V1：生成可复制给 ChatGPT 的商品内容任务书
- V2：通过服务端接口调用 OpenAI，生成完整商品内容方案
- 产品图片本地上传和预览

图片只在浏览器本地预览；使用 AI 生成功能时，图片会以 base64 data URL 随本次请求发送给服务端接口，不保存、不写入数据库。

## 本地运行

```bash
npm run dev
```

打开 `http://localhost:3000`。

## OpenAI 配置

本地使用 AI 功能需要在项目根目录创建 `.env.local`：

```bash
OPENAI_API_KEY=你的_key
```

注意：

- 不要把 `.env.local` 提交到 GitHub。
- API Key 只在服务端 `app/api/generate/route.ts` 中读取，不会暴露给浏览器。
- Vercel 上线后，要在 `Project Settings -> Environment Variables` 里配置 `OPENAI_API_KEY`。

## 当前边界

当前版本只正式接入 OpenAI。

暂未接入：

- DeepSeek
- 自定义 AI 接口
- 图片生成 API
- Mercado Libre API
- Supabase
- 数据库
- 服务器图片存储

## 验证

```bash
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```
