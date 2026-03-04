function mockParkingName() {
  const prefix = ["昭和", "明治", "山手", "平和公園", "住吉", "丸の内"];  // 前缀
  const base = ["東", "西", "南", "北", "中央", "外環", "内環"];  // 基础
  const suffix = ["駐車場", ];  // 后缀
  

  const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

  return randomChoice(prefix) + randomChoice(base) + randomChoice(suffix);
}

export function generateParkingOptions(num = 5) {
  return Array.from({ length: num }, (_, index) => ({
    value: `选项${index + 1}`,
    label: mockParkingName(),
  }));
}
