"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

const aiProviders = [
  { value: "openai", label: "OpenAI：可用", disabled: false },
  { value: "deepseek", label: "DeepSeek：即将支持", disabled: true },
  { value: "custom", label: "自定义接口：即将支持", disabled: true },
] as const;

const maxImageCount = 6;
const maxImageSize = 8 * 1024 * 1024;
const defaultOpenAiModel = "gpt-4.1-mini";

type FormState = {
  title: string;
  description: string;
  productInfo: string;
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
  file: File;
};

type AiProvider = "openai";

type AiGenerateResponse = {
  provider: string;
  model: string;
  result: unknown;
};

type ConfirmedContent = {
  title: string;
  description: string;
  bulletPoints: string;
  prePurchaseReminder: string;
  imageShortCopy: string;
};

type ImageCardGuide = {
  imageNumber: string;
  role: string;
  content: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  productInfo: "",
  keywords: "",
  productCategory: "不确定，让 AI 判断",
  productPosition: "不确定，让 AI 判断",
  targetSite: "Mercado Libre México",
  visualStyle: "Mercado Libre México 风格",
  generationDepth: "详细版",
  outputLanguage: "西语",
};

const initialConfirmedContent: ConfirmedContent = {
  title: "",
  description: "",
  bulletPoints: "",
  prePurchaseReminder: "",
  imageShortCopy: "",
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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function stringifyForCopy(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

type ManualSections = {
  titleDescription: string;
  imageBriefs: string;
  imagePrompts: string;
  checklist: string;
};

function findMarkerIndex(text: string, markers: readonly string[], fromIndex = 0) {
  return markers.reduce<number>((nearestIndex, marker) => {
    const index = text.indexOf(marker, fromIndex);
    if (index === -1) {
      return nearestIndex;
    }

    return nearestIndex === -1 ? index : Math.min(nearestIndex, index);
  }, -1);
}

function sliceSection(text: string, startMarkers: readonly string[], endMarkers: readonly string[]) {
  const startIndex = findMarkerIndex(text, startMarkers);

  if (startIndex === -1) {
    return "";
  }

  const endIndex = findMarkerIndex(text, endMarkers, startIndex + 1);
  return text.slice(startIndex, endIndex === -1 ? undefined : endIndex).trim();
}

function parseManualResult(text: string): ManualSections {
  const titleStartMarkers = ["商品标题", "标题版本", "标题与描述", "商品描述"];
  const imageBriefStartMarkers = [
    "七张图片视觉策划",
    "七张图片图需",
    "7 张图片图需",
    "图片图需",
  ];
  const imagePromptStartMarkers = [
    "七张图片生图执行 Prompt",
    "七张生图 Prompt",
    "7 张生图 Prompt",
    "生图 Prompt",
  ];
  const checklistStartMarkers = ["最终检查清单", "检查清单"];

  const titleDescription = sliceSection(text, titleStartMarkers, [
    ...imageBriefStartMarkers,
    ...imagePromptStartMarkers,
    ...checklistStartMarkers,
  ]);
  const imageBriefs = sliceSection(text, imageBriefStartMarkers, [
    ...imagePromptStartMarkers,
    ...checklistStartMarkers,
  ]);
  const imagePrompts = sliceSection(text, imagePromptStartMarkers, checklistStartMarkers);
  const checklist = sliceSection(text, checklistStartMarkers, []);

  return {
    titleDescription,
    imageBriefs,
    imagePrompts,
    checklist,
  };
}

function buildImagePlanningCards(): ImageCardGuide[] {
  const sharedFields = `请输出字段：
图片编号：
图片名称：
本图角色：
本图目的：
承接的新描述卖点：
为什么做这张图：
建议是否必须做：
适用卖点：
适用产品类型：
推荐视觉风格：
推荐背景：
产品摆位建议：
文案位置建议：
文案结构建议：
页面整体版式：
标题建议：
辅助文案建议：
字体建议：
字体颜色建议：
颜色搭配建议：
图标 / 局部放大 / 尺寸线建议：
信息卡片 / 信息模块建议：
是否建议用人物 / 车辆 / 场景：
客户疑虑解决点：
禁止事项：`;

  return [
    {
      imageNumber: "图 1",
      role: "白底主图，固定必须做",
      content: `图 1 固定为白底主图。要求白底或接近纯白背景，产品主体最大化，干净、专业、平台化，不要复杂文案，不要过强装饰，可展示真实包装但不能喧宾夺主。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 2",
      role: "动态卖点图，从候选图类型中选择",
      content: `图 2 必须根据产品卖点动态决定，可从核心卖点图、细节做工图、功能作用图、安装位置图、适配确认图、数量 / 套装图、尺寸确认图、使用场景图、防误购提醒图中选择。不要固定套模板。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 3",
      role: "动态疑虑解决图，从买家 Top 疑虑中选择",
      content: `图 3 必须服务于买家核心疑虑，例如适配、尺寸、数量、安装、材质、做工或功能真实性。根据产品类型动态选择图的角色。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 4",
      role: "动态细节/功能/安装图",
      content: `图 4 应从产品最需要证明的卖点出发，动态选择细节做工、功能作用、安装位置、适配确认或尺寸确认。版式、背景和配色必须随产品类型变化。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 5",
      role: "动态补充转化图",
      content: `图 5 用于补齐前面未解决的关键信息，例如数量 / 套装、尺寸确认、包装清单、使用方式或防误购提醒。不允许虚构尺寸、数量、车型或材质。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 6",
      role: "使用 / 安装场景图，允许动态调整",
      content: `图 6 通常优先考虑真实使用或安装场景，例如维修工位、汽车内饰、车底局部、户外道路、车库、家居或生活场景。仍需根据产品类型决定是否使用人物、车辆或场景。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 7",
      role: "购买前确认 / 防误购提醒图",
      content: `图 7 通常用于购买前确认和防误购提醒，尤其汽配类要提醒车型、年份、尺寸、安装位置、左右侧、前后位置和数量。文案专业、克制，不吓人，不使用中文。\n\n${sharedFields}`,
    },
  ];
}

function buildImagePromptCards(): ImageCardGuide[] {
  const sharedFields = `请输出字段：
图片编号：
图片名称：
本图核心用途：
承接的新描述卖点：
为什么生成这张图：
建议客户可见文案语言：
建议是否先生成无文字图：
本图视觉风格总结：
图片中文字：
无文字生图 Prompt：
带文字参考 Prompt：
Negative Prompt：
构图执行说明：
文案布局说明：
字体与颜色执行建议：
背景执行建议：
信息模块位置：
卖点视觉化方式：
产品保持规则：
生成后检查点：`;

  return [
    {
      imageNumber: "图 1",
      role: "白底主图 Prompt",
      content: `图 1 生成白底或接近纯白专业主图。Prompt 必须强调产品主体最大化、外观结构保持一致、无复杂文案、无国内电商风。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 2",
      role: "动态卖点图 Prompt",
      content: `图 2 的 Prompt 必须根据模块 5 判断出的最高优先级卖点生成，不允许固定写核心卖点图。必须说明背景、产品摆位、文案区位置、信息层级、字体和颜色。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 3",
      role: "动态疑虑解决图 Prompt",
      content: `图 3 的 Prompt 必须根据买家核心疑虑生成，例如适配、安装、尺寸、材质、数量或做工。图片中文字必须是西语或葡语，不能中文。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 4",
      role: "动态细节/功能图 Prompt",
      content: `图 4 的 Prompt 必须具体说明是否局部放大、是否用图标、是否用尺寸线、主标题位置、辅助卖点位置和背景风格。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 5",
      role: "动态补充转化图 Prompt",
      content: `图 5 的 Prompt 用于补齐剩余关键转化信息，例如套装数量、包装、尺寸、使用方式或防误购。不能虚构任何具体数据。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 6",
      role: "使用 / 安装场景 Prompt",
      content: `图 6 的 Prompt 通常用于真实使用或安装场景。必须说明场景类型、产品如何自然融入、是否出现车辆/人物，以及拉美市场审美方向。\n\n${sharedFields}`,
    },
    {
      imageNumber: "图 7",
      role: "购买确认 / 防误购 Prompt",
      content: `图 7 的 Prompt 通常用于购买前确认、防误购和降低退货。需要清楚说明提醒信息放在哪里、用什么卡片/横条布局，以及如何保持专业克制。\n\n${sharedFields}`,
    },
  ];
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
竞品参考描述 / 原始参考描述：${displayValue(form.description)}
我的产品已知信息：${displayValue(form.productInfo)}
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
请严格按以下链路完成，不要跳步，不要让图片模块脱离新描述：
1. 产品识别与定位
2. 市场调研与买家关注点总结
3. 核心卖点提炼
4. 新商品标题与描述生成
5. 图片策略判断
6. 七张图片视觉策划与设计说明
7. 七张图片生图执行 Prompt 指令包

关键逻辑：
1. 新商品描述不能只是对用户原始描述做轻度润色，必须结合标题、原始描述、关键词、产品图片、产品识别结果、市场调研结果和核心卖点重新生成。
2. 图片图需和生图 Prompt 必须基于“新生成的商品描述”和“核心卖点提炼”继续生成。
3. 图片卖点必须和新描述一致，不能单独发明新卖点。
4. 图 2-5 必须围绕新描述中的核心卖点动态策划。

【重要限制】
不要编造具体车型、年份、尺寸、材质、OE 编号、认证信息。
如果图片或文字中无法确认，请标注“需要卖家补充确认”。
文案不要像国内电商促销风，不要密集文字、夸张符号、大红大黄爆款风。
请使用适合墨西哥或巴西消费者的专业、干净、可信赖的电商表达。

${buildSharedRules(form)}

【最终输出格式】
请按以下结构输出：
1. 产品识别与定位
2. 市场调研与买家关注点总结
3. 核心卖点提炼
4. 新商品标题与描述生成
5. 图片策略判断
6. 七张图片视觉策划与设计说明
7. 七张图片生图执行 Prompt 指令包

${buildFinalOutputChecklist()}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildCoreSellingPointTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是 Mercado Libre / Mercado Livre 商品卖点策略师，负责把产品识别结果和市场调研总结转化为可用于标题、描述和图片策划的核心卖点。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务】
请基于以下链路提炼卖点：用户原始标题、原始描述、关键词、产品图片、产品识别结果、市场调研与买家关注点总结。不要只复述用户原文，也不要凭空编造参数。

【输出格式】
1. 产品最终定位一句话
说明这个商品在 Mercado Libre / Mercado Livre 上应该被理解成什么产品、解决什么问题、卖给谁。

2. 核心卖点优先级 Top 6
请输出表格：
| 优先级 | 核心卖点 | 来自哪些信息 | 对买家的价值 | 是否适合写进标题 | 是否适合写进描述 | 是否适合视觉化成图片 | 需要卖家补充确认的信息 |

3. 买家疑虑对应表
请输出表格：
| 买家疑虑 | 对应卖点 | 描述里怎么解释 | 图片里怎么视觉化 | 如果信息不足如何提示 |

4. 不建议主打的卖点
列出不建议主打的内容，并说明原因，例如证据不足、容易误导、可能导致退货、无法从图片确认。

5. 后续描述和图片必须承接的卖点
请明确列出：新商品标题与描述必须承接哪些卖点，七张图片必须优先视觉化哪些卖点。`;
}

function buildContentGenerationTask(form: FormState, imageCount: number) {
  return `【步骤 1：商品内容生成任务书】

【角色设定】
你是 Mercado Libre / Mercado Livre 商品内容策略专家。你的任务不是润色原始描述，而是基于产品识别、市场调研、买家关注点和产品定位，重新生成一版更适合目标站点的商品标题与描述。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务流程】
请严格按以下顺序输出：
1. 产品识别与定位
2. 市场调研与买家关注点总结
3. 核心卖点提炼
4. 新商品标题
5. 新商品描述
6. 核心卖点 bullet points
7. SEO 关键词融合文案
8. 购买前确认提醒
9. 图片可用短文案

【关键要求】
1. 新商品描述不能只是对用户原始描述做轻度改写。
2. 必须结合标题、原始描述、关键词、产品图片、产品识别结果、市场调研结果、买家关注点和产品定位重新生成。
3. 客户可见商品标题、描述、核心卖点、SEO 文案、购买前确认提醒不能出现中文。
4. México 默认西语，Brasil 默认葡语，拉美通用按输出语言选择西语或葡语。
5. 不要编造车型、年份、尺寸、材质、OE 编号、认证、品牌或兼容信息。

【输出格式】
1. 产品识别与定位
2. 市场调研与买家关注点总结
3. 核心卖点提炼
4. 新商品标题
5. 新商品描述
6. 核心卖点 bullet points
7. SEO 关键词融合文案
8. 购买前确认提醒
9. 图片可用短文案
10. 需要卖家补充确认的信息`;
}

function buildImageGenerationTask(
  form: FormState,
  imageCount: number,
  confirmedContent: ConfirmedContent,
) {
  return `【步骤 2：基于已确认商品内容生成图片图需和生图 Prompt】

【角色设定】
你是 Mercado Libre / Mercado Livre 商品图片策略师和 AI 生图 Prompt 策划师。你必须基于已经确认的商品标题、描述、核心卖点和购买提醒生成图片方案，不能脱离最终商品内容单独发挥。

【原始商品信息】
${buildProductInfo(form, imageCount)}

【已确认商品内容】
最终标题：
${displayValue(confirmedContent.title)}

最终描述：
${displayValue(confirmedContent.description)}

最终核心卖点：
${displayValue(confirmedContent.bulletPoints)}

购买前确认提醒：
${displayValue(confirmedContent.prePurchaseReminder)}

图片可用短文案：
${displayValue(confirmedContent.imageShortCopy)}

${buildSharedRules(form)}

${buildOriginalImageProtectionRules()}

${buildImageTextLanguageRules(form)}

【核心要求】
1. 先读取已确认标题、描述和核心卖点。
2. 从最终描述中提取最值得视觉化的卖点。
3. 图 2-5 根据这些卖点动态策划。
4. 不要脱离最终描述单独生成图片。
5. 不要公式化生成固定图组。
6. 图片内容必须和已确认商品内容一致。
7. 图片文案不能出现中文。

【图组规则】
第 1 张固定：白底主图。
第 2-5 张：根据最终描述和核心卖点动态生成对应图片，可选择核心功能图、细节做工图、安装位置图、适配确认图、数量/包装图、尺寸确认图、使用场景图、防误购提醒图。
第 6-7 张：根据产品自由发挥，但必须服务于转化，可选择真实使用场景图、购买前确认图、信任增强图、对比说明图、安装提醒图。

【输出 1：图片策略判断】
必须包含：产品类型判断、建议视觉路线、建议图组结构、来自最终描述的可视化卖点 Top 4、买家核心疑虑 Top 4、推荐主色调、推荐版式关键词、推荐文案风格、不建议采用的风格。

【输出 2：七张图片视觉策划与设计说明】
每张图必须包含：
- 图片编号
- 图片名称
- 承接的最终描述卖点
- 为什么做这张图
- 解决的买家疑虑
- 推荐视觉风格
- 背景建议
- 产品摆位
- 主文案
- 副文案
- 文案位置
- 字体风格
- 字体颜色
- 强调色
- 产品布局
- 信息模块位置
- 是否需要图标
- 是否需要局部放大
- 是否需要尺寸线
- 是否需要安装/场景背景
- 禁止事项

【输出 3：七张图片生图执行 Prompt 指令包】
每张图必须包含：
- 承接的最终描述卖点
- 无文字生图 Prompt
- 带文字参考 Prompt
- Negative Prompt
- 文案布局说明
- 字体与颜色执行建议
- 背景执行建议
- 产品保持规则
- 生成后检查点`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildListingTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是 Mercado Libre / Mercado Livre 商品标题和描述优化专家，熟悉拉美消费者阅读习惯、SEO 关键词融合和汽配类商品减少误购的写法。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

【任务】
请重新生成一版更优秀、更适合目标站点的商品标题与描述。不要只是润色用户原始描述，必须结合标题、原始描述、关键词、产品图片、产品识别结果、市场调研结果、买家关注点和核心卖点提炼重新生成。

新描述必须：
1. 更符合 Mercado Libre / Mercado Livre 的表达习惯。
2. 自然融入关键词。
3. 结构清晰。
4. 强调客户真正关心的点。
5. 避免空泛描述。
6. 避免只复制用户原文。
7. 为后续图片图需提供明确卖点来源。
8. 客户可见内容必须只使用西语或葡语，不能出现中文；如果用户选择双语，中文只能用于后台解释，不得进入标题、描述、卖点、SEO 文案、购买提醒或图片短文案。

【输出格式】
1. 生成依据说明
请说明新标题和新描述分别承接了哪些识别结果、调研结论和核心卖点。

2. 3 个标题版本
| 版本 | 标题 | 适合场景 | 关键词拆解 |
| SEO 强标题 | | | |
| 转化型标题 | | | |
| 简洁专业标题 | | | |

3. 标题拆解
逐条说明每个标题为什么这样写，哪些词用于搜索，哪些词用于降低误购风险。

4. 5-8 个核心卖点 bullet points
每个 bullet 要包含：买家利益、对应参数或证据、需要卖家补充确认的信息。最终 bullet points 必须使用西语或葡语，不能出现中文。

5. 新商品描述正文
要求适合 Mercado Libre / Mercado Livre，不要太像国内电商。结构建议：
- 开头 2-3 句说明产品用途和适合人群。
- 核心卖点分段。
- 参数规格分段。
- 使用场景分段。
- 安装/使用提醒。
- 购买前确认提醒。

6. 新描述中的可视化卖点清单
请从新描述中抽取最值得做成图片的卖点，输出：
| 可视化卖点 | 来自新描述哪一段 | 适合做第几张图 | 建议图片类型 | 买家疑虑 |

7. 购买前确认提醒
尤其汽配产品要提醒确认车型、年份、尺寸、安装位置、左右侧/前后位置、包装数量、是否通用、是否需要专业安装。

8. 图片短文案
给 7 张图分别提供 1-2 句适合放在图上的短文案，文案要简洁、有信任感，不要促销口号。图片短文案必须使用西语或葡语，不能出现中文。`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
请为商品规划一套严格、详细、统一、适合 Mercado Libre México / Mercado Livre Brasil 的 7 张电商图片视觉策划与设计说明。不要套固定模板。必须先读取前面生成的“新商品标题与描述”“新描述中的可视化卖点清单”和“核心卖点提炼”，再决定第 2-5 张最值得做什么图。

核心链路要求：
1. 图片图需不能脱离新商品描述单独存在。
2. 必须先从“新生成的商品描述”和“核心卖点提炼”中抽取最值得视觉化的卖点。
3. 每张图必须说明承接的是新描述里的哪个卖点。
4. 图片内容必须和新描述里的卖点一致。
5. 如果新描述没有支持某个卖点，不要单独在图片里发明这个卖点。

【图片策略判断】
请先输出总览区，必须包含：
- 产品类型判断
- 建议视觉路线
- 建议图组结构
- 核心卖点优先级 Top 4
- 买家核心疑虑 Top 4
- 推荐主色调
- 推荐版式关键词
- 推荐文案风格
- 不建议采用的风格
- 来自新描述的可视化卖点清单

判断方式要求：
1. 先判断产品属于什么类型，例如底盘/悬挂类汽配、车内用品、电子配件、工具、家居、宠物、美妆等。
2. 再从商品标题、描述、关键词和图片里提取最值得做图的卖点。
3. 再判断买家最可能担心什么，例如是否适配、是否一对、尺寸是否正确、安装是否困难、材质是否耐用、包装是否完整。
4. 再决定 7 张图的图组结构。

示例风格，仅供理解，不要照抄：
产品类型：底盘 / 悬挂类汽配
建议视觉路线：工业专业风 + 维修技术感 + 移动端可读的模块化信息布局
核心卖点优先级：缓冲减震、降低异响、套装数量、适配确认
买家疑虑：能否适配、是否一对、安装位置是否正确、产品做工如何
推荐主色调：黑、深灰、白、橙红点缀
不建议风格：国内电商爆款风、满屏促销风、过度花哨科技风

【动态图组规则】
1. 第 1 张固定为白底主图：
- 白底或接近纯白背景。
- 产品主体最大化。
- 干净、专业、平台化。
- 不要复杂文案。
- 不要过强装饰。
- 可展示真实包装，但不能喧宾夺主。

2. 第 2-4 张或第 2-5 张必须根据产品卖点动态策划，不能固定为同一种图。请从以下候选图类型中选择最合适的 4-5 张：
- 核心卖点图
- 细节做工图
- 功能作用图
- 安装位置图
- 适配确认图
- 数量 / 套装图
- 尺寸确认图
- 使用场景图
- 防误购提醒图

3. 第 6-7 张通常优先考虑：
- 使用 / 安装场景图
- 购买前确认 / 防误购提醒图
但仍然允许根据产品类型动态调整。

4. 如果产品卖点集中在“缓冲、降噪、舒适性、做工”，则图 2-5 优先考虑：数量 / 套装图、细节做工图、功能卖点图、安装位置 / 兼容图。

5. 如果产品卖点集中在“安装方便、车内收纳、空间利用”，则图 2-5 优先考虑：核心卖点图、使用方式图、细节图、场景图。

6. 不允许每个产品都输出同一图组顺序、同一配色、同一版式或“主标题 + 三个点”的公式化结构。

【模块 5 输出格式：七张图片视觉策划与设计说明】
请为每张图单独输出以下字段，字段不能省略：
图片编号：
图片名称：
本图角色：
本图目的：
承接的新描述卖点：
为什么做这张图：
建议是否必须做：
适用卖点：
适用产品类型：
推荐视觉风格：
推荐背景：
产品摆位建议：
文案位置建议：
文案结构建议：
页面整体版式：
标题建议：
辅助文案建议：
字体建议：
字体颜色建议：
颜色搭配建议：
图标 / 局部放大 / 尺寸线建议：
信息卡片 / 信息模块建议：
是否建议用人物 / 车辆 / 场景：
客户疑虑解决点：
禁止事项：

字段细节要求：
1. “推荐视觉风格”必须根据产品动态生成，例如工业专业风、科技简洁风、维修信任风、场景生活风、精致质感风。
2. “推荐背景”必须具体，例如纯白背景、浅灰渐变背景、黑灰工业背景、虚化车底背景、维修工位背景、汽车内饰背景、户外道路背景。
3. “产品摆位建议”必须具体，例如产品居中放大、左图右文、右图左文、中间主产品 + 下方卡片信息、三宫格细节排版、多角度并列排版。
4. “文案位置建议”必须具体，例如主标题左上、卖点在右下、兼容信息放底部卡片区、提醒信息放底部横条、图标横向排布于底部。
5. “字体建议”必须具体，例如现代无衬线字体、主标题粗体、副标题中等字重、技术信息较细字重、不要花哨字体、不要廉价促销字体。
6. “字体颜色建议”必须具体，例如白字 + 橙红强调、深灰字 + 黑字 + 少量品牌色、黑底白字、白底深灰字。
7. “颜色搭配建议”必须根据产品和风格动态决定，例如黑 / 深灰 / 白 / 橙红（工业汽配）、深蓝 / 灰 / 白（电子科技类）、米白 / 灰 / 黑（车内用品）。不能所有产品都输出同一种颜色方案。
8. 每张图都必须说明为什么做这张图、承接哪个新描述卖点、解决买家的什么疑虑。

硬性要求：
1. 图片主文案和图片辅助文案必须是西语或葡语，不能是中文。
2. 如果输出语言是中西双语或中葡双语，表格里的图片文案仍然不能出现中文。
3. 如果尺寸、材质、包装数量、车型、年份、OE 编号、安装位置无法确认，请在“需要卖家补充确认的信息”中说明，不要写进图片文案里伪装成事实。
4. 客户可见文字不能有中文；México 默认西语，Brasil 默认葡语；拉美通用按输出语言决定西语或葡语。
5. 除非用户特别选择英语，否则不要输出英文作为图片文案。
6. 模块内部解释可以是中文，但图片上图文案必须是目标语言。
7. 如果无法确认具体数据，不允许虚构具体数值。`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildImagePromptTask(form: FormState, imageCount: number) {
  return `【角色设定】
你是电商 AI 生图 Prompt 策划师，熟悉 Mercado Libre / Mercado Livre 商品图片风格和拉美消费者对专业、清楚、可信赖图片的偏好。

【商品信息】
${buildProductInfo(form, imageCount)}

${buildSharedRules(form)}

${buildOriginalImageProtectionRules()}

${buildImageTextLanguageRules(form)}

【任务】
请先承接“新商品标题与描述”“核心卖点提炼”“图片策略判断”和“七张图片视觉策划与设计说明”，再为 7 张商品图分别生成可直接复制给 GPT 生图模型的生图执行 Prompt 指令包。不要套固定模板。每张图的风格、背景、构图、文案区和颜色必须根据新描述中的卖点、产品类型、客户疑虑和目标市场视觉风格动态决定。

核心链路要求：
1. 生图 Prompt 不能脱离新商品描述单独存在。
2. 每张图必须说明承接的新描述卖点。
3. Prompt 中的画面内容、文案、图标、局部放大、尺寸线和信息卡片必须服务于这个卖点。
4. 如果新描述没有支持某个卖点，不要单独在 Prompt 里发明这个卖点。

【图片策略判断】
请在 Prompt 指令包前先输出总览区，必须包含：
- 产品类型判断
- 建议视觉路线
- 建议图组结构
- 核心卖点优先级 Top 4
- 买家核心疑虑 Top 4
- 推荐主色调
- 推荐版式关键词
- 推荐文案风格
- 不建议采用的风格
- 来自新描述的可视化卖点清单

【模块 6 输出格式：七张图片生图执行 Prompt 指令包】
请按 7 张图逐张输出，每张必须包含以下字段，字段不能省略：
图片编号：
图片名称：
本图核心用途：
承接的新描述卖点：
为什么生成这张图：
建议客户可见文案语言：
建议是否先生成无文字图：
本图视觉风格总结：
图片中文字：
无文字生图 Prompt：
带文字参考 Prompt：
Negative Prompt：
构图执行说明：
文案布局说明：
字体与颜色执行建议：
背景执行建议：
信息模块位置：
卖点视觉化方式：
产品保持规则：
生成后检查点：

注意：
- “图片中文字”必须是西语或葡语，不能有中文。
- “无文字生图 Prompt”必须适合先生成干净底图，避免 AI 生成乱码文字。
- “带文字参考 Prompt”中如果提到 text on image，也必须要求图片文字为西语或葡语，不能是中文。
- 如果无法确认具体数据，不允许虚构具体数值。

【动态图组规则】
1. 第 1 张固定为白底主图：白底或接近纯白背景，产品主体最大化，干净、专业、平台化，不要复杂文案，不要过强装饰，可展示真实包装但不能喧宾夺主。
2. 第 2-4 张或第 2-5 张必须根据产品卖点动态策划，从以下候选图类型中选择最合适的 4-5 张：核心卖点图、细节做工图、功能作用图、安装位置图、适配确认图、数量 / 套装图、尺寸确认图、使用场景图、防误购提醒图。
3. 第 6-7 张通常优先考虑使用 / 安装场景图、购买前确认 / 防误购提醒图，但仍然允许根据产品类型动态调整。
4. 图 2-5 必须优先从卖点中提取“最值得做图的内容”，不能固定输出。

【Prompt 具体度要求】
1. Prompt 不能只写 “professional style”。必须写清楚背景类型、产品摆位、文案区位置、信息区层级、是否局部放大、是否用图标、版式方向和风格气质。
2. Prompt 不能只写 “add text”。必须结合设计说明明确：主标题放左上 / 右上 / 底部卡片，卖点放右侧竖排 / 下方横排 / 左下模块，兼容信息放底部信息块，提醒信息放底部横条。
3. 字体和颜色建议必须进入 Prompt 任务书，例如：Use a bold modern sans-serif title. Use medium-weight supporting text. Use white text on dark background with orange-red highlight accents. Keep text minimal and mobile-readable.
4. 如果产品属于不同类型，风格必须变化，不能所有产品都输出黑底 + 红色装饰。必须根据产品动态生成风格建议，例如工业汽配使用 black / dark gray / white / orange-red accents，电子科技使用 deep blue / gray / white，车内用品使用 warm white / gray / black，家居用品使用 light neutral background。
5. 每张 Prompt 必须写清楚背景风格、主副文案位置、字体风格、字体颜色、强调色、产品布局、信息模块位置，以及卖点如何视觉化。

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

function buildModules(
  form: FormState,
  imageCount: number,
  confirmedContent: ConfirmedContent,
): ResultModule[] {
  return [
    {
      title: "步骤 1：商品内容生成任务书",
      useCase: "复制到 ChatGPT，先生成产品识别、调研、核心卖点、新标题和新描述。",
      content: buildContentGenerationTask(form, imageCount),
    },
    {
      title: "步骤 2：图片图需与生图 Prompt 任务书",
      useCase:
        "把已确认商品内容复制回来后，再生成图片策略、七张图需和生图 Prompt。",
      content: buildImageGenerationTask(form, imageCount, confirmedContent),
      badge: "基于已确认商品内容",
      featured: true,
    },
    {
      title: "备用：完整链路任务书",
      useCase: "需要一次性让 ChatGPT 输出完整链路时使用；推荐优先使用上面的两步流程。",
      content: buildFullTask(form, imageCount),
    },
  ];
}

type GeneratorWorkspaceProps = {
  mode: "auto" | "manual";
};

export default function GeneratorWorkspace({ mode }: GeneratorWorkspaceProps) {
  const isAutoMode = mode === "auto";
  const isManualMode = mode === "manual";
  const [form, setForm] = useState<FormState>(initialForm);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [confirmedContent, setConfirmedContent] =
    useState<ConfirmedContent>(initialConfirmedContent);
  const [hasGenerated, setHasGenerated] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [aiModel, setAiModel] = useState(defaultOpenAiModel);
  const [isAiGeneratingContent, setIsAiGeneratingContent] = useState(false);
  const [isAiGeneratingImages, setIsAiGeneratingImages] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiContentResult, setAiContentResult] = useState<AiGenerateResponse | null>(null);
  const [aiImageResult, setAiImageResult] = useState<AiGenerateResponse | null>(null);
  const [manualDraft, setManualDraft] = useState("");
  const [manualSavedResult, setManualSavedResult] = useState("");
  const latestImagesRef = useRef<UploadedImage[]>([]);

  const modules = useMemo(
    () => buildModules(form, uploadedImages.length, confirmedContent),
    [form, uploadedImages.length, confirmedContent],
  );
  const imagePlanningCards = useMemo(() => buildImagePlanningCards(), []);
  const imagePromptCards = useMemo(() => buildImagePromptCards(), []);
  const allModuleText = modules
    .map((module, index) => `# ${index + 1}. ${module.title}\n\n${module.content}`)
    .join("\n\n---\n\n");
  const aiResultRecord = getRecord(aiContentResult?.result);
  const listingCopy = getRecord(aiResultRecord?.listingCopy);
  const aiImageResultRecord = getRecord(aiImageResult?.result);
  const imageBriefs = aiImageResultRecord?.sevenImageBriefs;
  const imagePrompts = aiImageResultRecord?.sevenImagePrompts;
  const titleAndDescriptionText = listingCopy
    ? stringifyForCopy({
        titles: listingCopy.titles,
        bulletPoints: listingCopy.bulletPoints,
        description: listingCopy.newDescription ?? listingCopy.description,
        seoCopy: listingCopy.seoCopy,
        prePurchaseReminder: listingCopy.prePurchaseReminder,
      })
    : "";
  const manualSections = useMemo(
    () => parseManualResult(manualSavedResult),
    [manualSavedResult],
  );
  const hasConfirmedContent =
    Boolean(confirmedContent.title.trim()) &&
    Boolean(confirmedContent.description.trim()) &&
    Boolean(confirmedContent.bulletPoints.trim());

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

  function updateConfirmedContent<K extends keyof ConfirmedContent>(
    key: K,
    value: ConfirmedContent[K],
  ) {
    setConfirmedContent((current) => ({ ...current, [key]: value }));
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
    const remainingSlots = Math.max(0, maxImageCount - uploadedImages.length);
    const validFiles = files
      .filter((file) => allowedTypes.has(file.type))
      .filter((file) => file.size <= maxImageSize)
      .slice(0, remainingSlots);
    const rejectedCount = files.length - validFiles.length;
    const images = validFiles
      .map((file) => ({
        id: createImageId(),
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      }));

    if (images.length > 0) {
      setUploadedImages((current) => [...current, ...images]);
      setHasGenerated(false);
    }

    if (rejectedCount > 0) {
      setUploadMessage(
        `已忽略 ${rejectedCount} 张图片。仅支持 jpg、jpeg、png、webp，最多 ${maxImageCount} 张，单张不超过 8MB。`,
      );
    } else {
      setUploadMessage("");
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
    setUploadMessage("");
  }

  async function requestAi(mode: "content" | "images") {
    setAiError("");

    const imageDataUrls = await Promise.all(
      uploadedImages.slice(0, maxImageCount).map((image) => fileToDataUrl(image.file)),
    );

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        aiProvider,
        model: aiModel,
        mode,
        confirmedContent,
        images: imageDataUrls,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof payload?.error === "string" ? payload.error : "AI 生成失败，请稍后重试。",
      );
    }

    return payload as AiGenerateResponse;
  }

  async function handleAiGenerateContent() {
    setIsAiGeneratingContent(true);
    setAiError("");

    try {
      const payload = await requestAi("content");
      if (!payload) {
        return;
      }

      setAiContentResult(payload);
      const resultRecord = getRecord(payload.result);
      const confirmedDraft = getRecord(resultRecord?.confirmedContentDraft);
      const copyRecord = getRecord(resultRecord?.listingCopy);
      const titlesRecord = getRecord(copyRecord?.titles);

      setConfirmedContent({
        title: String(
          confirmedDraft?.title ??
            titlesRecord?.seoTitle ??
            titlesRecord?.conversionTitle ??
            titlesRecord?.simpleProfessionalTitle ??
            "",
        ),
        description: String(
          confirmedDraft?.description ?? copyRecord?.newDescription ?? copyRecord?.description ?? "",
        ),
        bulletPoints: Array.isArray(confirmedDraft?.bulletPoints)
          ? confirmedDraft.bulletPoints.join("\n")
          : String(confirmedDraft?.bulletPoints ?? copyRecord?.bulletPoints ?? ""),
        prePurchaseReminder: String(
          confirmedDraft?.prePurchaseReminder ?? copyRecord?.prePurchaseReminder ?? "",
        ),
        imageShortCopy: Array.isArray(confirmedDraft?.imageShortCopy)
          ? confirmedDraft.imageShortCopy.join("\n")
          : String(confirmedDraft?.imageShortCopy ?? copyRecord?.imageShortCopy ?? ""),
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI 生成失败，请稍后重试。");
    } finally {
      setIsAiGeneratingContent(false);
    }
  }

  async function handleAiGenerateImages() {
    if (!hasConfirmedContent) {
      setAiError("请先完成步骤 1，并确认商品标题、描述和核心卖点。");
      return;
    }

    setIsAiGeneratingImages(true);
    setAiError("");

    try {
      const payload = await requestAi("images");
      if (payload) {
        setAiImageResult(payload);
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI 生成失败，请稍后重试。");
    } finally {
      setIsAiGeneratingImages(false);
    }
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
            <Link
              className="mb-4 inline-flex rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2d6cdf] hover:text-[#1d4ed8]"
              href="/"
            >
              返回模式选择
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6cdf]">
              LatAm Commerce Desk
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              {isAutoMode ? "全自动模式" : "半自动模式 / ChatGPT 手动中转"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {isAutoMode
                ? "填写产品信息并上传图片后，系统会调用 OpenAI API 生成商品内容；确认商品内容后，再生成图片图需和生图 Prompt。"
                : "无需配置 API Key。先复制 Step 1 任务书到 ChatGPT，并上传产品图片；确认商品内容后，再复制 Step 2 任务书生成图片图需和生图 Prompt。"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">2</p>
              <p className="text-xs text-slate-500">核心步骤</p>
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
            <span className="field-label">竞品参考描述 / 原始参考描述</span>
            <textarea
              className="field-control min-h-28 resize-y"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="可粘贴竞品描述或原始参考描述。竞品信息只用于分析市场，不能直接当作我的商品事实。"
            />
          </label>

          <label className="block">
            <span className="field-label">我的产品已知信息</span>
            <textarea
              className="field-control min-h-28 resize-y"
              value={form.productInfo}
              onChange={(event) => updateField("productInfo", event.target.value)}
              placeholder="填写自己产品确定的信息：规格、材质、尺寸、适配车型、安装位置、包装清单等"
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
            {uploadMessage ? <p className="upload-message">{uploadMessage}</p> : null}
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

          {isAutoMode ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block">
                <span className="field-label">AI 模型</span>
                <select
                  className="field-control"
                  value={aiProvider}
                  onChange={(event) => setAiProvider(event.target.value as AiProvider)}
                >
                  {aiProviders.map((provider) => (
                    <option
                      disabled={provider.disabled}
                      key={provider.value}
                      value={provider.value}
                    >
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="field-label">OpenAI 模型名</span>
                <input
                  className="field-control"
                  value={aiModel}
                  onChange={(event) => setAiModel(event.target.value)}
                />
              </label>
            </div>
          ) : null}

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

          {isAutoMode ? (
            <>
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                AI 自动生成需要 OPENAI_API_KEY，会消耗 OpenAI API 额度。图片只随本次请求发送，不保存。
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  className="w-full rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="button"
                  disabled={isAiGeneratingContent}
                  onClick={handleAiGenerateContent}
                >
                  {isAiGeneratingContent ? "AI 生成商品内容中..." : "AI 生成商品内容"}
                </button>
                <button
                  className="w-full rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="button"
                  disabled={isAiGeneratingImages}
                  onClick={handleAiGenerateImages}
                >
                  {isAiGeneratingImages
                    ? "AI 生成图片图需中..."
                    : "AI 基于已确认内容生成图片图需"}
                </button>
              </div>
            </>
          ) : null}
        </form>

        <div className="rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {isAutoMode ? "全自动结果展示区" : "ChatGPT 手动中转工作区"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAutoMode
                    ? "先 AI 生成商品内容，确认或修改后，再基于已确认内容生成图片图需和生图 Prompt。"
                    : "推荐复制顺序：1. 复制 Step 1 商品内容任务书；2. 把标题、描述和卖点填回确认区；3. 复制 Step 2 图片图需任务书。"}
                </p>
                {isManualMode && !hasGenerated ? (
                  <p className="mt-2 text-sm font-medium text-[#b45309]">
                    输入已更新，点击“生成任务书”刷新任务书视图。
                  </p>
                ) : null}
                {copyStatus ? (
                  <p className="mt-2 text-sm font-medium text-[#15803d]">{copyStatus}</p>
                ) : null}
              </div>
              {isManualMode ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => copyText(modules[0].content, "商品内容任务书")}
                  >
                    复制商品内容任务书
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => copyText(modules[1].content, "图片图需任务书")}
                  >
                    复制图片图需任务书
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => copyText(allModuleText, "全部任务书")}
                  >
                    复制全部任务书
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-b border-slate-200 p-4">
            <div className="confirmed-panel">
              <h3 className="text-base font-semibold text-slate-950">
                已确认商品内容编辑区
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                步骤 2 只会基于这里确认后的标题、描述、核心卖点和购买提醒生成图片图需。请先生成或手动填写，再生成图片。
              </p>
              <div className="mt-4 grid gap-4">
                <label className="block">
                  <span className="field-label">最终标题</span>
                  <input
                    className="field-control"
                    value={confirmedContent.title}
                    onChange={(event) => updateConfirmedContent("title", event.target.value)}
                    placeholder="粘贴或编辑最终商品标题"
                  />
                </label>
                <label className="block">
                  <span className="field-label">最终描述</span>
                  <textarea
                    className="field-control min-h-36 resize-y"
                    value={confirmedContent.description}
                    onChange={(event) =>
                      updateConfirmedContent("description", event.target.value)
                    }
                    placeholder="粘贴或编辑最终商品描述"
                  />
                </label>
                <label className="block">
                  <span className="field-label">最终核心卖点</span>
                  <textarea
                    className="field-control min-h-28 resize-y"
                    value={confirmedContent.bulletPoints}
                    onChange={(event) =>
                      updateConfirmedContent("bulletPoints", event.target.value)
                    }
                    placeholder="每行一个核心卖点"
                  />
                </label>
                <label className="block">
                  <span className="field-label">购买前确认提醒</span>
                  <textarea
                    className="field-control min-h-24 resize-y"
                    value={confirmedContent.prePurchaseReminder}
                    onChange={(event) =>
                      updateConfirmedContent("prePurchaseReminder", event.target.value)
                    }
                    placeholder="填写或编辑购买前确认提醒"
                  />
                </label>
                <label className="block">
                  <span className="field-label">图片可用短文案</span>
                  <textarea
                    className="field-control min-h-24 resize-y"
                    value={confirmedContent.imageShortCopy}
                    onChange={(event) =>
                      updateConfirmedContent("imageShortCopy", event.target.value)
                    }
                    placeholder="可放在图片上的短文案，必须为西语或葡语，不能有中文"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4">
            <div className="workflow-panel">
              <h3 className="text-base font-semibold text-slate-950">生成链路总览</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                本工具分两步：Step 1 先生成并确认商品标题与描述；Step 2 再基于已确认内容生成图片图需和生图 Prompt。
              </p>
              <div className="workflow-grid">
                {[
                  ["1", "产品识别结果", "判断产品类型、用途、目标买家和信息缺口。"],
                  ["2", "市场调研总结", "总结买家关注点、竞品卖点和差评痛点。"],
                  ["3", "核心卖点", "提炼标题、描述和图片都要承接的卖点。"],
                  ["4", "新标题与描述", "基于前面结果重写适合目标站点的描述。"],
                  ["5", "图片策略判断", "从新描述抽取最值得视觉化的卖点。"],
                  ["6", "七张图策划", "每张图说明承接哪个卖点和解决哪个疑虑。"],
                  ["7", "生图 Prompt", "把策划转成可执行的无文字/带文字 Prompt。"],
                ].map(([step, title, description]) => (
                  <div className="workflow-card" key={step}>
                    <span>{step}</span>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isManualMode ? (
            <div className="border-b border-slate-200 p-4">
              <div className="manual-panel">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  无需 API 的 ChatGPT 手动中转模式
                </h3>
                <ol className="manual-steps">
                  <li>在左侧填写商品标题、描述、关键词并上传产品图片。</li>
                  <li>点击“生成任务书”。</li>
                  <li>Step 1：复制“商品内容生成任务书”到 ChatGPT，并同时上传产品图片。</li>
                  <li>把 ChatGPT 生成的标题、描述、卖点复制回来，填入“已确认商品内容编辑区”。</li>
                  <li>根据需要手动修改最终标题、描述、核心卖点、购买提醒和图片短文案。</li>
                  <li>Step 2：复制“图片图需与生图 Prompt 任务书”到 ChatGPT。</li>
                  <li>将 ChatGPT 返回的图片方案粘贴到“ChatGPT 结果整理区”，本页面帮你分区查看和复制。</li>
                </ol>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    className="primary-copy-button"
                    type="button"
                    onClick={() => copyText(modules[0].content, "商品内容生成任务书")}
                  >
                    一键复制商品内容任务书
                  </button>
                  <button
                    className="primary-copy-button"
                    type="button"
                    onClick={() => {
                      if (!hasConfirmedContent) {
                        setCopyStatus("请先完成 Step 1，并填写或确认最终标题、描述和核心卖点");
                        window.setTimeout(() => setCopyStatus(""), 2400);
                        return;
                      }

                      copyText(modules[1].content, "图片图需任务书");
                    }}
                  >
                    一键复制图片图需任务书
                  </button>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="field-label">ChatGPT 结果整理区</span>
                <span className="mb-2 block text-sm leading-6 text-slate-500">
                  将 ChatGPT 返回的完整商品方案粘贴到这里，本工具会帮你分区查看和复制。
                </span>
                <textarea
                  className="field-control min-h-44 resize-y"
                  value={manualDraft}
                  onChange={(event) => setManualDraft(event.target.value)}
                  placeholder="粘贴 ChatGPT 返回的完整商品方案..."
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setManualSavedResult(manualDraft)}
                >
                  保存到页面预览
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setManualDraft("");
                    setManualSavedResult("");
                  }}
                >
                  清空
                </button>
              </div>

              {manualSavedResult ? (
                <div className="manual-preview">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-950">
                        ChatGPT 返回结果预览
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        如果自动分区不准确，请直接使用完整结果复制。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => copyText(manualSavedResult, "完整 ChatGPT 返回结果")}
                      >
                        复制完整结果
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!manualSections.titleDescription}
                        onClick={() =>
                          copyText(manualSections.titleDescription, "标题与描述")
                        }
                      >
                        复制标题与描述
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!manualSections.imageBriefs}
                        onClick={() => copyText(manualSections.imageBriefs, "七张图片图需")}
                      >
                        复制七张图片图需
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!manualSections.imagePrompts}
                        onClick={() =>
                          copyText(manualSections.imagePrompts, "七张生图 Prompt")
                        }
                      >
                        复制七张生图 Prompt
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!manualSections.checklist}
                        onClick={() => copyText(manualSections.checklist, "最终检查清单")}
                      >
                        复制最终检查清单
                      </button>
                    </div>
                  </div>

                  <div className="manual-section-grid">
                    <section className="manual-section">
                      <h5>完整 ChatGPT 返回结果</h5>
                      <pre>{manualSavedResult}</pre>
                    </section>
                    <section className="manual-section">
                      <h5>商品标题与描述区</h5>
                      <pre>{manualSections.titleDescription || "未识别到该分区。"}</pre>
                    </section>
                    <section className="manual-section">
                      <h5>七张图片图需区</h5>
                      <pre>{manualSections.imageBriefs || "未识别到该分区。"}</pre>
                    </section>
                    <section className="manual-section">
                      <h5>七张生图 Prompt 区</h5>
                      <pre>{manualSections.imagePrompts || "未识别到该分区。"}</pre>
                    </section>
                    <section className="manual-section">
                      <h5>最终检查清单区</h5>
                      <pre>{manualSections.checklist || "未识别到该分区。"}</pre>
                    </section>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
          ) : null}

          {isAutoMode && (aiError || aiContentResult || aiImageResult) && (
            <div className="border-b border-slate-200 p-4">
              <div className="ai-result-panel">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      OpenAI 分步生成结果
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Step 1 生成商品内容，Step 2 基于已确认商品内容生成图片图需。
                    </p>
                  </div>
                  {(aiContentResult || aiImageResult) ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!aiContentResult}
                        onClick={() =>
                          copyText(stringifyForCopy(aiContentResult?.result), "AI 商品内容")
                        }
                      >
                        复制 AI 商品内容
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!titleAndDescriptionText}
                        onClick={() => copyText(titleAndDescriptionText, "商品标题和描述")}
                      >
                        复制商品标题和描述
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!imageBriefs}
                        onClick={() =>
                          copyText(stringifyForCopy(imageBriefs), "七张图片图需")
                        }
                      >
                        复制七张图片图需
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!imagePrompts}
                        onClick={() =>
                          copyText(stringifyForCopy(imagePrompts), "七张生图 Prompt")
                        }
                      >
                        复制七张生图 Prompt
                      </button>
                    </div>
                  ) : null}
                </div>

                {aiError ? <p className="ai-error">{aiError}</p> : null}
                {aiContentResult ? (
                  <pre className="result-content mt-4">
                    {stringifyForCopy(aiContentResult.result)}
                  </pre>
                ) : null}
                {aiImageResult ? (
                  <pre className="result-content mt-4">
                    {stringifyForCopy(aiImageResult.result)}
                  </pre>
                ) : null}
              </div>
            </div>
          )}

          {isManualMode ? (
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
                {module.title === "步骤 2：图片图需与生图 Prompt 任务书" ? (
                  <div className="image-card-grid">
                    {imagePlanningCards.map((card, cardIndex) => (
                      <details
                        className="image-task-card"
                        key={card.imageNumber}
                        open={[0, 1, 6].includes(cardIndex)}
                      >
                        <summary>
                          <span>
                            <strong>{card.imageNumber}</strong>
                            <span>{card.role}</span>
                          </span>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              copyText(card.content, `${card.imageNumber} 视觉策划字段`);
                            }}
                          >
                            复制本图字段
                          </button>
                        </summary>
                        <pre>{card.content}</pre>
                      </details>
                    ))}
                  </div>
                ) : null}
                {module.title === "步骤 2：图片图需与生图 Prompt 任务书" ? (
                  <div className="image-card-grid">
                    {imagePromptCards.map((card, cardIndex) => (
                      <details
                        className="image-task-card"
                        key={card.imageNumber}
                        open={[0, 1, 6].includes(cardIndex)}
                      >
                        <summary>
                          <span>
                            <strong>{card.imageNumber}</strong>
                            <span>{card.role}</span>
                          </span>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              copyText(card.content, `${card.imageNumber} Prompt 字段`);
                            }}
                          >
                            复制本图字段
                          </button>
                        </summary>
                        <pre>{card.content}</pre>
                      </details>
                    ))}
                  </div>
                ) : null}
                <pre className="result-content">{module.content}</pre>
              </details>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
