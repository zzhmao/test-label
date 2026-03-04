// mockData.js
import Mock from 'mockjs'

export function createMockData(count = 100) { // 默认值设置为100
  return Mock.mock({
    [`data|${count}`]: [{
      orderNumber: '@increment',
      parkingManagementNumber: '@increment',
      parkingLot: mockParkingName(),
      cabin: '@natural(1, 100)',
      carnumber: '@natural(1000, 9999)ABC',
      Stockingtime: '@datetime("yyyy-MM-dd HH:mm:ss")',
      paymenttime: '@datetime("yyyy-MM-dd HH:mm:ss")',
      Deliverytime: '@datetime("yyyy-MM-dd HH:mm:ss")',
      paymentfee: '@float(1000, 5000, 2, 2)',
      tag: '@pick(["駐車中", "決済失敗", "決済完了未出庫", "決済完了出庫済み", "決済完了出庫再課金", "返金済み", "後決済済み"])'
    }]
  }).data
}

function mockParkingName() {
  const prefix = ["昭和", "明治", "山手", "平和公園", "住吉", "丸の内"];  // 前缀
  const base = ["東", "西", "南", "北", "中央", "外環", "内環"];  // 基础
  const suffix = ["駐車場", ];  // 后缀
  

  const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

  return randomChoice(prefix) + randomChoice(base) + randomChoice(suffix);
}