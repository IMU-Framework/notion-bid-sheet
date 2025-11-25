// Notion 標單查詢 API：讀取 Notion Database，並輸出整理後的項目清單，供前端渲染使用

const { Client } = require("@notionhq/client");

// 初始化 Notion 客戶端
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// 將 rich_text 陣列轉為 HTML，支援基本樣式、換行與顏色
function renderRichText(blocks) {
  return blocks.map(b => {
    let text = b.plain_text;
    if (!text) return "";

    // 換行處理
    text = text.replace(/\n/g, "<br>");

    // 樣式處理
    if (b.annotations.code) text = `<code>${text}</code>`;
    if (b.annotations.bold) text = `<strong>${text}</strong>`;
    if (b.annotations.italic) text = `<em>${text}</em>`;
    if (b.annotations.underline) text = `<u>${text}</u>`;
    if (b.annotations.strikethrough) text = `<s>${text}</s>`;

    // 顏色處理（使用 inline style）
    const color = b.annotations.color;
    let style = "";

    if (color.endsWith("_background")) {
      const base = color.replace("_background", "");
      style += `background-color: ${getCssColor(base, true)}; color: black;`;
    } else if (color !== "default") {
      style += `color: ${getCssColor(color)};`;
    }

    if (style) {
      text = `<span style="${style}">${text}</span>`;
    }

    // 連結處理
    if (b.href) {
      text = `<a href="${b.href}" target="_blank" class="underline text-blue-600">${text}</a>`;
    }

    return text;
  }).join("");
}

// 將 Rollup轉為rich_text
function renderRollupRichText(rollupProp) {
  if (!rollupProp || rollupProp.type !== "rollup") return "";

  const roll = rollupProp.rollup;
  if (!roll || roll.type !== "array" || !Array.isArray(roll.array)) return "";

  const richTextBlocks = [];
  const urlLinks = [];

  for (const item of roll.array) {
    const { type } = item;
    const value = item[type];

    // 1) rich_text 或 title → 收集起來用 renderRichText
    if ((type === "rich_text" || type === "title") && Array.isArray(value)) {
      richTextBlocks.push(...value);
      continue;
    }

    // 2) url → 用簡單 a tag 自己組
    if (type === "url" && typeof value === "string" && value.trim() !== "") {
      urlLinks.push(
        `<a href="${value}" target="_blank" class="underline text-blue-600">${value}</a>`
      );
    }
  }

  const richTextHtml = richTextBlocks.length ? renderRichText(richTextBlocks) : "";
  const urlHtml = urlLinks.join("<br>");

  return [richTextHtml, urlHtml].filter(Boolean).join("<br>");
}

// 對應 Notion 顏色名稱轉 CSS 色碼
function getCssColor(name, isBg = false) {
  const map = {
    gray: "#6B7280", red: "#DC2626", yellow: "#FBBF24", green: "#16A34A",
    blue: "#2563EB", purple: "#7C3AED", pink: "#EC4899", brown: "#92400E",
  };
  const bgMap = {
    gray: "#E5E7EB", red: "#FECACA", yellow: "#FEF3C7", green: "#D1FAE5",
    blue: "#DBEAFE", purple: "#EDE9FE", pink: "#FCE7F3", brown: "#F3E8E0",
  };
  return isBg ? (bgMap[name] || "#F3F4F6") : (map[name] || "#111827");
}

// API handler
module.exports = async (req, res) => {
  try {
    // 讀取 Notion 資料庫名稱
    const dbMeta = await notion.databases.retrieve({ database_id: databaseId });
    const dbTitle = dbMeta.title?.[0]?.plain_text || "工程標單表格";
    const dbDescription = renderRichText(dbMeta.description || []);


    // 支援分頁抓取所有資料（Notion 預設每頁最多 100 筆）
    let allResults = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
      });

      allResults.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // 整理欄位：對應 Notion DB 欄位，若無值則 fallback 處理
    const results = allResults.map((page) => ({
      Stage: page.properties.Stage?.select?.name || "",
      WorkType: page.properties.WorkType?.select?.name || "",
      Item: page.properties.Item?.title?.[0]?.plain_text || "",
      Spec: renderRichText(page.properties.Spec?.rich_text || []),
      Note: renderRichText(page.properties.Note?.rich_text || []),
      Qty: page.properties.Qty?.number ?? null,
      Unit: page.properties.Unit?.rich_text?.[0]?.plain_text || "",
      UnitPrice: page.properties.UnitPrice?.number || 0,
      Amount: page.properties.Amount?.number ?? (
        (page.properties.Qty?.number || 0) * (page.properties.UnitPrice?.number || 0)
      ),
      Order: page.properties.Order?.number ?? null,
      Reference: renderRollupRichText(page.properties.Reference),
      Updated: page.last_edited_time || ""
    }));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ dbTitle, dbDescription, items: results });
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ error: "Failed to fetch Notion data" });
  }
};
