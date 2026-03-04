import request from '@/utils/request'

export function upload(dataToSend,timestamp) {
  return request({
    url: `/layout/upload?timestamp=${timestamp}`, // 你的 API 路径，加上查询参数
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    data: dataToSend,
    baseURL: '/', // 临时覆盖 baseURL
  })
}
export function result(data, timestamp) {
  return request({
    url: `/layout/result?timestamp=${timestamp}`, // 修改 API 路径匹配你的需求
    method: 'post',
    headers: {
      "Content-Type": "application/json",
    },
    data: { data }, // 以对象的形式发送 data
    baseURL: '/', // 临时覆盖 baseURL 为根路径
  })
}
export function uploadCanvasAndFile(formData) {
  return request({
    url: '/layout/background/upload', // API的URL路径
    method: 'post',
    data: formData,
    baseURL: '/', // 临时覆盖 baseURL
  })
}

export function uploadCanvasData(parkingSpacesData, cameraData) {
  return request({
    url: '/layout/camera', 
    method: 'post',
    data: {
      parkingSpacesData, // 已有的停车位数据
      cameraData, // 新增的相机数据
    },
    baseURL: '/', // 临时覆盖 baseURL
  })
}
