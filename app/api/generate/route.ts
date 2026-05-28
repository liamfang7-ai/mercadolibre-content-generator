type GenerateRequest = {
  title: string;
  description: string;
  productInfo?: string;
  keywords: string;
  targetSite: string;
  productCategory: string;
  productPosition: string;
  visualStyle: string;
  generationDepth: string;
  outputLanguage: string;
  aiProvider?: "openai";
  model?: string;
  mode?: "content" | "images";
  confirmedContent?: {
    title?: string;
    description?: string;
    bulletPoints?: string;
    prePurchaseReminder?: string;
    imageShortCopy?: string;
  };
  images?: string[];
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

const STEP2_IMAGE_STRATEGY_RULES = `Step 2 image strategy rules:
1. Selling point conversion rule: do not turn a selling point directly into a generic benefit poster. Convert final-description selling point -> buyer concern -> purchase decision value -> image role -> visual expression -> image prompt.
2. For every selling point, answer: what buyer concern does it address, what purchase decision does it help, what image type fits it, whether it adds new information, whether it reduces mispurchase/returns/bad reviews, and whether it deserves its own image.
3. Build a complete visual master system before planning 7 images: main visual style, main color, secondary color, accent color, typography system, title position rules, info card style, icon style, product lighting, background variation boundaries, bottom reminder bar style, safe margins.
4. All 7 images must look like one consistent Mercado Libre / Mercado Livre product detail image set, not seven unrelated templates or standalone advertising posters.
5. Image value elimination: replace any image that provides no new information, solves no specific buyer concern, does not help purchase decisions, repeats the product without explanation, becomes a generic benefit poster, or lowers perceived quality.
6. For auto parts, moto parts and car accessories, prioritize decision-value images: pre-purchase confirmation, package contents, detail/interface/material close-ups, compatibility/reference information, installation position, old-vs-new comparison, size/quantity/left-right/front-rear confirmation, anti-misbuy reminder, real repair environment.
7. Reduce or avoid generic benefit posters, big product + big title + glow background, repetitive product display, decorative tech light effects, and filler images.
8. Choose visual route by product type: sensors/valves/interfaces use technical confirmation style; rubber bushings/chassis/suspension use industrial repair style; lights/electronics use clean tech style with restrained light; interior accessories use clean lifestyle style; tools use professional workbench style.
9. Packaging rule: do not default to ordinary kraft boxes. Show packaging only if user provided real branded packaging, packaging improves trust, or packaging information helps purchase decisions. Prefer flat lay, quantity labels, info cards, accessory list and clean background.
10. Avoid cheap tech poster style: no large blue glow, energy flows, sci-fi background, excessive glowing lines, or function posters with no practical information.
11. Detail image premium rule: restrained background, clear product, realistic texture, refined close-up frame, thin accurate guide lines, little but precise information; no thick outlines, excessive yellow, dirty tech textures, cheap template magnifier boxes.
12. Information density rule: information may be rich if it has purchase decision value, ordered layout, clear sections, hierarchy, mobile readability, and no empty benefit stacking.
13. Image 6 special restriction: image 6 must not become a generic function poster. Prefer real installation/use scene, repair trust image, old-vs-new comparison, product use position, anti-misbuy reminder, concrete function verification infographic, or detail + scenario combined image.
14. Detail image logic: each image must answer a concrete buyer question: what will I receive, is this the interface/size/position I need, what to confirm before buying, where are the real details, where is it installed, how to avoid buying wrong, which final-description selling point does it support.
15. Every image prompt must include: This image must look like one page from a consistent Mercado Libre automotive product detail image set, not a standalone advertising poster. It must follow the same typography system, spacing, icon style, color palette, information card style, and product lighting as the other images. The image must provide practical purchase decision value, not just a generic benefit slogan.
16. Every image prompt must also include: This image should not look like a generic advertising poster. It must work as a practical Mercado Libre product detail image that helps the buyer verify product information, reduce purchase risk, or understand the product value.
17. Final value check: each image provides different new information; at least 4 images directly help purchase confirmation; avoid kraft-box cheapness and cheap blue tech poster; details look refined; all images share typography, title hierarchy, info cards, icons and accent logic; no Chinese customer-visible text; no invented vehicle model, number, certification, brand, size or material.`;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getCustomerLanguage(data: GenerateRequest) {
  if (data.targetSite === "Mercado Livre Brasil") {
    return "Portuguese";
  }

  if (data.targetSite === "Mercado Libre México") {
    return "Spanish";
  }

  return data.outputLanguage.includes("葡") ? "Portuguese" : "Spanish";
}

function buildPrompt(data: GenerateRequest) {
  const customerLanguage = getCustomerLanguage(data);
  const imageReminder =
    data.images && data.images.length > 0
      ? `The user will send ${data.images.length} uploaded product image(s). Analyze the visible product appearance, structure, color, material, accessories, installation position and details. Do not change or invent the product appearance.`
      : "当前未上传产品图片，建议补充产品主图、细节图、尺寸图、包装图或安装场景图，以获得更准确的图片图需和生图 Prompt。";

  if (data.mode === "images") {
    return `You are a Mercado Libre / Mercado Livre product image strategist and AI image prompt planner.

Generate ONLY image strategy, seven image visual briefs, and seven image prompt packages. Do not generate product title or product description in this mode.

Original product information:
- 商品标题: ${data.title || "需要卖家补充确认"}
- 商品描述: ${data.description || "需要卖家补充确认"}
- 我的产品已知信息: ${data.productInfo || "需要卖家补充确认"}
- 商品关键词: ${data.keywords || "需要卖家补充确认"}
- 目标站点: ${data.targetSite}
- 产品类目: ${data.productCategory}
- 产品定位: ${data.productPosition}
- 目标市场视觉风格: ${data.visualStyle}
- Customer-facing language: ${customerLanguage}
- Product images: ${imageReminder}

Confirmed product content:
- Final title: ${data.confirmedContent?.title || "需要卖家补充确认"}
- Final description: ${data.confirmedContent?.description || "需要卖家补充确认"}
- Final bullet points: ${data.confirmedContent?.bulletPoints || "需要卖家补充确认"}
- Pre-purchase reminder: ${data.confirmedContent?.prePurchaseReminder || "需要卖家补充确认"}
- Image short copy candidates: ${data.confirmedContent?.imageShortCopy || "需要卖家补充确认"}

Critical rules:
1. Read the confirmed title, confirmed description and confirmed selling points first.
2. Extract the most visual selling points from the final description.
3. Image 1 is fixed as a white-background main image.
4. Images 2-5 must be dynamically planned based on final description selling points. Do not use a fixed image order.
5. Images 6-7 must serve conversion and can be usage scene, purchase confirmation, trust enhancement, comparison, or installation reminder.
6. Every image must state which final-description selling point it supports and why the image is needed.
7. Customer-facing image text must be in ${customerLanguage}; no Chinese text on images.
8. Do not invent vehicle models, years, OE numbers, dimensions, material, certifications, logos, brands or compatibility.
9. Keep product appearance consistent with uploaded product images.

${STEP2_IMAGE_STRATEGY_RULES}

Return valid JSON only. Use this exact top-level shape:
{
  "sevenImageBriefs": {
    "imageStrategyJudgment": {
      "productTypeJudgment": string,
      "recommendedVisualRoute": string,
      "recommendedImageGroupStructure": string,
      "visualSellingPointsFromConfirmedDescription": string[],
      "topBuyerConcerns": string[],
      "recommendedMainColors": string,
      "recommendedLayoutKeywords": string[],
      "recommendedCopyStyle": string,
      "stylesToAvoid": string[]
    },
    "items": [
      {
        "imageNumber": string,
        "imageName": string,
        "finalDescriptionSellingPointSupported": string,
        "buyerConcern": string,
        "purchaseDecisionValue": string,
        "whyThisImageIsNeeded": string,
        "newInformationProvided": string,
        "avoidsGenericBenefitPoster": string,
        "mergePlanIfSellingPointIsWeak": string,
        "howItKeepsSetConsistency": string,
        "buyerConcernSolved": string,
        "recommendedVisualStyle": string,
        "backgroundSuggestion": string,
        "productPlacement": string,
        "mainCopy": string,
        "secondaryCopy": string,
        "copyPosition": string,
        "fontStyle": string,
        "fontColor": string,
        "accentColor": string,
        "productLayout": string,
        "infoModulePosition": string,
        "needsIcon": string,
        "needsCloseUp": string,
        "needsDimensionLines": string,
        "needsInstallationOrSceneBackground": string,
        "forbiddenElements": string
      }
    ]
  },
  "sevenImagePrompts": [
    {
      "imageNumber": string,
      "finalDescriptionSellingPointSupported": string,
      "buyerConcernThisImageSolves": string,
      "purchaseDecisionValue": string,
      "visualizedSellingPoint": string,
      "avoidGenericBenefitPosterInstruction": string,
      "noTextPrompt": string,
      "textReferencePrompt": string,
      "negativePrompt": string,
      "copyLayoutExplanation": string,
      "fontAndColorExecution": string,
      "backgroundExecution": string,
      "productPreservationRules": string,
      "postGenerationCheckpoints": string
    }
  ]
}`;
  }

  if (data.mode === "content") {
    return `You are a Mercado Libre / Mercado Livre product content strategist. Generate ONLY Step 1 product content. Do not generate image briefs or image prompts in this mode.

Product information:
- 商品标题: ${data.title || "需要卖家补充确认"}
- 商品描述: ${data.description || "需要卖家补充确认"}
- 我的产品已知信息: ${data.productInfo || "需要卖家补充确认"}
- 商品关键词: ${data.keywords || "需要卖家补充确认"}
- 目标站点: ${data.targetSite}
- 产品类目: ${data.productCategory}
- 产品定位: ${data.productPosition}
- 生成深度: ${data.generationDepth}
- Customer-facing language: ${customerLanguage}
- Product images: ${imageReminder}

Critical rules:
1. The new product description must not be a light rewrite of the original description.
2. Generate better Mercado Libre / Mercado Livre content based on product identification, keywords, buyer concerns, market research direction, product positioning and images.
3. Customer-facing title, description, bullet points, SEO copy and pre-purchase reminder must be in ${customerLanguage}; no Chinese.
4. Do not invent vehicle models, years, OE numbers, dimensions, material, certifications, logos, brands or compatibility.
5. Market research has no live search. Use "建议调研方向" and "基于通用电商经验的判断".

Return valid JSON only. Use this exact top-level shape:
{
  "productIdentification": object,
  "marketResearchDirection": object,
  "coreSellingPointExtraction": object,
  "listingCopy": {
    "generationBasis": string,
    "titles": { "seoTitle": string, "conversionTitle": string, "simpleProfessionalTitle": string },
    "bulletPoints": string[],
    "newDescription": string,
    "seoCopy": string,
    "prePurchaseReminder": string,
    "imageShortCopy": string[],
    "needsSellerConfirmation": string[]
  },
  "confirmedContentDraft": {
    "title": string,
    "description": string,
    "bulletPoints": string[],
    "prePurchaseReminder": string,
    "imageShortCopy": string[]
  }
}`;
  }

  return `You are a Mercado Libre / Mercado Livre cross-border ecommerce content expert. Generate a complete structured product content plan for Latin American marketplaces.

Product information:
- 商品标题: ${data.title || "需要卖家补充确认"}
- 商品描述: ${data.description || "需要卖家补充确认"}
- 我的产品已知信息: ${data.productInfo || "需要卖家补充确认"}
- 商品关键词: ${data.keywords || "需要卖家补充确认"}
- 目标站点: ${data.targetSite}
- 产品类目: ${data.productCategory}
- 产品定位: ${data.productPosition}
- 目标市场视觉风格: ${data.visualStyle}
- 生成深度: ${data.generationDepth}
- 输出语言: ${data.outputLanguage}
- Customer-facing language: ${customerLanguage}
- Product images: ${imageReminder}

Critical rules:
1. Final customer-facing content must not contain Chinese.
2. Product title, description, bullet points, SEO copy, buying reminders and image text must be in ${customerLanguage}.
3. Chinese may only appear in internal seller explanations, never in customer-facing content or image text.
4. Do not invent vehicle models, years, OE numbers, dimensions, material, certifications, logos, brands, compatibility, sales data, reviews or competitor links.
5. If information cannot be confirmed from text or images, write "需要卖家补充确认".
6. If this is auto parts, moto parts or car accessories, analyze compatibility, installation position, dimensions, material, package quantity, whether it is universal, installation difficulty and return risks.
7. You have no live web search unless explicitly provided. For market research, write "建议调研方向" and "基于通用电商经验的判断"; do not pretend to have performed real-time research.
8. Image planning must follow Mercado Libre México / Mercado Livre Brasil professional marketplace style: clean, trustworthy, minimal text, no Chinese ecommerce style, no Taobao/Pinduoduo style, no red-yellow aggressive promotion style.
9. Product original image protection: use uploaded product images as reference; keep product shape, color, material and visible details consistent; do not add parts, ports, buttons, lights, cables or packaging that are not visible/provided.
10. Image text must be Spanish for México or Portuguese for Brasil. No Chinese text on any image.
11. Do not use a fixed seven-image template. First make an image strategy judgment based on product type, selling points, buyer concerns and target visual style.
12. Image 1 must be a white-background main image. Images 2-5 must be dynamically selected from: core selling point, detail/workmanship, function effect, installation position, compatibility confirmation, quantity/set, size confirmation, usage scene, anti-misbuy reminder. Images 6-7 usually prioritize usage/installation scene and pre-purchase confirmation, but may be adjusted by product type.
13. For image briefs and prompts, include concrete text position, font style, font color, color palette, background type, product placement, whether to use icons, close-ups or dimension lines. Avoid generic "professional style" wording.
14. Follow this chain strictly: product identification -> market research and buyer concerns -> core selling point extraction -> new title and description -> image strategy -> seven image visual planning -> seven image prompt package.
15. The new product description must not be a light rewrite of the original description. It must be regenerated from the title, original description, keywords, product images, identification result, market research direction and core selling points.
16. Image briefs and image prompts must be strongly tied to the new generated description and extracted selling points. Each image must state which new-description selling point it supports and why the image is needed.

Return valid JSON only. Do not wrap in markdown. Use this exact top-level shape:
{
  "productIdentification": {
    "recognitionResult": string,
    "categoryJudgment": string,
    "productUse": string,
    "targetBuyer": string,
    "useScenarios": string[],
    "coreSellingPoints": string[],
    "informationGaps": string[],
    "badReviewRisks": string[],
    "autoPartsExtraAnalysis": string[]
  },
  "marketResearchDirection": {
    "disclaimer": string,
    "recommendedResearchDirections": string[],
    "generalEcommerceJudgment": string[],
    "competitorTitlePatterns": string[],
    "buyerConcerns": string[],
    "badReviewPatterns": string[],
    "imageStyleResearchPoints": string[]
  },
  "coreSellingPointExtraction": {
    "finalPositioningSentence": string,
    "topSellingPoints": [
      {
        "priority": string,
        "sellingPoint": string,
        "sourceEvidence": string,
        "buyerValue": string,
        "useInTitle": string,
        "useInDescription": string,
        "visualizeInImages": string,
        "needsSellerConfirmation": string
      }
    ],
    "buyerConcernMapping": [
      {
        "buyerConcern": string,
        "matchingSellingPoint": string,
        "descriptionTreatment": string,
        "imageVisualization": string,
        "missingInfoTreatment": string
      }
    ],
    "sellingPointsToAvoid": string[],
    "mustCarryIntoDescriptionAndImages": string[]
  },
  "listingCopy": {
    "generationBasis": string,
    "titles": { "seoTitle": string, "conversionTitle": string, "simpleProfessionalTitle": string },
    "bulletPoints": string[],
    "newDescription": string,
    "seoCopy": string,
    "prePurchaseReminder": string,
    "visualSellingPointsFromNewDescription": [
      {
        "visualSellingPoint": string,
        "sourceParagraphInNewDescription": string,
        "suggestedImageNumber": string,
        "suggestedImageType": string,
        "buyerConcern": string
      }
    ],
    "imageShortCopy": string[]
  },
  "sevenImageBriefs": {
    "imageStrategyJudgment": {
      "productTypeJudgment": string,
      "recommendedVisualRoute": string,
      "recommendedImageGroupStructure": string,
      "topSellingPointPriorities": string[],
      "topBuyerConcerns": string[],
      "recommendedMainColors": string,
      "recommendedLayoutKeywords": string[],
      "recommendedCopyStyle": string,
      "stylesToAvoid": string[],
      "visualSellingPointsFromNewDescription": string[]
    },
    "visualSpec": string[],
    "originalImageProtectionRules": string[],
    "languageRules": string[],
    "items": [
      {
        "imageNumber": string,
        "imageName": string,
        "imageRole": string,
        "imagePurpose": string,
        "newDescriptionSellingPointSupported": string,
        "whyThisImageIsNeeded": string,
        "isMustHave": string,
        "applicableSellingPoint": string,
        "applicableProductType": string,
        "recommendedVisualStyle": string,
        "recommendedBackground": string,
        "productPlacementSuggestion": string,
        "copyPositionSuggestion": string,
        "copyStructureSuggestion": string,
        "overallLayoutSuggestion": string,
        "titleSuggestion": string,
        "supportingCopySuggestion": string,
        "fontSuggestion": string,
        "fontColorSuggestion": string,
        "colorPaletteSuggestion": string,
        "iconCloseupDimensionLineSuggestion": string,
        "infoCardOrModuleSuggestion": string,
        "peopleVehicleSceneSuggestion": string,
        "buyerConcernSolved": string,
        "forbiddenElements": string
      }
    ]
  },
  "sevenImagePrompts": [
    {
      "imageNumber": string,
      "imageName": string,
      "corePurpose": string,
      "newDescriptionSellingPointSupported": string,
      "whyGenerateThisImage": string,
      "customerVisibleCopyLanguage": string,
      "generateNoTextImageFirst": string,
      "visualStyleSummary": string,
      "textOnImage": string,
      "noTextPrompt": string,
      "textReferencePrompt": string,
      "negativePrompt": string,
      "compositionExecution": string,
      "copyLayoutExecution": string,
      "fontAndColorExecution": string,
      "backgroundExecution": string,
      "infoModulePosition": string,
      "sellingPointVisualizationMethod": string,
      "productPreservationRules": string,
      "postGenerationCheckpoints": string
    }
  ],
  "finalChecklist": string[]
}`;
}

function extractOutputText(response: unknown) {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  return JSON.stringify(response);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "未配置 OPENAI_API_KEY，请在 Vercel 环境变量或本地 .env.local 中配置。",
      },
      500,
    );
  }

  let data: GenerateRequest;

  try {
    data = (await request.json()) as GenerateRequest;
  } catch {
    return jsonResponse({ error: "请求格式不正确，请发送 JSON 数据。" }, 400);
  }

  const images = data.images ?? [];

  if (images.length > 6) {
    return jsonResponse({ error: "最多支持 6 张产品图片。" }, 400);
  }

  const content = [
    { type: "input_text", text: buildPrompt(data) },
    ...images.map((imageUrl) => ({
      type: "input_image",
      image_url: imageUrl,
      detail: "high",
    })),
  ];

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: data.model || DEFAULT_MODEL,
        input: [
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const message =
        typeof responseBody?.error?.message === "string"
          ? responseBody.error.message
          : "OpenAI 请求失败，请稍后重试。";
      return jsonResponse({ error: message }, response.status);
    }

    const outputText = extractOutputText(responseBody);
    let result: unknown = outputText;

    try {
      result = JSON.parse(outputText);
    } catch {
      result = { rawText: outputText };
    }

    return jsonResponse({
      provider: "openai",
      model: data.model || DEFAULT_MODEL,
      result,
    });
  } catch {
    return jsonResponse({ error: "OpenAI 请求失败，请检查网络或稍后重试。" }, 500);
  }
}
