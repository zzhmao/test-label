import { fabric } from "fabric";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";
import axios from "axios";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import parkingSpaceSvg from "@/assets/draw/simulationparkingspace.svg";
export default {
  methods: {
    format(percentage) {
      // 这里可以根据percentage自定义格式，例如：
      return percentage + "%";
    },
    addCanvasScalingAndPanning(canvas) {
      canvas.on("mouse:wheel", (opt) => {
        if (opt.e.shiftKey) {
          var delta = opt.e.deltaY;
          var zoom = canvas.getZoom();
          zoom *= 0.999 ** delta;
          if (zoom > 5) zoom = 5; // 设置最大缩放比例
          if (zoom < 1) zoom = 1; // 设置最小缩放比例
          canvas.setZoom(zoom);
          canvas.setWidth(840 * zoom); // 根据缩放比例调整画布宽度
          canvas.setHeight(594 * zoom); // 根据缩放比例调整画布高度
          canvas.forEachObject((obj) => {
            if (obj.type === "line") {
              obj.strokeWidth = 2 / zoom;
            }
          });
          canvas.requestRenderAll();
          opt.e.preventDefault();
          opt.e.stopPropagation();
        }
      });
    },
    // 刪除功能
    enableEraser() {
      this.canvas.isDrawingMode = false;
      this.canvas.getActiveObjects().forEach((obj) => {
        this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject().renderAll();
    },
    // 上傳背景
    async loadImage(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          if (file.type === 'application/pdf') {
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
              try {
                const typedArray = new Uint8Array(e.target.result);
                console.log('PDF 文件加载成功');
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                console.log('PDF 文档获取成功:', pdf);
                const page = await pdf.getPage(1);
                console.log('PDF 第一页获取成功');
                let viewport;
                try {
                  viewport = page.getViewport({ scale: 1 });
                  if (!viewport || isNaN(viewport.width) || isNaN(viewport.height)) {
                    const view = page.view;
                    const scale = 1;
                    viewport = {
                      width: view[2] * scale,
                      height: view[3] * scale
                    };
                  }
                  console.log('PDF原始尺寸 - 宽度:', viewport.width, '高度:', viewport.height);
                } catch (error) {
                  console.error('获取 PDF 页面视口信息失败:', error);
                  return;
                }
                const canvasEl = document.createElement('canvas');
                const context = canvasEl.getContext('2d');
                canvasEl.width = 4200;
                canvasEl.height = 2970;
                // 计算适应canvas的缩放比例，保持内容比例不变
                const scaleX = canvasEl.width / viewport.width;
                const scaleY = canvasEl.height / viewport.height;
                const scaleToFit = Math.min(scaleX, scaleY);
                // 动态计算canvasScale值，以确保PDF内容在缩放后不失真
                const canvasScaleX = scaleToFit * viewport.width / viewport.width;
                const canvasScaleY = scaleToFit * viewport.height / viewport.height;
                // 调整渲染比例
                context.scale(canvasScaleX, canvasScaleY);
                context.save();
                context.scale(1, -1);
                context.translate(0, -viewport.height);
                try {
                  await page.render({ canvasContext: context, viewport: viewport }).promise;
                } catch (renderError) {
                  console.error('PDF 页面渲染到 canvas 失败:', renderError);
                  context.restore();
                  return;
                }
                context.restore();
                console.log('PDF 页面渲染到 canvas 成功');
                canvasEl.toBlob((blob) => {
                  // 创建一个File对象
                  const pngFile = new File([blob], "document.png", { type: "image/png" });
                  this.originalFile = pngFile; // 保存渲染后的图片作为File对象
                  const imgUrl = URL.createObjectURL(pngFile);
                  this.setBackgroundImage(imgUrl, true, null); // 使用生成的URL设置背景图片
                  canvasEl.remove();
                }, 'image/png');
                const imgUrl = canvasEl.toDataURL('image/png', 1.0);
                this.setBackgroundImage(imgUrl, true, file);
                canvasEl.remove();
              } catch (error) {
                console.error('处理 PDF 文件时出错:', error);
              }
            };
            fileReader.readAsArrayBuffer(file);
          } else if (file.type.match('image.*')) {
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
              console.log('图片文件加载成功');
              const img = new Image();
              img.onload = () => {
                const canvasEl = document.createElement('canvas');
                const context = canvasEl.getContext('2d');
                // 固定canvas画布大小
                const canvasWidth = 4200;
                const canvasHeight = 2970;
                canvasEl.width = canvasWidth;
                canvasEl.height = canvasHeight;
                // 计算图片填充画布时的缩放比例
                const scaleX = canvasWidth / img.width;
                const scaleY = canvasHeight / img.height;
                const scale = Math.min(scaleX, scaleY); // 选择较小的比例以确保图片完整显示
                // 计算图片绘制时的大小
                const imgWidth = img.width * scale;
                const imgHeight = img.height * scale;
                // 计算绘制的起始点，以使图片居中显示
                const startX = (canvasWidth - imgWidth) / 2;
                const startY = (canvasHeight - imgHeight) / 2;
                // 绘制图片到canvas上
                context.drawImage(img, startX, startY, imgWidth, imgHeight);
                // 将canvas内容转换成Blob，再转换成File对象
                canvasEl.toBlob((blob) => {
                  const pngFile = new File([blob], "document.png", { type: "image/png" });
                  this.originalFile = pngFile; // 保存渲染后的图片作为File对象
                  const imgUrl = URL.createObjectURL(pngFile);
                  this.setBackgroundImage(imgUrl, true, null); // 使用生成的URL设置背景图片
                  canvasEl.remove();
                }, 'image/png');
              };
              img.src = e.target.result;
            };
            fileReader.readAsDataURL(file);
          }
        } catch (error) {
          console.error('处理文件时出错:', error);
        }
      }
    },
    setBackgroundImage(imgUrl, isPdf = false) {
      try {
        fabric.Image.fromURL(imgUrl, (img) => {
          console.log('图片加载到 Fabric 成功');
          // 选择合适的缩放比例
          let scale;
          if (isPdf) {
            // 对于 PDF 图像，使用能填满画布的缩放比例
            const scaleX = this.canvas.width / img.width;
            const scaleY = this.canvas.height / img.height;
            scale = Math.min(scaleX, scaleY);
          } else {
            // 对于常规图像，使用能完全显示在画布上的缩放比例
            scale = Math.min(
              this.canvas.width / img.width,
              this.canvas.height / img.height
            );
          }
          console.log('计算的缩放比例:', scale);
          this.canvas.setBackgroundImage(
            img,
            this.canvas.renderAll.bind(this.canvas),
            {
              scaleX: scale,
              scaleY: scale,
              originX: 'center',
              originY: 'center',
              top: this.canvas.height / 2,
              left: this.canvas.width / 2
            }
          );
          console.log('背景图片设置成功');
        }, {
          crossOrigin: 'anonymous',
          onError: (e) => {
            console.error('Fabric.js 图片加载失败:', e);
          }
        });
      } catch (error) {
        console.error('设置背景图片时出错:', error);
      }
    },
    upLoadCanvasAndFile(canvasImageDataURL, originalFile, dataToSend) {
      console.log('fromGoToSimulation:', this.$store.state.canvas.fromGoToSimulation);
      console.log('canvasImageDataURL:', !!canvasImageDataURL);
      let attemptCount = 0;
      const maxAttempts = 300;
      // 检查是否是从goToSimulation方法跳转过来的
      const fromGoToSimulation = this.$store.state.canvas.fromGoToSimulation;
      const prepareAndUpload = (blob, originalFileOverride = null) => {
        const formData = new FormData();
        formData.append("originalcanvas", blob, "canvas-image.png");
        // 使用originalFileOverride如果定义了，否则回退到originalFile
        const fileToUpload = originalFileOverride || originalFile;
        if (fileToUpload) {
          formData.append("originalfile", fileToUpload);
        }
        const jsonStr = JSON.stringify(dataToSend);
        formData.append("jsondata", jsonStr);
        // 如果是从goToSimulation跳转，添加parkingSpaceCoords数据
        if (fromGoToSimulation) {
          const parkingSpaceCoords = this.$store.state.canvas.parkingSpaceCoords;
          const scaleFix = this.$store.state.canvas.scaleFix;
          const scaleFixStr = JSON.stringify(scaleFix);
          const parkingSpaceCoordsStr = JSON.stringify(parkingSpaceCoords);
          formData.append("parkingSpaceCoords", parkingSpaceCoordsStr,);
          formData.append("scaleFix", scaleFixStr);
        }
        const url = fromGoToSimulation
          ? `http://54.92.84.160/layout/background/fromlayout`
          : `http://54.92.84.160/layout/background/upload`;
        axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        })
          .then(response => {
            console.log('文件和画布图像上传成功:', response);
            if (fromGoToSimulation) {
              if (response.data.urls) {
                response.data.urls.forEach(url => console.log('Uploaded file URL:', url));
              }
              if (response.data.croppedImg) { // 确认响应中包含裁剪后的图像
                const croppedImgBase64 = response.data.croppedImg; // 获取裁剪后的图像的Base64编码
                // 清除画布上的现有内容
                this.parkingLotCanvas.clear();
                // 使用fabric.Image.fromURL加载Base64编码的图像，并设置为画布背景
                fabric.Image.fromURL(`data:image/png;base64,${croppedImgBase64}`, (img) => {
                  this.parkingLotCanvas.setBackgroundImage(img, this.parkingLotCanvas.renderAll.bind(this.parkingLotCanvas));
                });
                this.cameraCanvas.clear();
                // 使用fabric.Image.fromURL加载Base64编码的图像，并设置为画布背景
                fabric.Image.fromURL(`data:image/png;base64,${croppedImgBase64}`, (img) => {
                  this.cameraCanvas.setBackgroundImage(img, this.cameraCanvas.renderAll.bind(this.cameraCanvas));
                });
              }
              console.log('fromlayout');
              const ID = response.data.timestamp; // 从response.data中获取timestamp
              this.ID = ID;
              const data = response.data;
              if (data && data.parkingSpacesData && data.scale) { // 确保数据存在
                this.addParkingSpaceSvg(data.parkingSpacesData, parseFloat(data.scale));
              } else {
                // 如果数据不存在，可以在这里处理错误或显示一些提示信息
                console.error("无法获取停车位数据或比例尺");
              }
              this.showModal = false;
              // 然后再跳转到parking-lot标签
              this.activeName = "parking-lot";
            } else {
              if (response.data.urls) {
                response.data.urls.forEach(url => console.log('Uploaded file URL:', url));
              }
              if (response.data.croppedImg) { // 确认响应中包含裁剪后的图像
                const croppedImgBase64 = response.data.croppedImg; // 获取裁剪后的图像的Base64编码
                // 清除画布上的现有内容
                this.parkingLotCanvas.clear();
                // 使用fabric.Image.fromURL加载Base64编码的图像，并设置为画布背景
                fabric.Image.fromURL(`data:image/png;base64,${croppedImgBase64}`, (img) => {
                  this.parkingLotCanvas.setBackgroundImage(img, this.parkingLotCanvas.renderAll.bind(this.parkingLotCanvas));
                });
                this.cameraCanvas.clear();
                // 使用fabric.Image.fromURL加载Base64编码的图像，并设置为画布背景
                fabric.Image.fromURL(`data:image/png;base64,${croppedImgBase64}`, (img) => {
                  this.cameraCanvas.setBackgroundImage(img, this.cameraCanvas.renderAll.bind(this.cameraCanvas));
                });
              }
              const ID = response.data.timestamp; // 从response.data中获取timestamp
              this.ID = ID;
              const task = response.data.task; // 从response.data中获取task
              this.task = task;
              console.log('Saved ID:', this.ID);
              console.log('Saved task:', this.task);
              const intervalId = setInterval(() => {
                axios.post(` http://54.92.84.160/layout/background/result`, { ID: this.ID, task: this.task }, {
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                  .then((response) => {
                    // 处理响应
                    const data = response.data;
                    switch (data.status) {
                      case 200:
                        clearInterval(intervalId);
                        console.log(
                          "服务器返回的数据：",
                          JSON.parse(JSON.stringify(data))
                        );
                        if (data && data.parkingSpacesData && data.scale) { // 确保数据存在
                          this.addParkingSpaceSvg(data.parkingSpacesData, parseFloat(data.scale));
                        } else {
                          // 如果数据不存在，可以在这里处理错误或显示一些提示信息
                          console.error("无法获取停车位数据或比例尺");
                        }
                        this.showModal = false;
                        // 然后再跳转到parking-lot标签
                        this.activeName = "parking-lot";
                        break;
                      case 210:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 90;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 220:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 80;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 230:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 70;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 240:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 60;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 250:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 50;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 260:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 40;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 270:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 30;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 280:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 20;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 290:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 10;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          console.log(
                            "服务器返回的数据：",
                            JSON.parse(JSON.stringify(data))
                          );
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 300:
                        attemptCount++;
                        this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                        this.showModal = true;
                        this.progressPercentage = 0;
                        if (++attemptCount >= maxAttempts) {
                          clearInterval(intervalId);
                          console.log(
                            "服务器返回的数据：",
                            JSON.parse(JSON.stringify(data))
                          );
                          this.showModal = false;
                          alert("タイムアウト！\n" + data.message);
                        }
                        break;
                      case 400:
                        clearInterval(intervalId);
                        console.log(
                          "服务器返回的数据：",
                          JSON.parse(JSON.stringify(data))
                        );
                        this.showModal = false;
                        alert("作成に失敗しました！\n" + data.message);
                        break;
                      default:
                        clearInterval(intervalId);
                        this.showModal = false;
                        alert("状態コード不明：" + data.status);
                    }
                  })
                  .catch((error) => {
                    clearInterval(intervalId);
                    this.showModal = false;
                    console.error("Error:", error);
                  });
              }, 1000); // 每秒执行一次
            }
          })
          .catch(error => {
            console.error('上传失败:', error);
          });
      };
      if (fromGoToSimulation) {
        // 如果是从goToSimulation跳转，并且没有canvasImageDataURL，使用layoutData
        const layoutDataUrl = this.$store.state.canvas.layoutData;
        fetch(layoutDataUrl)
          .then(res => res.blob())
          .then(blob => {
            const pngBlob = new Blob([blob], { type: 'image/png' });
            prepareAndUpload(pngBlob, new File([pngBlob], "image.png"));
          }).catch(error => console.error('转换layoutData为Blob时出现错误:', error));
      } else if (canvasImageDataURL) {
        // 否则，使用canvasImageDataURL进行上传
        this.dataURLtoBlob(canvasImageDataURL).then(blob => {
          // 这里不需要传递originalFile
          prepareAndUpload(blob);
        }).catch(error => console.error('转换canvasImageDataURL为Blob时出现错误:', error));
      }
    },
    // 辅助函数：将DataURL转换为Blob对象
    dataURLtoBlob(dataurl) {
      return fetch(dataurl)
        .then(res => res.blob());
    },
    // 監聽鍵盤
    constructor() {
      // 初始化Ctrl键状态为未按下
      this.isCtrlPressed = false;
      // 监听键盘按下事件
      document.addEventListener('keydown', (event) => {
        // 检查是否按下了Ctrl键
        this.isCtrlPressed = event.ctrlKey;
      });
      // 监听键盘松开事件
      document.addEventListener('keyup', (event) => {
        // 更新Ctrl键的状态
        this.isCtrlPressed = event.ctrlKey;
      });
    },
    // 劃綫邏輯
    setLineColor(color) {
      this.currentLineColor = color;
      this.isDrawingLine = (color !== 'green'); // 如果不是绿色，进入普通绘线模式
      this.isDrawingGreenLine = (color === 'green'); // 如果是绿色，进入绘制矩形模式
      this.isDrawingDoubleArrow = false; // 确保不在画双箭头模式
      this.canvas.defaultCursor = 'crosshair'; // 改变鼠标样式
      this.disableCanvasObjectsSelection(); // 禁用其他对象的选择
      this.lastLineEndPoint = null; // 清空最后一条线的终点坐标
      this.points = []; // 清空点数组，确保开始新的绘制时没有之前的点
    },
    // 畫尺寸綫邏輯
    drawDoubleArrow() {
      this.isDrawingDoubleArrow = true;
      this.isDrawingLine = false;
      this.isDrawingGreenLine = false;  // 确保不在画普通线条模式
      this.points = []; // 重置点坐标，以便正确记录双箭头的两个端点
      this.canvas.defaultCursor = 'crosshair'; // 改变鼠标样式
      this.disableCanvasObjectsSelection();    // 禁用其他对象的选择
    },
    // 吸附邏輯
    findClosestPoint(point) {
      // 如果Ctrl键被按下，跳过吸附逻辑
      if (this.isCtrlPressed) {
        return null;
      }
      const SNAP_THRESHOLD_POINT = 20; // 端点的吸附阈值
      const SNAP_THRESHOLD_LINE = 10; // 线条的吸附阈值
      let closest = null;
      let minDistToPoint = SNAP_THRESHOLD_POINT;
      let minDistToLine = SNAP_THRESHOLD_LINE;
      this.canvas.getObjects().forEach((obj) => {
        if (obj.type === 'line') {
          // 检查点到线条的距离
          const distance = this.distanceToLine(point, obj);
          if (distance < minDistToLine) {
            const closestPointOnLine = this.closestPointOnLine(point, obj);
            if (closestPointOnLine) {
              closest = closestPointOnLine;
              minDistToLine = distance;
            }
          }
          // 同时检查是否更接近端点
          const points = [
            { x: obj.x1, y: obj.y1 },
            { x: obj.x2, y: obj.y2 },
          ];
          points.forEach((p) => {
            const d = this.distanceBetween(point, p);
            if (d < minDistToPoint) {
              closest = p;
              minDistToPoint = d;
            }
          });
        }
      });
      // 绘制吸附圆形指示器
      if (closest) {
        if (!this.snapCircle) {
          this.snapCircle = new fabric.Circle({
            left: closest.x - 5, // 圆心坐标减去半径
            top: closest.y - 5, // 圆心坐标减去半径
            radius: 5,
            stroke: 'blue',
            fill: 'transparent',
            selectable: false,
            evented: false,
          });
          this.canvas.add(this.snapCircle);
        } else {
          // 更新圆的位置
          this.snapCircle.set({ left: closest.x - 5, top: closest.y - 5 });
          this.snapCircle.setCoords();
        }
        this.canvas.renderAll();
      } else if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
        this.canvas.renderAll();
      }
      return closest;
    },
    distanceToLine(point, line) {
      const A = point.x - line.x1;
      const B = point.y - line.y1;
      const C = line.x2 - line.x1;
      const D = line.y2 - line.y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) {
        param = dot / len_sq;
      }
      let xx, yy;
      if (param < 0) {
        xx = line.x1;
        yy = line.y1;
      } else if (param > 1) {
        xx = line.x2;
        yy = line.y2;
      } else {
        xx = line.x1 + param * C;
        yy = line.y1 + param * D;
      }
      const dx = point.x - xx;
      const dy = point.y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    },
    closestPointOnLine(point, line) {
      const A = point.x - line.x1;
      const B = point.y - line.y1;
      const C = line.x2 - line.x1;
      const D = line.y2 - line.y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) {
        param = dot / len_sq;
      }
      let xx, yy;
      if (param < 0) {
        xx = line.x1;
        yy = line.y1;
      } else if (param > 1) {
        xx = line.x2;
        yy = line.y2;
      } else {
        xx = line.x1 + param * C;
        yy = line.y1 + param * D;
      }
      return { x: xx, y: yy };
    },
    initMouseEvents() {
      this.canvas.on('mouse:move', (options) => {
        if (this.isDrawingLine || this.isDrawingDoubleArrow || this.isDrawingGreenLine) {
          const { x, y } = options.absolutePointer;
          const snapPoint = this.isCtrlPressed ? null : this.findClosestPoint({ x, y });
          if (snapPoint) {
            if (!this.snapCircle) {
              this.snapCircle = new fabric.Circle({
                left: snapPoint.x - 5,
                top: snapPoint.y - 5,
                radius: 5,
                stroke: 'blue',
                fill: 'transparent',
                selectable: false,
                evented: false,
              });
              this.canvas.add(this.snapCircle);
            } else {
              this.snapCircle.set({ left: snapPoint.x - 5, top: snapPoint.y - 5 });
              this.snapCircle.setCoords();
            }
          } else if (this.snapCircle) {
            this.canvas.remove(this.snapCircle);
            this.snapCircle = null;
          }
          this.canvas.renderAll();
        }
      });
    },
    distanceBetween(point1, point2) {
      return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
      );
    },
    onCanvasClick(options) {
      if (!this.isDrawingLine && !this.isDrawingDoubleArrow && !this.isDrawingGreenLine) return;
      const { x, y } = options.absolutePointer;
      const snapPoint = this.isCtrlPressed ? null : this.findClosestPoint({ x, y });
      this.points.push(snapPoint || { x, y });
      // 检查是否绘制普通直线
      if (this.isDrawingLine && this.points.length >= 2) {
        const point1 = this.points[this.points.length - 2];
        const point2 = this.points[this.points.length - 1];
        const line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], {
          fill: this.currentLineColor,
          stroke: this.currentLineColor,
          strokeWidth: 2,
          selectable: true,
          isBorder: true,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true
        });
        this.canvas.add(line).setActiveObject(line);
      }
      // 检查是否绘制双箭头
      if (this.isDrawingDoubleArrow && this.points.length >= 2) {
        const point1 = this.points[this.points.length - 2];
        const point2 = this.points[this.points.length - 1];
        const group = this.drawArrow(point1, point2);
        group.set({
          selectable: true,
          isDimension: true,
          points: [point1, point2],
          arrowLength: parseInt(this.arrowText, 10) || 0,
          arrowText: this.arrowText,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true
        });
        this.canvas.add(group).setActiveObject(group);
        // 绘制完成后清空点坐标，并检查是否要继续绘制
        this.points = [];
        this.isDrawingDoubleArrow = false;
        // 移除所有吸附圆圈
        if (this.snapCircle) {
          this.canvas.remove(this.snapCircle);
          this.snapCircle = null;
        }
      }
      if (this.isDrawingGreenLine && this.points.length === 3) {
        const [point1, point2, point3] = this.points;
        // 计算底边方向向量
        const baseVector = { x: point2.x - point1.x, y: point2.y - point1.y };
        // 计算垂直于底边的方向向量
        const perpendicularVector = { x: -baseVector.y, y: baseVector.x };
        // 标准化垂直向量
        const length = Math.sqrt(perpendicularVector.x ** 2 + perpendicularVector.y ** 2);
        const unitPerpendicular = { x: perpendicularVector.x / length, y: perpendicularVector.y / length };
        // 计算第三点相对于底边的“高度”
        const height = (point3.x - point1.x) * unitPerpendicular.x + (point3.y - point1.y) * unitPerpendicular.y;
        // 计算矩形的另外两个顶点
        const point4 = { x: point1.x + unitPerpendicular.x * height, y: point1.y + unitPerpendicular.y * height };
        const point5 = { x: point2.x + unitPerpendicular.x * height, y: point2.y + unitPerpendicular.y * height };
        // 使用 Fabric.js 绘制矩形
        const rect = new fabric.Polygon([point1, point2, point5, point4], {
          fill: 'transparent',
          stroke: this.currentLineColor,
          strokeWidth: 2,
          selectable: true,
          isGateway: true,
          userData: {
            bottomEdgePoints: [point1, point2],
            height: height // 存储计算得到的高度
          }
        });
        this.canvas.add(rect).setActiveObject(rect);
        this.points = [];
        this.isDrawingGreenLine = false;
        if (this.snapCircle) {
          this.canvas.remove(this.snapCircle);
          this.snapCircle = null;
        }
      }
      // 重置鼠标样式和启用对象选择
      if (!this.isDrawingLine && !this.isDrawingDoubleArrow && !this.isDrawingGreenLine) {
        this.canvas.defaultCursor = 'default';
        this.enableCanvasObjectsSelection();
      }
    },
    exitDrawingMode() {
      this.isDrawingLine = false;
      this.isDrawingDoubleArrow = false;
      this.isDrawingGreenLine = false;
      this.points = [];
      if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.parkingLotCanvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      // 重置鼠标样式和启用对象选择
      this.canvas.defaultCursor = 'default';
      this.parkingLotCanvas.defaultCursor = 'default';
      this.enableCanvasObjectsSelection();
      this.canvas.discardActiveObject().requestRenderAll();
      this.parkingLotCanvas.discardActiveObject().requestRenderAll();
    },
    drawArrow(point1, point2) {
      const angle =
        Math.atan2(point2.y - point1.y, point2.x - point1.x) * (180 / Math.PI);
      const arrowColor = "black"; // 将箭头颜色设置为黑色
      const arrowSize = 15; // 缩小箭头大小
      // 创建线段
      const line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], {
        fill: arrowColor,
        stroke: arrowColor,
        strokeWidth: 2,
      });
      // 创建箭头
      const arrowOptions = {
        fill: arrowColor,
        selectable: true,
        originX: "center",
        originY: "center",
        width: arrowSize,
        height: arrowSize,
      };
      // 第一个箭头（线段起始点）
      const arrow1 = new fabric.Triangle({
        ...arrowOptions,
        left: point1.x,
        top: point1.y,
        angle: angle - 90,
      });
      // 第二个箭头（线段终点）
      const arrow2 = new fabric.Triangle({
        ...arrowOptions,
        left: point2.x,
        top: point2.y,
        angle: angle + 90,
      });
      // 计算中点
      const midPoint = {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2
      };
      // 计算文本旋转的角度
      let textAngle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
      let textOffset = 10; // 文本与线条的垂直偏移量
      // 如果线段是从右向左绘制的，调整文本角度
      if (point1.x > point2.x) {
        textAngle += 180;
        textOffset = -10;
      }
      // 根据线条角度动态调整文本位置
      let textX = midPoint.x;
      let textY = midPoint.y;
      if (textAngle === 0 || Math.abs(textAngle) === 180) {
        textY += textOffset;
      } else if (textAngle === 90 || textAngle === -90) {
        textX += textOffset;
      } else {
        const dx = (point2.x - point1.x) / 2;
        const dy = (point2.y - point1.y) / 2;
        textX += dy / Math.abs(dy) * textOffset;
        textY -= dx / Math.abs(dx) * textOffset;
      }
      // 创建文本
      const text = new fabric.Text(this.arrowText, {
        left: textX,
        top: textY,
        fontSize: 20,
        originX: 'center',
        originY: 'center',
        fill: arrowColor,
        angle: textAngle
      });
      // 创建一个组合
      const group = new fabric.Group([line, arrow1, arrow2, text], {
        selectable: true,
      });
      group.isDimension = true; // 标记为尺寸线（双箭头）
      group.dimensionLine = line; // 在组合对象上存储线的引用
      return group; // 返回创建的组合对象
    },
    drawPoint(point, color) {
      const radius = 3; // 点的大小
      const circle = new fabric.Circle({
        radius: radius,
        fill: color,
        left: point.x - radius,
        top: point.y - radius,
      });
      return circle; // 返回创建的点对象
    },
    // 新增函数：检查是否为闭合图形
    isClosedShape(lines) {
      if (lines.length < 3) return false; // 至少需要3条线才能形成闭合图形
      // 创建一个映射表来存储每个点连接的线段数
      let pointsMap = {};
      // 为每个点计算连接的线段数
      lines.forEach((line) => {
        // 起点
        let startPointKey = `x${line.x1}y${line.y1}`;
        if (!pointsMap[startPointKey]) {
          pointsMap[startPointKey] = 0;
        }
        pointsMap[startPointKey] += 1;
        // 终点
        let endPointKey = `x${line.x2}y${line.y2}`;
        if (!pointsMap[endPointKey]) {
          pointsMap[endPointKey] = 0;
        }
        pointsMap[endPointKey] += 1;
      });
      // 检查每个点连接的线段数是否至少为2
      for (let point in pointsMap) {
        if (pointsMap[point] < 2) {
          return false;
        }
      }
      return true;
    },
    // 辅助函数：计算两条线段之间的夹角
    calculateAngleBetweenLines(line1, line2) {
      const vector1 = {
        x: line1.x2 - line1.x1,
        y: line1.y2 - line1.y1,
      };
      const vector2 = {
        x: line2.x2 - line2.x1,
        y: line2.y2 - line2.y1,
      };
      const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
      const magnitude1 = Math.sqrt(
        vector1.x * vector1.x + vector1.y * vector1.y
      );
      const magnitude2 = Math.sqrt(
        vector2.x * vector2.x + vector2.y * vector2.y
      );
      const cosTheta = dotProduct / (magnitude1 * magnitude2);
      const angle = Math.acos(cosTheta) * (180 / Math.PI);
      return angle;
    },
    // 禁用画布对象选择的方法
    disableCanvasObjectsSelection() {
      this.canvas.forEachObject((object) => {
        object.selectable = false;
      });
      this.canvas.discardActiveObject().renderAll();
    },
    // 启用画布对象选择的方法
    enableCanvasObjectsSelection() {
      this.canvas.forEachObject((object) => {
        object.selectable = true;
      });
    },
    // 防抖
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    },
    // 結束跳轉邏輯
    sendDataToBackend(originalFile) {
      this.exitDrawingMode();
      // 检查蓝色线条（车道边线）
      const blueLines = this.canvas
        .getObjects("line")
        .filter((line) => line.stroke === "blue");
      if (blueLines.length < 1) {
        alert("敷地を設定してください");
        return;
      }
      // // 检查双箭头（尺寸线）
      // const doubleArrows = this.canvas
      //   .getObjects("group")
      //   .filter((group) => group.isDimension);
      // if (doubleArrows.length < 2) {
      //   alert("寸法が2つ以上が必要です");
      //   return;
      // }
      // const angleThreshold = 20; // 夹角阈值
      // let angleGreaterThanThresholdFound = false;
      // for (let i = 0; i < doubleArrows.length; i++) {
      //   for (let j = i + 1; j < doubleArrows.length; j++) {
      //     const angle = this.calculateAngleBetweenLines(
      //       doubleArrows[i].dimensionLine,
      //       doubleArrows[j].dimensionLine
      //     );
      //     if (angle > angleThreshold) {
      //       angleGreaterThanThresholdFound = true;
      //       break; // 跳出内层循环
      //     }
      //   }
      //   if (angleGreaterThanThresholdFound) {
      //     break; // 如果找到一个合适的角度，跳出外层循环
      //   }
      // }
      // // 如果没有找到任何夹角大于阈值的线对，则弹出警告
      // if (!angleGreaterThanThresholdFound) {
      //   alert(
      //     `少なくとも1組の寸法線の間の角度が${angleThreshold}度以上である必要があります`
      //   );
      //   return;
      // }
      // 获取所有边界线（蓝色和红色）
      const borderLines = this.canvas
        .getObjects("line")
        .filter((line) => line.isBorder);
      // 检查闭合图形
      if (!this.isClosedShape(borderLines)) {
        alert("閉じたポリラインが必要です");
        return;
      }
      // 辅助函数：对点坐标进行四舍五入
      function roundPoint(point) {
        return {
          x: Math.round(point.x),
          y: Math.round(point.y),
        };
      }
      // 处理边界线，包括道路和建筑
      const borders = this.canvas
        .getObjects("line")
        .filter((line) => line.isBorder)
        .map((line) => {
          const roundedPoint1 = roundPoint({ x: line.x1, y: line.y1 });
          const roundedPoint2 = roundPoint({ x: line.x2, y: line.y2 });
          const position = [
            roundedPoint1.x,
            roundedPoint1.y,
            roundedPoint2.x,
            roundedPoint2.y,
          ];
          return { position: position };
        });
      // 处理尺寸线（双箭头）
      const dimensions = this.canvas
        .getObjects("group")
        .filter((group) => group.isDimension)
        .map((group) => {
          const points = group.points; // 获取两个端点的坐标
          const roundedPoint1 = roundPoint(points[0]);
          const roundedPoint2 = roundPoint(points[1]);
          const position = [
            roundedPoint1.x,
            roundedPoint1.y,
            roundedPoint2.x,
            roundedPoint2.y,
          ];
          const length = group.arrowLength;
          return {
            position: position,
            length: length,
          };
        });
      const dataToSend = {
        border: borders,
        dimension: dimensions,
      };
      console.log("drawing", JSON.stringify(dataToSend, null, 2));
      // 裁剪畫布
      let dimensionGroups = this.canvas.getObjects().filter(obj => obj.isDimension);
      // 临时保存尺寸线对象，以便之后恢复
      let removedDimensions = [];
      // 临时移除尺寸线
      dimensionGroups.forEach(dimensionGroup => {
        removedDimensions.push(dimensionGroup); // 保存被移除的对象
        this.canvas.remove(dimensionGroup);
      });
      // 计算边界
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      this.canvas.forEachObject((obj) => {
        const objBoundingBox = obj.getBoundingRect(true, true); // 考虑旋转和缩放
        minX = Math.min(minX, objBoundingBox.left);
        minY = Math.min(minY, objBoundingBox.top);
        maxX = Math.max(maxX, objBoundingBox.left + objBoundingBox.width);
        maxY = Math.max(maxY, objBoundingBox.top + objBoundingBox.height);
      });
      // 确定裁剪区域，保持4:3比例
      let width = maxX - minX;
      let height = maxY + 20 - minY;
      const aspectRatio = 4 / 3;
      // 调整长宽比
      if (width / height > aspectRatio) {
        // 宽度太宽，增加高度
        const newHeight = width / aspectRatio;
        minY -= (newHeight - height) / 2;
        height = newHeight;
      } else {
        // 高度太高，增加宽度
        const newWidth = height * aspectRatio;
        minX -= (newWidth - width) / 2;
        width = newWidth;
      }
      // 裁剪画布
      dimensions.forEach(dimension => this.canvas.remove(dimension));
      // 裁剪画布并获取DataURL
      const croppedCanvas = this.canvas.toDataURL({
        format: 'png',
        left: minX - 20,
        top: minY - 20,
        width: width + 20,
        height: height + 20,
      });
      // 清空this.parkingLotCanvas画布
      this.parkingLotCanvas.clear();
      // 将裁剪后的画布添加到 this.parkingLotCanvas，并缩放以填充800x600大小
      fabric.Image.fromURL(croppedCanvas, (img) => {
        // 计算需要应用的缩放比例
        const canvasWidth = this.parkingLotCanvas.width;
        const canvasHeight = this.parkingLotCanvas.height;
        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const scaleToFit = Math.min(scaleX, scaleY); // 选择较小的缩放比例以保持图片比例
        // 设置画布背景图像并在设置完成后获取DataURL
        this.parkingLotCanvas.setBackgroundImage(img, () => {
          this.parkingLotCanvas.renderAll(); // 确保背景图像渲染完成
          // 背景图像设置并渲染完成后，获取DataURL
          const canvasImageDataURL = this.parkingLotCanvas.toDataURL('image/png');
          // 这里可以继续使用canvasImageDataURL进行后续操作，例如上传
          this.upLoadCanvasAndFile(canvasImageDataURL, this.originalFile, dataToSend);
        }, {
          scaleX: scaleToFit,
          scaleY: scaleToFit,
          originX: 'left',
          originY: 'top',
          top: 0,
          left: 0
        });
      });
      removedDimensions.forEach(dimensionGroup => {
        this.canvas.add(dimensionGroup);
      });
      // 确保恢复后重新渲染画布以显示尺寸线
      this.canvas.renderAll();
    },
    addParkingSpaceSvg(parkingSpacesData, scale) {
      this.parkingLotCanvas.getObjects().forEach((obj) => {
        if (!obj.isBackground) {
          this.parkingLotCanvas.remove(obj);
        }
      });
      parkingSpacesData.forEach((data) => {
        const { angle, center } = data;
        fabric.Image.fromURL(parkingSpaceSvg, (img) => {
          const scalingFactor = scale / 40;
          this.scalingFactor = scale / 40;
          this.Scale = scale
          const imgWidth = img.width * scalingFactor;
          const imgHeight = img.height * scalingFactor;
          // 这里调整了坐标计算方式，以确保旋转前后图像中心位置不变
          const X = center[0] * scale;
          const Y = center[1] * scale;
          console.log(`图片坐标: X=${X}, Y=${Y}, 角度=${angle}`);
          img.set({
            // 由于originX和originY设置为'center'，left和top应直接设置为图像中心的位置
            left: X,
            top: Y,
            angle: angle,
            scaleX: scalingFactor,
            scaleY: scalingFactor,
            originX: 'center',
            originY: 'center',
          });
          // 添加缩放监听器以实现等比例缩放
          img.on('scaling', function () {
            let scaleX = img.scaleX;
            let scaleY = img.scaleY;
            // 获取最小的缩放值
            let minScale = Math.min(scaleX, scaleY);
            // 设置等比例缩放
            img.set({
              scaleX: minScale,
              scaleY: minScale
            });
          });
          this.parkingLotCanvas.add(img);
        });
      });
      this.parkingLotCanvas.renderAll();
    },
    triggerFileUpload() {
      this.$refs.fileInput.click(); // 触发原生文件上传控件
    },
  }
}