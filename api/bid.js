const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

function renderRichText(blocks) {
  return blocks.map(b => {
    let text = b.plain_text || "";
    text = text.replace(/\n/g, "<br>");
    if (b.annotations.code) text = `<code>${text}</code>`;
    if (b.annotations.bold) text = `<strong>${text}</strong>`;
    if (b.annotations.italic) text = `<em>${text}</em>`;
    if (b.annotations.underline) text = `<u>${text}</u>`;
    if (b.annotations.strikethrough) text = `<s>${text}</s>`;
    if (b.href) text = `<a href="${b.href}" class="text-blue-600 underline">${text}</a>`;
    return text;
  }).join("");
}

module.exports = async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
    });

    const results = response.results.map((page) => ({
      WorkType: page.properties.WorkType?.select?.name || "",
      Item: page.properties.Item?.title?.[0]?.plain_text || "",
      Spec: renderRichText(page.properties.Spec?.rich_text || []),
      Qty: page.properties.Qty?.number || 0,
      Unit: page.properties.Unit?.rich_text?.[0]?.plain_text || "",
      UnitPrice: page.properties.UnitPrice?.number || 0,
      Amount: page.properties.Amount?.number ?? (
        (page.properties.Qty?.number || 0) * (page.properties.UnitPrice?.number || 0)
      )
    }));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(results);
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ error: "Failed to fetch Notion data" });
  }
};
