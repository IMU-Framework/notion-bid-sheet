fetch("/api/bid")
  .then(res => res.json())
  .then(data => {
    const grouped = groupBy(data, 'workType');
    renderTable(grouped);
  });

function groupBy(arr, key) {
  return arr.reduce((acc, cur) => {
    acc[cur[key]] = acc[cur[key]] || [];
    acc[cur[key]].push(cur);
    return acc;
  }, {});
}

function renderTable(groups) {
  const container = document.getElementById('table-container');
  Object.entries(groups).forEach(([workType, items]) => {
    const table = document.createElement('table');
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
            <td class="border px-2 py-1">${item.item}</td>
            <td class="border px-2 py-1">${item.spec}</td>
            <td class="border px-2 py-1 text-right">${item.qty}</td>
            <td class="border px-2 py-1">${item.unit}</td>
            <td class="border px-2 py-1 text-right">${item.unitPrice}</td>
            <td class="border px-2 py-1 text-right">${item.qty * item.unitPrice}</td>
          </tr>
        `).join('')}
        <tr class="font-semibold bg-gray-50">
          <td colspan="6" class="text-right border px-2 py-1">小計</td>
          <td class="border px-2 py-1 text-right">
            ${items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)}
          </td>
        </tr>
      </tbody>
    `;
    const section = document.createElement('section');
    section.innerHTML = `<h2 class="font-bold text-lg my-2">${workType}</h2>`;
    section.appendChild(table);
    container.appendChild(section);
  });
}
