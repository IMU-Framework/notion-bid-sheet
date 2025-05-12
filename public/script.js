fetch("/api/bid")
  .then(res => {
    if (!res.ok) throw new Error("API 錯誤，狀態碼：" + res.status);
    return res.json();
  })
  .then(data => {
    const grouped = groupBy(data, 'WorkType');
    renderPage(grouped, data);
  })
  .catch(err => {
    const container = document.getElementById('table-container');
    container.innerHTML = `<p class=\"text-red-600\">❌ 資料載入失敗：${err.message}</p>`;
    console.error("❌ 發生錯誤：", err);
  });

function groupBy(arr, key) {
  return arr.reduce((acc, cur) => {
    const group = cur[key] || "未分類";
    acc[group] = acc[group] || [];
    acc[group].push(cur);
    return acc;
  }, {});
}

function formatMoney(n) {
  return `$${n.toLocaleString("en-US")}`;
}

function renderPage(groups, fullData) {
  const container = document.getElementById('table-container');
  container.innerHTML = "";

  const totalAmount = fullData.reduce((sum, item) => sum + (item.Amount ?? 0), 0);
  const updateDate = fullData[0]?.Updated?.slice(0, 10) || "";

  const summaryBox = document.createElement("div");
  summaryBox.className = "text-right text-sm text-gray-600 mb-2";
  summaryBox.innerHTML = `💰 <strong>全部工種總計：</strong> ${formatMoney(totalAmount)}`;
  container.appendChild(summaryBox);

  Object.entries(groups).forEach(([WorkType, items]) => {
    const section = document.createElement("details");
    section.setAttribute("open", "true");
    section.className = "avoid-break";

    const summary = document.createElement("summary");
    summary.className = "cursor-pointer font-semibold bg-gray-100 px-4 py-2 rounded";
    summary.textContent = WorkType;

    const wrapper = document.createElement("div");
    wrapper.className = "overflow-x-auto mt-2";

    const groupTotal = items.reduce((sum, item) => sum + (item.Amount ?? 0), 0);

    const table = document.createElement("table");
    table.className = "w-full border border-gray-300 text-sm";
    table.innerHTML = `
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">#</th>
          <th class="border px-2 py-1">工程項目</th>
          <th class="border px-2 py-1">規格描述</th>
          <th class="border px-2 py-1 text-right">數量</th>
          <th class="border px-2 py-1">單位</th>
          <th class="border px-2 py-1 text-right">單價</th>
          <th class="border px-2 py-1 text-right">價格</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
          <tr>
            <td class="border px-2 py-1 text-center">${i + 1}</td>
            <td class="border px-2 py-1">${item.Item}</td>
            <td class="border px-2 py-1">${item.Spec}</td>
            <td class="border px-2 py-1 text-right">${item.Qty}</td>
            <td class="border px-2 py-1">${item.Unit}</td>
            <td class="border px-2 py-1 text-right">${formatMoney(item.UnitPrice)}</td>
            <td class="border px-2 py-1 text-right">${formatMoney(item.Amount)}</td>
          </tr>
        `).join('')}
        <tr class="font-semibold bg-gray-50">
          <td colspan="6" class="text-right border px-2 py-1">小計</td>
          <td class="border px-2 py-1 text-right">${formatMoney(groupTotal)}</td>
        </tr>
      </tbody>
    `;

    wrapper.appendChild(table);
    section.appendChild(summary);
    section.appendChild(wrapper);
    container.appendChild(section);
  });

  const footer = document.createElement("p");
  footer.className = "mt-6 text-sm text-right text-gray-500";
  footer.textContent = `最後更新時間：${updateDate}`;
  container.appendChild(footer);
}