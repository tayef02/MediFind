export function money(n) {
  return '৳' + Number(n || 0).toFixed(2);
}

export function plural(unit) {
  if (unit === 'box') {
    return 'boxes';
  }
  return unit + 's';
}

export function unitCount(n, unit) {
  if (n === 1) {
    return n + ' ' + unit;
  }
  return n + ' ' + plural(unit);
}

export function sellUnits(medicine, stock) {
  const hasPacks = medicine.strip_size || medicine.box_size;
  const list = [];

  if (!hasPacks || !stock || stock.sell_loose) {
    list.push({ name: medicine.unit, size: 1 });
  }
  if (medicine.strip_size && (!stock || stock.sell_strip)) {
    list.push({ name: 'strip', size: medicine.strip_size });
  }
  if (medicine.box_size && (!stock || stock.sell_box)) {
    list.push({ name: medicine.box_name, size: medicine.box_size });
  }

  if (list.length === 0) {
    list.push({ name: medicine.unit, size: 1 });
  }
  return list;
}

export function breakdown(n, medicine, stock) {
  let boxSize = 0;
  let stripSize = 0;
  if (medicine.box_size && (!stock || stock.sell_box)) {
    boxSize = medicine.box_size;
  }
  if (medicine.strip_size && (!stock || stock.sell_strip)) {
    stripSize = medicine.strip_size;
  }

  let rest = n;
  const parts = [];

  if (boxSize && rest >= boxSize) {
    const boxes = Math.floor(rest / boxSize);
    parts.push(unitCount(boxes, medicine.box_name));
    rest = rest - boxes * boxSize;
  }
  if (stripSize && rest >= stripSize) {
    const strips = Math.floor(rest / stripSize);
    parts.push(unitCount(strips, 'strip'));
    rest = rest - strips * stripSize;
  }
  if (rest > 0 || parts.length === 0) {
    parts.push(unitCount(rest, medicine.unit));
  }
  return parts.join(' + ');
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function updateBadge() {
  window.dispatchEvent(new Event('badge-update'));
}

export function mainUnit(medicine) {
  if (medicine.strip_size) {
    return { name: 'strip', size: medicine.strip_size };
  }
  return { name: medicine.unit, size: 1 };
}

export function splitQuantity(n, medicine, stock) {
  let boxSize = 0;
  let stripSize = 0;
  if (medicine.box_size && (!stock || stock.sell_box)) {
    boxSize = medicine.box_size;
  }
  if (medicine.strip_size && (!stock || stock.sell_strip)) {
    stripSize = medicine.strip_size;
  }

  let rest = n;
  let boxes = 0;
  let strips = 0;
  if (boxSize) {
    boxes = Math.floor(rest / boxSize);
    rest = rest - boxes * boxSize;
  }
  if (stripSize) {
    strips = Math.floor(rest / stripSize);
    rest = rest - strips * stripSize;
  }
  return { boxes: boxes, strips: strips, loose: rest };
}

export function stockCalc(stock) {
  const cost = Number(stock.cost_price);
  const sell = Number(stock.price);
  const unitProfit = sell - cost;
  let margin = 0;
  if (cost > 0) {
    margin = (unitProfit / cost) * 100;
  }
  return {
    unitProfit: unitProfit,
    margin: margin,
    costValue: stock.quantity * cost,
    sellValue: stock.quantity * sell,
    profit: stock.quantity * unitProfit,
  };
}

export function daysUntil(date) {
  if (!date) {
    return Infinity;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + 'T00:00:00') - today) / 86400000);
}
