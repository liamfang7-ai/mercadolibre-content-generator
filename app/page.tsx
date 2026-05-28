import Link from "next/link";

const modes = [
  {
    title: "全自动模式",
    description:
      "适合已配置 OpenAI API Key 的情况。网页内自动生成商品标题、描述、核心卖点、图片图需和生图 Prompt。",
    href: "/auto",
    button: "进入全自动模式",
  },
  {
    title: "半自动模式",
    description:
      "无需 API Key。先复制任务书到 ChatGPT，得到结果后再粘贴回网页整理。",
    href: "/manual",
    button: "进入半自动模式",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#eef2f5] px-5 py-10 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6cdf]">
            LatAm Commerce Desk
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            美客多商品内容生成器
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            根据产品信息、关键词和图片，生成适合 Mercado Libre / Mercado Livre
            的商品内容、图片图需和生图 Prompt。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {modes.map((mode) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              key={mode.href}
            >
              <h2 className="text-2xl font-semibold text-slate-950">{mode.title}</h2>
              <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">
                {mode.description}
              </p>
              <Link
                className="mt-6 inline-flex rounded bg-[#2d6cdf] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f57ba]"
                href={mode.href}
              >
                {mode.button}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
