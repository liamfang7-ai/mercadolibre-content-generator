"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

const productCategories = [
  "不确定，让 AI 判断",
  "车辆配件 / Auto Partes",
  "摩托车配件 / Moto Partes",
  "汽车用品 / Accesorios para Auto",
  "工具类 / Herramientas",
  "家居用品 / Hogar",
  "电子配件 / Electrónicos",
  "运动户外 / Deportes y Aire Libre",
  "宠物用品 / Mascotas",
  "美妆个护 / Belleza y Cuidado Personal",
  "其他",
] as const;

const productPositions = [
  "不确定，让 AI 判断",
  "性价比款",
  "高颜值款",
  "功能款",
  "家用款",
  "礼品款",
  "专业款",
  "维修替换件",
  "升级改装件",
  "耐用型配件",
  "通用型配件",
  "原厂替代款",
  "车主日常刚需款",
  "户外/越野使用款",
] as const;

const targetSites = [
  "Mercado Libre México",
  "Mercado Livre Brasil",
  "拉美通用 Mercado Libre / Mercado Livre",
] as const;

const visualStyles = [
  "Mercado Libre México 风格",
  "Mercado Livre Brasil 风格",
  "拉美通用电商风格",
  "专业汽配风格",
  "简洁高级风格",
  "让 AI 根据产品判断",
] as const;

const generationDepths = ["标准版", "详细版", "专业汽配版"] as const;

const outputLanguages = ["西语", "葡语", "中西双语", "中葡双语"] as const;

type FormState = {
  title: string;
  description: string;
  keywords: string;
  productCategory: (typeof productCategories)[number];
  productPosition: (typeof productPositions)[number];
  targetSite: (typeof targetSites)[number];
  visualStyle: (typeof visualStyles)[number];
  generationDepth: (typeof generationDepths)[number];
  outputLanguage: (typeof outputLanguages)[number];
};

type ResultModule = {
  title: string;
  useCase: string;
  content: string;
  badge?: string;
  featured?: boolean;
};

type UploadedImage = {
  id: string;
  name: string;
  size: number;
  url: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  keywords: "",
  productCategory: "不确定，让 AI 判断",
  productPosition: "不确定，让 AI 判断",
  targetSite: "Mercado Libre México",
  visualStyle: "Mercado Libre México 风格",
  generationDepth: "详细版",
  outputLanguage: "西语",
};

function displayValue(value: string) {
  return value.trim() || "需要卖家补充确认";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function createImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasSparseInfo(form: FormState) {
  return !form.title.trim() && !form.description.trim() && !form.keywords.trim();
}

function buildImageReminder(imageCount: number) {
  if (imageCount > 0) {
    return `已选择 ${imageCount} 张产品图片。我会随消息一起上传产品图片，请结合图片识别产品外观、结构、颜色、材质、配件、安装位置和细节。不要凭空改变产品外观。`;
  }

  return "当前未上传产品图片，建议补充产品主图、细节图、尺寸图、包装图或安装场景图，以获得更准确的图片图需和生图 Prompt。";
}

function buildProductInfo(form: FormState, imageCount: number) {
  const sparseWarning = hasSparseInfo(form)
    ? "\n当前商品信息不足，建议补充标题、描述、关键词、产品尺寸、材质、适配信息、包装清单和更多产品图片，以获得更准确结果。"
    : "";

  return `商品标题：${displayValue(form.title)}
商品描述：${displayValue(form.description)}
关键词：${displayValue(form.keywords)}
目标站点：${form.targetSite}
产品类目：${form.productCategory}
产品定位：${form.productPosition}
目标市场视觉风格：${form.visualStyle}
生成深度：${form.generationDepth}
输出语言：${form.outputLanguage}
产品图片：${buildImageReminder(imageCount)}${sparseWarning}`;
}

function getCustomerFacingLanguage(form: FormState) {
  if (form.targetSite === "Mercado Livre Brasil") {
    return "葡语";
  }

  if (form.targetSite === "Mercado Libre México") {
    return "西语";
  }

  return form.outputLanguage.includes("葡") ? "葡语" : "西语";
}

function buildLanguageHardRules(form: FormState) {
  const customerLanguage = getCustomerFacingLanguage(form);

  return `【语言硬性规则】
- Final product title, description, bullet points, SEO copy and image text must not contain Chinese.
- Use Spanish for Mercado Libre México.
- Use Portuguese for Mercado Livre Brasil.
- Do not place Chinese text on any image.
- Do not generate bilingual Chinese image text.
- Chinese can only appear in internal explanation for the seller, not in customer-facing content.
- 商品标题不能有中文。
- 商品描述不能有中文。
- 核心卖点 bullet points 不能有中文。
- SEO 文案不能有中文。
- 购买前确认提醒不能有中文。
- 图片主文案不能有中文。
- 图片辅助文案不能有中文。
- 生图 Prompt 中要求显示在图片上的文字不能有中文。
- 最终给客户看的任何文字都不能有中文。

语言执行规则：
1. 目标站点为 Mercado Libre México 时，商品标题、描述、卖点、图片文案必须使用西语。
2. 目标站点为 Mercado Livre Brasil 时，商品标题、描述、卖点、图片文案必须使用葡语。
3. 目标站点为拉美通用时，根据“输出语言”字段决定使用西语或葡语。
4. 如果用户选择“中西双语”或“中葡双语”，也只能用于后台分析说明，不允许用于最终商品描述和图片文案。
5. 图片上绝对不能出现中文。
6. 本次客户可见内容默认语言：${customerLanguage}。`;
}

function buildOriginalImageProtectionRules() {
  return `【产品原图保护规则】
- 必须基于用户上传的产品图片进行设计。
- 保持产品主体外观一致。
- 不改变产品形状。
- 不改变产品颜色。
- 不改变产品材质质感。
- 不增加不存在的零件、接口、按钮、灯珠、线材或包装。
- 不虚构品牌 Logo。
- 不虚构认证标识。
- 不虚构具体车型、年份、OE 编号或适配信息。
- 如果产品图片中看不清细节，必须标注“需要卖家补充确认”。
- 如果需要展示安装场景，只能做通用安装示意，不能虚构具体车型适配。
- 不允许把产品画成另一个产品。
- 不允许为了画面美观而改变产品结构。`;
}

function buildImageTextLanguageRules(form: FormState) {
  const customerLanguage = getCustomerFacingLanguage(form);
  const examples =
    customerLanguage === "葡语"
      ? `葡语风格示例：
- Encaixe universal
- Verifique a compatibilidade
- Instalação simples
- Material resistente
- Antes de comprar, confirme as medidas`
      : `西语风格示例：
- Ajuste universal
- Verifica compatibilidad
- Instalación sencilla
- Material resistente
- Antes de comprar, confirma medidas`;

  return `【图片文字语言规则】
- 图片主文案必须为西语或葡语。
- 图片辅助文案必须为西语或葡语。
- 不允许中文上图。
- 不允许中文大字报。
- 不允许中西混排或中葡混排。
- 每张图最多 1 个主标题 + 2-3 个短辅助点。
- 每张图图片文字总量不要超过 20 个词。
- 不要长段落。
- 文案必须短、自然、专业，适合拉美消费者。
- 汽配类产品优先使用专业但简单的表达。
- 本次图片文案默认使用：${customerLanguage}。

${examples}`;
}

function buildVisualSpec(form: FormState) {
  const customerLanguage = getCustomerFacingLanguage(form);

  return `【整套图片视觉规范】
1. 目标市场：${form.targetSite}
2. 目标市场视觉风格：${form.visualStyle}
3. 适合的审美方向：专业、干净、可信赖、信息层级清楚，接近 Mercado Libre / Mercado Livre 的专业电商图片。
4. 禁止使用的视觉风格：不要采用国内电商风格；不要大红大黄爆款风；不要密集文字；不要夸张促销贴纸；不要中文大字报；不要淘宝/拼多多式强刺激视觉。
5. 主色建议：白色、浅灰、深灰、黑色，保证产品主体清晰。
6. 辅助色建议：蓝色、冷灰、产品自身颜色的低饱和呼应。
7. 强调色建议：少量黄色或橙色点缀，只用于重点标签或尺寸引导，不做强促销。
8. 背景风格：白底、浅灰背景、车库、维修工具台、汽车内饰、汽车外观、户外道路、越野场景，根据产品属性选择。
9. 字体风格：现代无衬线字体，粗细层级清楚，避免花哨字体。
10. 文案密度要求：文案要短，留白要足，每张图最多 1 个主标题 + 2-3 个短辅助点，总文字不要超过 20 个词。
11. 产品展示规则：重点突出产品本身和使用价值；产品外观、颜色、材质、结构必须与原图一致。
12. 图片统一性要求：7 张图要保持统一色彩、字体、标签样式、留白比例和专业感。

硬性视觉规则：
- 图片风格必须适合 Mercado Libre México 或 Mercado Livre Brasil。
- 不要采用国内电商风格。
- 不要大红大黄爆款风。
- 不要密集文字。
- 不要夸张促销贴纸。
- 不要中文大字报。
- 不要淘宝/拼多多式强刺激视觉。
- 整体要专业、干净、可信赖。
- 文案要短，留白要足。
- 重点突出产品本身和使用价值。
- 图片中文字必须使用${customerLanguage}，不能使用中文。`;
}

function buildNegativePromptRules() {
  return `Negative Prompt 必须包含：
Chinese text, Chinese characters, bilingual Chinese text, Chinese e-commerce poster, Taobao style text, Pinduoduo style text, Chinese e-commerce style, Taobao style, Pinduoduo style, aggressive red and yellow sale banners, excessive text, cluttered layout, fake discount labels, fake brand logos, fake certification badges, unrealistic product shape, changed product color, extra accessories not in the reference image, wrong vehicle model, invented vehicle compatibility, unreadable text, misspelled Spanish or Portuguese text`;
}

function buildPromptEnglishRequirements() {
  return `每张图的 GPT 生图 Prompt 必须包含以下英文要求：
- Use the uploaded product image as the main reference.
- Keep the product shape, color, material and visible details consistent with the reference image.
- Do not add extra parts or change the product structure.
- Professional e-commerce product image for Mercado Libre México / Mercado Livre Brasil.
- Clean layout, modern Latin American marketplace style.
- Minimal text, clear hierarchy, enough white space.
- Text on image must be in Spanish for Mexico or Portuguese for Brazil.
- No Chinese text anywhere on the image.
- No Chinese e-commerce style.
- No red-yellow aggressive promotion style.
- No dense text.
- No fake logo, no fake certification badges.
- No invented vehicle model compatibility.
- If text is included, use Spanish for México or Portuguese for Brasil.`;
}

function buildFinalOutputChecklist() {
  return `【最终输出检查清单】
1. 商品标题是否没有中文。
2. 商品描述是否没有中文。
3. 核心卖点是否没有中文。
4. SEO 文案是否没有中文。
5. 购买前确认提醒是否没有中文。
6. 图片文案是否没有中文。
7. 生图 Prompt 中的图片文字是否没有中文。
8. 是否根据目标市场使用了西语或葡语。
9. 是否避免国内电商风格。
10. 是否没有虚构车型、尺寸、材质、认证、品牌。
11. 是否适合 Mercado Libre / Mercado Livre 上架使用。
12. 是否适合墨西哥或巴西消费者审美。`;
}

function buildSharedRules(form: FormState) {
  const languageHint =
    form.targetSite === "Mercado Livre Brasil"
      ? "目标站点是 Mercado Livre Brasil，客户可见的图片文案和商品文案必须使用葡语，不能出现中文；如用户选择双语，中文只能用于卖家内部分析说明。"
      : "目标站点是 Mercado Libre México 或拉美通用市场，客户可见的图片文案和商品文案必须使用西语，不能出现中文；如用户选择双语，中文只能用于卖家内部分析说明。";

  const autoPartsDepth =
    form.generationDepth === "专业汽配版"
      ? `
【专业汽配版重点】
请更严格检查：适配车型、年份、型号、OE 编号、左右侧/前后位置、安装位置、尺寸、材质、包装数量、是否通用、安装难度、是否需要专业安装。
请重点识别差评风险：不适配、尺寸不符、安装困难、质量不耐用、图片与实物不符、包装数量理解错误、左右侧/前后位置写错。`
      : "";

  return `${buildLanguageHardRules(form)}

【通用限制】
1. 不要编造具体车型、年份、尺寸、材质、OE 编号、认证信息、库存、品牌授权或平台数据。
2. 如果图片或文字中无法确认，请标注“需要卖家补充确认”。
3. 输出要具体、可执行，不要只给概括性建议。
4. 文案不要像国内电商促销风，不要密集文字、夸张符号、大红大黄爆款风。
5. 视觉和表达要适合墨西哥或巴西消费者，接近 Mercado Libre / Mercado Livre 专业电商图。
6. 图片文字应简洁、清楚、有信任感，避免中文大字报风格。
7. 商品标题、商品描述、核心卖点、SEO 文案、购买前确认提醒、图片短文案、图片中文字必须使用西语或葡语，不能出现中文。
8. ${languageHint}${autoPartsDepth}`;
}

function buildFullTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是 Mercado Libre / Mercado Livre 跨境电商商品内容专家，熟悉拉美市场消费者审美、汽配类产品上架逻辑、商品标题 SEO、转化型描述和电商图片策划。

【我的商品信息】
${buildProductInfo(form, imageCount)}

【任务目标】
请基于我提供的信息和产品图片，完成：
1. 产品识别与定位
2. 市场和竞品调研方向
3. 客户购买关注点
4. 常见差评和退货风险
5. 适合美客多的标题
6. 商品描述
7. 详情图短文案
8. 7 张图片图需
9. 7 张图片生图 Prompt

【重要限制】
不要编造具体车型、年份、尺寸、材质、OE 编号、认证信息。
如果图片或文字中无法确认，请标注“需要卖家补充确认”。
文案不要像国内电商促销风，不要密集文字、夸张符号、大红大黄爆款风。
请使用适合墨西哥或巴西消费者的专业、干净、可信赖的电商表达。

${buildSharedRules(form)}

【最终输出格式】
请按以下结构输出：
1. 产品识别结果
2. 产品定位判断
3. 目标客户画像
4. 买家最关心的 10 个点
5. 常见差评风险与规避写法
6. 竞品标题/描述/图片风格总结
7. 优化后的标题
8. 商品核心卖点
9. 商品描述正文
10. SEO 关键词融合文案
11. 购买前确认提醒
12. 7 张图片图需表格
13. 7 张生图 Prompt

${buildFinalOutputChecklist()}`;
}

function buildIdentityTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是 Mercado Libre / Mercado Livre 商品识别与定位专家，尤其擅长汽配、摩配、汽车用品、工具和跨境电商产品的上架定位。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务】
请结合商品文字和我上传的产品图片，判断这个商品到底是什么、该放在哪个类目、适合用什么定位卖给拉美买家。

【输出格式】
请先输出一张表格，字段必须包含：
| 分析项 | 判断结果 | 依据 | 需要卖家补充确认的信息 |
| 产品名称判断 | | | |
| 产品所属类目 | | | |
| 是否属于汽配/摩配/汽车用品 | | | |
| 主要功能 | | | |
| 使用场景 | | | |
| 目标买家 | | | |
| 核心购买动机 | | | |
| 产品定位 | | | |
| 可主打卖点 | | | |
| 需要补充确认的信息 | | | |
| 容易造成差评的信息缺口 | | | |

如果判断可能是汽配类、摩配类或汽车用品，请额外输出第二张表格：
| 汽配判断项 | 是否需要强调 | 原因 | 缺失时的风险 |
| 可能的安装位置 | | | |
| 是否可能涉及车型适配 | | | |
| 是否可能涉及左右侧/前后位置 | | | |
| 是否需要尺寸确认 | | | |
| 是否需要材质确认 | | | |
| 是否需要包装数量确认 | | | |
| 是否需要安装说明 | | | |

最后输出：
1. 最适合的产品定位建议。
2. 上架前必须向卖家确认的参数清单。
3. 可能导致差评或退货的 8 个信息缺口。`;
}

function buildResearchTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是拉美电商市场调研分析师，熟悉 Mercado Libre México、Mercado Livre Brasil 的标题结构、买家评论、竞品图片和汽配类商品购买决策。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【调研任务】
请不要复制竞品原文。请总结竞品标题、描述、图片和买家评论中可借鉴的规律，用于指导我的商品上架。

【输出格式】
1. 竞品标题常见结构
请按“产品名称 + 适配车型/通用性 + 关键材质/功能 + 数量 + 位置 + 年份/型号”的思路总结，并说明哪些字段适合我的商品，哪些字段需要卖家补充确认。

2. 买家最看重的点
至少输出 10 条，每条包含：关注点、为什么重要、页面上应该怎么写。

3. 常见差评点
至少输出 10 条，每条包含：差评原因、可能触发场景、标题/描述/图片中的规避写法。

4. 卖得好的竞品通常怎么写标题
总结标题关键词、关键词顺序、语言风格、是否突出车型/年份/型号/材质/数量/左右侧/前后位置。

5. 卖得好的竞品描述通常怎么写
总结描述结构，不要复制竞品原文。请说明开头、卖点、参数、适配提醒、安装提醒、购买前确认分别应该怎么写。

6. 竞品图片通常怎么展示
请分析主图、卖点图、尺寸图、安装图、细节图、场景图、包装清单图，每类图说明：画面内容、文案风格、买家信任点。

7. 我的产品差异化方向
给出 5 个可主打方向，每个方向包含：适合强调的卖点、适合放在哪张图、适合放进标题还是描述。`;
}

function buildListingTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是 Mercado Libre / Mercado Livre 商品标题和描述优化专家，熟悉拉美消费者阅读习惯、SEO 关键词融合和汽配类商品减少误购的写法。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务】
请为该商品生成适合目标站点的标题、卖点和商品描述。客户可见内容必须只使用西语或葡语，不能出现中文；如果用户选择双语，中文只能用于后台解释，不得进入标题、描述、卖点、SEO 文案、购买提醒或图片短文案。

【输出格式】
1. 3 个标题版本
| 版本 | 标题 | 适合场景 | 关键词拆解 |
| SEO 强标题 | | | |
| 转化型标题 | | | |
| 简洁专业标题 | | | |

2. 标题拆解
逐条说明每个标题为什么这样写，哪些词用于搜索，哪些词用于降低误购风险。

3. 5-8 个核心卖点 bullet points
每个 bullet 要包含：买家利益、对应参数或证据、需要卖家补充确认的信息。最终 bullet points 必须使用西语或葡语，不能出现中文。

4. 商品描述正文
要求适合 Mercado Libre / Mercado Livre，不要太像国内电商。结构建议：
- 开头 2-3 句说明产品用途和适合人群。
- 核心卖点分段。
- 参数规格分段。
- 使用场景分段。
- 安装/使用提醒。
- 购买前确认提醒。

5. 购买前确认提醒
尤其汽配产品要提醒确认车型、年份、尺寸、安装位置、左右侧/前后位置、包装数量、是否通用、是否需要专业安装。

6. 图片短文案
给 7 张图分别提供 1-2 句适合放在图上的短文案，文案要简洁、有信任感，不要促销口号。图片短文案必须使用西语或葡语，不能出现中文。`;
}

function buildImageBriefTask(form: FormState, imageCount: number) {
  return `${buildVisualSpec(form)}

${buildOriginalImageProtectionRules()}

${buildImageTextLanguageRules(form)}

【角色设定】
你是 Mercado Libre / Mercado Livre 商品图片策划师，熟悉拉美电商专业视觉、汽配类图片结构和降低误购/退货的详情图设计。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务】
请为商品规划一套严格、详细、统一、适合 Mercado Libre México / Mercado Livre Brasil 的 7 张电商图片制作方案。每张图必须具体到买家疑虑、画面主体、产品摆放、文案语言、颜色和禁止事项，不要只写“展示产品”。

【固定输出表格】
请按以下 20 个字段输出 7 行表格，字段不能省略：
| 图片编号 | 图片类型 | 这张图的转化目标 | 主要解决的买家疑虑 | 画面主体 | 产品摆放方式 | 产品展示角度 | 背景场景 | 构图布局 | 是否需要局部放大 | 是否需要箭头/标签/尺寸线 | 图片主文案 | 图片辅助文案 | 文案语言 | 文案位置 | 文案颜色 | 字体风格 | 点缀元素 | 适合拉美市场的视觉说明 | 禁止事项 |

硬性要求：
1. 图片主文案和图片辅助文案必须是西语或葡语，不能是中文。
2. 如果输出语言是中西双语或中葡双语，表格里的图片文案仍然不能出现中文。
3. 如果尺寸、材质、包装数量、车型、年份、OE 编号、安装位置无法确认，请在“需要卖家补充确认的信息”中说明，不要写进图片文案里伪装成事实。

【七张图片严格逻辑】
第 1 张：白底主图
- 纯白或接近纯白背景。
- 产品清晰居中。
- 不要夸张文字。
- 不要复杂背景。
- 如果有配件，合理摆放配件。
- 目标是提升点击率和清晰度。
- 不要中文。
- 不要国内电商促销风。

第 2 张：核心卖点图
- 只突出一个最核心卖点。
- 文案短。
- 画面干净。
- 使用轻量图标或标签。
- 不要堆很多卖点。
- 图片文案必须是西语或葡语。

第 3 张：适配/安装位置图
- 汽配、摩配、汽车用品必须重点做这张。
- 展示安装位置或使用位置。
- 如果不能确定车型，只能写 “Verifica compatibilidad” 或葡语对应表达。
- 不要虚构具体车型。
- 可使用通用汽车局部场景。
- 不要中文。
- 不要虚构年份、车型、OE 编号。

第 4 张：材质/细节/耐用性图
- 展示产品局部细节。
- 可用放大框。
- 可强调防水、防尘、耐高温、防腐蚀等，但只有用户提供或产品明显支持时才写。
- 不确定的信息必须标注需要确认。
- 图片文案必须是西语或葡语。
- 不允许中文。

第 5 张：尺寸/包装清单图
- 降低误购和退货。
- 展示尺寸线、包装数量、配件清单。
- 如果用户没提供尺寸或数量，提示“需要卖家补充确认”。
- 不允许编造具体尺寸。
- 图片文字不能有中文。
- 尺寸、数量、包装信息不能虚构。

第 6 张：真实使用场景图
- 适合墨西哥或巴西消费者审美。
- 可以是车库、维修台、汽车内饰、汽车外观、户外道路、越野场景等。
- 场景要真实，不要国内电商棚拍风。
- 产品要自然融入场景。
- 不能出现中文。
- 不要国内促销海报风。

第 7 张：购买信任/防误购提醒图
- 重点解决退货和差评风险。
- 对汽配类产品要提醒确认车型、年份、尺寸、安装位置、左右侧、前后位置、数量。
- 文案要专业，不要吓人。
- 画面可以是清单式确认卡片 + 产品图。
- 图片文案必须是西语或葡语。
- 不允许中文。`;
}

function buildImagePromptTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是电商 AI 生图 Prompt 策划师，熟悉 Mercado Libre / Mercado Livre 商品图片风格和拉美消费者对专业、清楚、可信赖图片的偏好。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

${buildOriginalImageProtectionRules()}

${buildImageTextLanguageRules(form)}

【任务】
请为 7 张商品图分别生成可直接复制给 GPT 生图模型的 Prompt。每张图必须单独输出，不能合并。Prompt 要严格基于用户上传的产品图片，保持产品外观一致，并且要求图片中文字只使用西语或葡语，绝对不能出现中文。

【输出格式】
请按 7 张图逐张输出，每张必须包含以下 11 项：
1. 图片编号
2. 图片目标
3. 中文图需说明
4. 图片中文字
5. 生图 Prompt
6. Negative Prompt / 避免内容
7. 推荐比例
8. 背景要求
9. 产品保持规则
10. 字体和颜色要求
11. 后期检查点

注意：
- “中文图需说明”可以是中文，因为这是给卖家看的内部说明。
- “图片中文字”必须是西语或葡语，不能有中文。
- “生图 Prompt”中如果提到 text on image，也必须要求图片文字为西语或葡语，不能是中文。

【七张图】
1. 白底专业主图：纯白或接近纯白背景，产品清晰居中，配件合理摆放，不要夸张文字。
2. 核心卖点图：只突出一个最核心卖点，干净构图，轻量图标或标签，不堆卖点。
3. 适配/安装位置图：展示安装位置或使用位置；不能确定车型时只写 “Verifica compatibilidad” 或葡语对应表达。
4. 材质/细节/耐用性图：局部特写和放大框；防水、防尘、耐高温、防腐蚀等属性只有确认后才能写。
5. 尺寸/包装清单图：展示尺寸线、包装数量、配件清单；缺失尺寸或数量时写需要卖家补充确认，不编造。
6. 真实使用场景图：车库、维修台、汽车内饰、汽车外观、户外道路或越野场景，适合墨西哥或巴西审美。
7. 购买信任/防误购提醒图：确认车型、年份、尺寸、安装位置、左右侧、前后位置、数量等，专业但不吓人。

${buildPromptEnglishRequirements()}

${buildNegativePromptRules()}

【特别强调】
图片风格必须适合 Mercado Libre México 或 Mercado Livre Brasil。
不要国内电商风。
不要过多文字。
不要夸张促销贴纸。
不要红黄爆款风。
不要中文大字报风格。
整体要像一套专业电商图片。
如果缺少车型、年份、尺寸、材质、安装位置、包装数量等关键信息，请在对应图片 prompt 中写“需要卖家补充确认”，不要自行编造。

【生成图片前检查清单】
1. 产品外观是否与原图一致。
2. 是否没有虚构品牌、认证、车型、尺寸。
3. 图片文案是否为西语或葡语。
4. 图片上是否完全没有中文。
5. 是否避免国内电商风。
6. 是否保持整套风格统一。
7. 是否每张图只表达一个核心目的。
8. 是否有足够留白。
9. 是否降低误购和差评风险。
10. 是否适合 Mercado Libre / Mercado Livre。
11. 是否适合直接交给 GPT 生图模型使用。
12. 是否没有中文大字报、淘宝风、拼多多风。

${buildFinalOutputChecklist()}`;
}

function buildModules(form: FormState, imageCount: number): ResultModule[] {
  return [
    {
      title: "一键完整任务书",
      useCase: "第一次把商品资料和图片发给 ChatGPT 时使用，一次性生成完整上架内容方案。",
      content: buildFullTask(form, imageCount),
    },
    {
      title: "产品识别与定位任务书",
      useCase: "当你不确定商品类目、用途、定位或汽配适配风险时使用。",
      content: buildIdentityTask(form, imageCount),
    },
    {
      title: "竞品与市场调研任务书",
      useCase: "准备写标题、描述和图片前，用来让 ChatGPT 先总结市场规律和买家关注点。",
      content: buildResearchTask(form, imageCount),
    },
    {
      title: "美客多标题与描述任务书",
      useCase: "商品定位清楚后，用来生成标题、卖点、描述、购买前确认和图片短文案。",
      content: buildListingTask(form, imageCount),
    },
    {
      title: "七张图片图需任务书",
      useCase:
        "用于确认整套图片策划。建议先复制给 ChatGPT 确认 7 张图的图需，再进入生图 Prompt。",
      content: buildImageBriefTask(form, imageCount),
      badge: "用于确认整套图片策划",
      featured: true,
    },
    {
      title: "七张生图 Prompt 任务书",
      useCase:
        "用于复制给 GPT 生图模型。建议在模块 5 图需确认后，再复制本模块生成图片。",
      content: buildImagePromptTask(form, imageCount),
      badge: "用于复制给 GPT 生图模型",
      featured: true,
    },
  ];
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [hasGenerated, setHasGenerated] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const latestImagesRef = useRef<UploadedImage[]>([]);

  const modules = useMemo(
    () => buildModules(form, uploadedImages.length),
    [form, uploadedImages.length],
  );
  const allModuleText = modules
    .map((module, index) => `# ${index + 1}. ${module.title}\n\n${module.content}`)
    .join("\n\n---\n\n");

  useEffect(() => {
    latestImagesRef.current = uploadedImages;
  }, [uploadedImages]);

  useEffect(() => {
    return () => {
      latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setHasGenerated(false);
  }

  function updateTargetSite(value: FormState["targetSite"]) {
    setForm((current) => ({
      ...current,
      targetSite: value,
      outputLanguage: value === "Mercado Livre Brasil" ? "葡语" : "西语",
      visualStyle:
        value === "Mercado Livre Brasil"
          ? "Mercado Livre Brasil 风格"
          : "Mercado Libre México 风格",
    }));
    setHasGenerated(false);
  }

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const images = files
      .filter((file) => allowedTypes.has(file.type))
      .map((file) => ({
        id: createImageId(),
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      }));

    if (images.length > 0) {
      setUploadedImages((current) => [...current, ...images]);
      setHasGenerated(false);
    }

    event.target.value = "";
  }

  function removeImage(imageId: string) {
    setUploadedImages((current) => {
      const imageToRemove = current.find((image) => image.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }

      return current.filter((image) => image.id !== imageId);
    });
    setHasGenerated(false);
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopyStatus(`已复制：${label}`);
    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6cdf]">
              LatAm Commerce Desk
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              Mercado Libre 商品内容任务书生成器
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              不接 API、不上传数据，只在前端把商品信息整理成可直接复制给 ChatGPT 的专业任务书。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">6</p>
              <p className="text-xs text-slate-500">任务书模块</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">LatAm</p>
              <p className="text-xs text-slate-500">市场视觉</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">Auto</p>
              <p className="text-xs text-slate-500">汽配深度</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[420px_1fr]">
        <form className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">基础信息</h2>
            <p className="mt-1 text-sm text-slate-500">
              可以留空生成基础任务书；汽配类建议补充车型、年份、OE 编号、尺寸、材质、安装位置和包装数量。
            </p>
          </div>

          <label className="block">
            <span className="field-label">商品标题</span>
            <input
              className="field-control"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="例如：Par Faros Niebla Led Para Auto"
            />
          </label>

          <label className="block">
            <span className="field-label">商品描述</span>
            <textarea
              className="field-control min-h-28 resize-y"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="粘贴产品用途、规格、材质、尺寸、适配车型、安装位置、包装清单等"
            />
          </label>

          <label className="block">
            <span className="field-label">关键词</span>
            <textarea
              className="field-control min-h-20 resize-y"
              value={form.keywords}
              onChange={(event) => updateField("keywords", event.target.value)}
              placeholder="例如：LED, faro, antiniebla, universal, resistente al agua"
            />
          </label>

          <section className="image-upload-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">产品图片</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  上传产品图片，仅用于本地预览。生成任务书后，请将图片一并发送给 ChatGPT 进行识别。
                </p>
              </div>
              <span className="image-count">已选择 {uploadedImages.length} 张图片</span>
            </div>

            <label className="upload-button">
              选择产品图片
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
              />
            </label>

            {uploadedImages.length === 0 ? (
              <p className="image-empty">
                暂未上传产品图片。建议上传主图、细节图、包装图或安装场景图，ChatGPT 可结合图片更准确识别产品。
              </p>
            ) : (
              <div className="image-preview-grid">
                {uploadedImages.map((image) => (
                  <div className="image-preview-card" key={image.id}>
                    {/* Native img is appropriate here because object URLs are local browser previews. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.name} className="image-preview-thumb" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {image.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(image.size)}
                      </p>
                    </div>
                    <button
                      className="image-remove-button"
                      type="button"
                      onClick={() => removeImage(image.id)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="field-label">目标站点</span>
              <select
                className="field-control"
                value={form.targetSite}
                onChange={(event) =>
                  updateTargetSite(event.target.value as FormState["targetSite"])
                }
              >
                {targetSites.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="field-label">输出语言</span>
              <select
                className="field-control"
                value={form.outputLanguage}
                onChange={(event) =>
                  updateField("outputLanguage", event.target.value as FormState["outputLanguage"])
                }
              >
                {outputLanguages.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="field-label">生成深度</span>
            <select
              className="field-control"
              value={form.generationDepth}
              onChange={(event) =>
                updateField(
                  "generationDepth",
                  event.target.value as FormState["generationDepth"],
                )
              }
            >
              {generationDepths.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">产品类目</span>
            <select
              className="field-control"
              value={form.productCategory}
              onChange={(event) =>
                updateField("productCategory", event.target.value as FormState["productCategory"])
              }
            >
              {productCategories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">产品定位</span>
            <select
              className="field-control"
              value={form.productPosition}
              onChange={(event) =>
                updateField("productPosition", event.target.value as FormState["productPosition"])
              }
            >
              {productPositions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">目标市场视觉风格</span>
            <select
              className="field-control"
              value={form.visualStyle}
              onChange={(event) =>
                updateField("visualStyle", event.target.value as FormState["visualStyle"])
              }
            >
              {visualStyles.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <button
            className="w-full rounded bg-[#2d6cdf] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f57ba]"
            type="button"
            onClick={() => setHasGenerated(true)}
          >
            生成分析方案
          </button>
        </form>

        <div className="rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">生成结果</h2>
                <p className="mt-1 text-sm text-slate-500">
                  推荐复制顺序：1. 先复制“一键完整任务书”给 ChatGPT 做整体分析；2. 再复制“七张图片图需任务书”确认图片方案；3. 最后复制“七张生图 Prompt 任务书”生成图片。
                </p>
                {!hasGenerated ? (
                  <p className="mt-2 text-sm font-medium text-[#b45309]">
                    输入已更新，点击“生成分析方案”刷新任务书视图。
                  </p>
                ) : null}
                {copyStatus ? (
                  <p className="mt-2 text-sm font-medium text-[#15803d]">{copyStatus}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => copyText(modules[0].content, "完整任务书")}
                >
                  复制完整任务书
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => copyText(allModuleText, "全部模块")}
                >
                  复制全部模块
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {modules.map((module, index) => (
              <details
                className={`result-module ${module.featured ? "result-module-featured" : ""}`}
                key={module.title}
                open={index === 0}
              >
                <summary className="result-summary">
                  <span>
                    <span className="block text-base font-semibold text-slate-950">
                      {index + 1}. {module.title}
                      {module.badge ? (
                        <span className="module-badge">{module.badge}</span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm font-normal text-slate-500">
                      {module.useCase}
                    </span>
                  </span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      copyText(module.content, module.title);
                    }}
                  >
                    一键复制
                  </button>
                </summary>
                <pre className="result-content">{module.content}</pre>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
