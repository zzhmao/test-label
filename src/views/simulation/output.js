import park4d from "@/assets/park4d2.png";
import { jsPDF } from "jspdf";
import axios from 'axios';
export default {
  methods: {
    async copyUrl() {
      try {
        await navigator.clipboard.writeText(this.webpageUrl);
        this.$message.success('URL已复制到剪贴板');
      } catch (err) {
        this.$message.error('复制失败');
      }
    },
    backToCamera() {
      axios.post(`http://54.92.84.160/layout/backtocamera`, {
        ID: this.ID,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(response => {
          console.log(response.data); // 打印响应数据到控制台
          this.renewSector(response.data.cameraData);
          this.activeName = "camera";
        })
        .catch(error => {
          console.error('There was an error!', error); // 打印错误信息到控制台
        });
    },
    renewSector(cameraData) {
      // 清除画布，但保留背景
      this.cameraCanvas.getObjects().forEach((obj) => {
        if (obj.type !== 'image') { // 假设背景是唯一的图像类型对象
          this.cameraCanvas.remove(obj);
        }
      });
      cameraData.forEach((data,index) => {
        const { focal, levelangle, height, verticalangle, center } = data;
        // 扇形的开始和结束角度，考虑到levelangle的影响
        const defaultSelectedAngle = focal.toString();
        let defaultCameraRadius;
        let fillColor;
        // 根据defaultSelectedAngle的值动态调整defaultCameraRadius
        if (defaultSelectedAngle >= 79 && defaultSelectedAngle <= 88) {
          defaultCameraRadius = 3;
          fillColor = 'rgba(64, 158, 255, 0.5)'; // 对应4mm，#409EFF
        } else if (defaultSelectedAngle >= 50.8 && defaultSelectedAngle <= 54.1) {
          defaultCameraRadius = 4;
          fillColor = 'rgba(103, 194, 58, 0.5)'; // 对应6mm，#67C23A
        } else if (defaultSelectedAngle >= 35.7 && defaultSelectedAngle <= 39.7) {
          defaultCameraRadius = 5;
          fillColor = 'rgba(230, 162, 60, 0.5)'; // 对应8mm，#E6A23C
        } else if (defaultSelectedAngle >= 23 && defaultSelectedAngle <= 25) {
          defaultCameraRadius = 6;
          fillColor = 'rgba(245, 108, 108, 0.5)'; // 对应12mm，#F56C6C
        } else {
          // 默认值或其他情况
          defaultCameraRadius = 3; // 可以根据需要调整此默认值
          fillColor = 'rgba(64, 158, 255, 0.5)'; // 默认为#409EFF
        }
        const defaultCameraHeight = height;
        const defaultCameraAngle =  Math.abs(verticalangle - 90);
        const startAngle = - 90 - focal / 2;
        const endAngle = - 90 + focal / 2;
        const radius = defaultCameraRadius * this.Scale;
        // 调整中心点X坐标
        const levelangleRad = levelangle * (Math.PI / 180);
        const adjustedCenterX = center[0] * this.Scale + radius / 2 * Math.sin(levelangleRad)
        const adjustedCenterY = center[1] * this.Scale - radius / 2 * Math.cos(levelangleRad)
        // 创建扇形路径
        const path = this.createSectorPath(adjustedCenterX, adjustedCenterY, radius, startAngle, endAngle);
        const sector = new fabric.Path(path, {
          left: adjustedCenterX,
          top: adjustedCenterY,
          originX: 'center', // 设置旋转中心为对象的中心点（水平方向）
          originY: 'center', // 设置旋转中心为对象的中心点（垂直方向）
          fill: fillColor, // 使用动态决定的颜色
          angle: levelangle, // 这里的旋转将围绕对象的几何中心进行
          lockScalingX: true,  // 锁定水平方向的缩放
          lockScalingY: true,  // 锁定垂直方向的缩放,  // 锁定垂直方向的缩放
          // 存储摄像头数据
          cameraData: {
            selectedAngle: defaultSelectedAngle,
            cameraHeight: defaultCameraHeight,
            cameraAngle: defaultCameraAngle,
            radius: defaultCameraRadius,
          }
        });
        this.cameraCanvas.add(sector);
        this.drawPreviewRectangles();
        // 添加编号文本
        const text = new fabric.Text((index + 1).toString(), {
          left: adjustedCenterX,
          top: adjustedCenterY,
          fontSize: 14,
          originX: 'center',
          originY: 'center',
          fill: '#fff',
          selectable: false, // 确保文本不可选
          evented: false, // 确保文本不会触发任何事件
        });
        // 将文本对象关联到扇形对象
        sector.associatedText = text;
        // 添加编号文本到画布
        this.cameraCanvas.add(text);
      });
      this.cameraCanvas.renderAll();
    },
    async openPdfEditor() {
      try {
        // 发送POST请求并等待响应
        const response = await axios.post(`http://54.92.84.160/layout/parkingspace`, {
          ID: this.ID,
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        // 检查服务器响应的状态码，如果是200，则表示成功
        if (response.status === 200) {
          // 显示PDF编辑器弹窗
          this.pdfEditorVisible = true;
          const baseUrl = "https://simulation-csv.s3.ap-northeast-1.amazonaws.com/";
          // 检查是否存在文件，并构建完整的图片URL
          const imageUrls = response.data.files ? response.data.files.map(file => baseUrl + file) : [];
          // 计算需要多少个 canvas，如果没有图片，则数量为 0
          const numberOfCanvases = imageUrls.length > 0 ? Math.ceil(imageUrls.length / 2) : 0;
          console.log(`需要的 canvas 数量: ${numberOfCanvases}`);
          // 获取所有扇形对象
          const cameraData = this.cameraCanvas.getObjects().filter(obj => obj instanceof fabric.Path).map(obj => {
            // 扇形对象的中心点计算可能需要根据具体的绘制逻辑调整
            const centerX = obj.left + (obj.width * obj.scaleX) / 2;
            const centerY = obj.top;
            // 定义一个映射从selectedAngle到focal的值
            const angleToFocalMap = {
              '79': 4,
              '50.8': 6,
              '37.7': 8,
              '24': 12
            };
            // 使用映射来转换selectedAngle到focal的值
            const focal = angleToFocalMap[obj.cameraData.selectedAngle.toString()] || 0; // 使用toString()确保键的匹配，如果没有匹配则默认为0
            // 确保height和verticalangle是数字
            const height = Number(obj.cameraData.cameraHeight);
            const verticalangle = Number(obj.cameraData.cameraAngle) - 90; // 减去90度
            return {
              focal: focal,// 从cameraData获取selectedAngle
              height: isNaN(height) ? 0 : height, // 确保是数字，否则默认为0
              verticalangle: Math.abs(isNaN(verticalangle) ? 0 : verticalangle), // 确保是数字，否则默认为0
              levelangle: obj.angle, // 直接从对象获取水平角度
              center: [centerX, centerY],
              type: "std" // 假设所有扇形都是标准类型
            };
          });
          this.$nextTick(() => {
            if (dynamicCanvasContainer) {
              dynamicCanvasContainer.innerHTML = '';
              if (numberOfCanvases > 0) {
                for (let i = 0; i < numberOfCanvases; i++) {
                  const canvasElement = document.createElement('canvas');
                  canvasElement.width = 840;
                  canvasElement.height = 1188;
                  canvasElement.id = `dynamicCanvas${i}`;
                  canvasElement.style.marginBottom = '10px';
                  dynamicCanvasContainer.appendChild(canvasElement);
                  const canvas = new fabric.Canvas(canvasElement.id);
                  let accumulatedHeight = 100; // 从顶部100px开始，为每张图片预留空间
                  fabric.Image.fromURL(park4d, (oImg) => {
                    // oImg.filters.push(new fabric.Image.filters.Grayscale());
                    // oImg.applyFilters();
                    let scaleFactor = 30 * 2 / oImg.height; // 根据标题大小调整缩放因子
                    oImg.scale(scaleFactor).set({
                      // 放置在画布的右上角，调整位置以匹配标题的高度
                      left: this.pdfCanvas.width - oImg.getScaledWidth() - 10,
                      top: 20,
                      selectable: false,
                      evented: false
                    });
                    canvas.add(oImg);
                  });
                  for (let j = 0; j < 2; j++) {
                    const imageUrlIndex = i * 2 + j;
                    if (imageUrlIndex < imageUrls.length) {
                      fabric.Image.fromURL(imageUrls[imageUrlIndex], (img) => {
                        if (document.getElementById(`dynamicCanvas${i}`)) {
                          const scale = Math.min(canvasElement.width / img.width, (canvasElement.height / 2 - 100) / img.height);
                          img.scale(scale).set({
                            left: (canvasElement.width - img.getScaledWidth()) / 2,
                            top: accumulatedHeight,
                            selectable: false,
                            evented: false
                          });
                          canvas.add(img);
                          // 在图片左上方添加文本
                          const text = new fabric.Text(`カメラ${imageUrlIndex + 1}`, {
                            left: img.left + 20,
                            top: accumulatedHeight - 40, // 将文本上移20px，使其位于图片上方
                            fontSize: 30,
                            fill: 'black',
                            selectable: false,
                            evented: false
                          });
                          canvas.add(text);
                          accumulatedHeight += img.getScaledHeight() + 100; // 更新累积高度，为下一张图片留出空间
                        }
                      }, { crossOrigin: 'anonymous' });
                    }
                  }
                }
              }
              // 检查pdfCanvas是否已经初始化
              if (!this.pdfCanvas) {
                this.pdfCanvas = new fabric.Canvas(this.$refs.pdfCanvas);
              } else {
                this.pdfCanvas.clear(); // 清除现有内容
              }
              // 从cameraCanvas导出内容
              const dataUrl = this.cameraCanvas.toDataURL({ format: 'png', quality: 1.0 });
              fabric.Image.fromURL(dataUrl, (img) => {
                // 计算图像大小和缩放比例以适应新尺寸
                const targetWidth = 840;
                const targetHeight = 594;
                const scaleX = targetWidth / img.width;
                const scaleY = targetHeight / img.height;
                const titleHeight = 20; // 假设标题高度为20px
                const spacing = 40; // 标题和内容之间的间距
                const startY = titleHeight + spacing;
                img.set({
                  scaleX: scaleX,
                  scaleY: scaleY,
                  originX: 'left',
                  originY: 'top',
                  top: startY + 60,
                  left:0,
                  lockRotation: true, // 禁止旋转
                  lockScalingFlip: true,
                });
                // 添加等比例缩放的事件监听器
                img.on('scaling', function () {
                  let minScale = Math.min(img.scaleX, img.scaleY);
                  img.scaleX = minScale;
                  img.scaleY = minScale;
                });
                // 将图像居中放置
                img.center();
                img.setCoords();
                this.pdfCanvas.add(img);
                // 添加指定的文字到图像下方20px处
                const textTop = img.top + img.getScaledHeight() + 20; // 图像下方20px
                const textContent = '※規定の車両寸法に基づいて作成したシミュレーションです。' +
                  '\n 規定寸法外車両の場合、認識に影響を与える可能性があります。';
                const additionalText = new fabric.Text(textContent, {
                  fontSize: 16,
                  fill: 'black',
                  lockRotation: true, // 禁止旋转
                  lockScalingFlip: true,
                });
                // 计算使文本居中的left值
                const canvasCenter = this.parkingLotCanvas.width / 2;
                const textWidth = additionalText.width * additionalText.scaleX;
                const leftPosition = canvasCenter - (textWidth / 2);
                // 设置文本对象的位置
                additionalText.set({
                  left: leftPosition,
                  top: textTop,
                });
                // 确保文本对象等比例缩放
                additionalText.on('scaling', function () {
                  let scaleX = additionalText.scaleX;
                  let scaleY = additionalText.scaleY;
                  // 获取最小的缩放值
                  let minScale = Math.min(scaleX, scaleY);
                  // 设置等比例缩放
                  additionalText.set({
                    scaleX: minScale,
                    scaleY: minScale
                  });
                });
                this.pdfCanvas.add(additionalText);
                // 添加文本标题到画布的左上角
                const text = new fabric.Text(this.certificationOption, {
                  left: 20,
                  top: 20,
                  fontSize: 30,
                  fill: 'black',
                  lockRotation: true, // 禁止旋转
                  lockScalingFlip: true,
                });
                // 确保文本对象等比例缩放
                text.on('scaling', function () {
                  let scaleX = text.scaleX;
                  let scaleY = text.scaleY;
                  // 获取最小的缩放值
                  let minScale = Math.min(scaleX, scaleY);
                  // 设置等比例缩放
                  text.set({
                    scaleX: minScale,
                    scaleY: minScale
                  });
                });
                this.pdfCanvas.add(text);
                // 加载park4d
                fabric.Image.fromURL(park4d, (oImg) => {
                  // oImg.filters.push(new fabric.Image.filters.Grayscale());
                  // oImg.applyFilters();
                  let scaleFactor = text.fontSize * 2 / oImg.height; // 根据标题大小调整缩放因子
                  oImg.scale(scaleFactor).set({
                    // 放置在画布的右上角，调整位置以匹配标题的高度
                    left: this.pdfCanvas.width - oImg.getScaledWidth() - 10,
                    top: 20,
                    selectable: false,
                    evented: false
                  });
                  this.pdfCanvas.add(oImg);
                  let textTop = 1000;
                  const columnWidth = 100; // 单元格宽度
                  const rowHeight = 30; // 单元格高度，增加以适应字体大小为16
                  // 表格标题
                  const titles = ["カメラ #", "焦点距離(mm)", "高さ(mm)", "φ(°)", "θ(°)"];
                  let tableWidth = titles.length * columnWidth;
                  let tableElements = []; // 确保已经定义了tableElements数组
                  // 绘制表头
                  titles.forEach((title, index) => {
                    const titleText = new fabric.Text(title, {
                      left: index * columnWidth,
                      top: 0,
                      fontSize: 16, // 更新字号大小为16
                      fill: 'black',
                      originX: 'left',
                      originY: 'top',
                    });
                    tableElements.push(titleText);
                  });
                  // 更新textTop以开始绘制数据行
                  textTop += rowHeight;
                  // 遍历cameraData数组，为每个相机对象的数据创建行
                  cameraData.forEach((camera, rowIndex) => {
                    const cameraInfo = [
                      `カメラ ${rowIndex + 1}`,
                      `${camera.focal}`,
                      `${camera.height}`,
                      `${Math.abs(camera.verticalangle - 90)}`,
                      `${Math.round(camera.levelangle)}`
                    ];
                    cameraInfo.forEach((info, columnIndex) => {
                      // 绘制单元格背景
                      const cellRect = new fabric.Rect({
                        left: columnIndex * columnWidth,
                        top: textTop - 1000, // 相对于Group顶部的位置
                        fill: 'white',
                        width: columnWidth,
                        height: rowHeight,
                        stroke: 'black',
                        strokeWidth: 1,
                        originX: 'left',
                        originY: 'top',
                      });
                      tableElements.push(cellRect);
                      // 绘制单元格文本
                      const cellText = new fabric.Text(info, {
                        left: columnIndex * columnWidth + 5,
                        top: textTop + 5 - 1000, // 稍微调整文本位置以垂直居中
                        fontSize: 16, // 更新字号大小为16
                        fill: 'black',
                        originX: 'left',
                        originY: 'top',
                      });
                      tableElements.push(cellText);
                    });
                    // 更新textTop以开始绘制下一行
                    textTop += rowHeight;
                  });
                  // 创建Group
                  const tableGroup = new fabric.Group(tableElements, {
                    left: (this.pdfCanvas.width - tableWidth) / 2, // 居中
                    top: 800,
                    lockRotation: true, // 禁止旋转
                    lockScalingFlip: true, // 禁止翻转
                    hasControls: true,
                  });
                  // 添加等比例缩放的事件处理
                  tableGroup.on('scaling', function () {
                    let minScale = Math.min(tableGroup.scaleX, tableGroup.scaleY);
                    tableGroup.scaleX = minScale;
                    tableGroup.scaleY = minScale;
                  });
                  // 添加Group到画布
                  this.pdfCanvas.add(tableGroup);
                  this.pdfCanvas.renderAll();
                });
              });
            } else {
              console.error('dynamicCanvasContainer not found');
            }
          });
        } else {
          // 处理非200响应
          console.error('服务器响应错误', response);
        }
      } catch (error) {
        // 处理请求失败的情况
        console.error('请求失败', error);
      }
    },
    addTextToCanvas() {
      // 确保用户输入了一些文本
      if (this.inputText.trim() === '') {
        this.$message.error('テキストを入力してください'); // 提示用户输入文本
        return;
      }
      // 创建一个新的文本对象并添加到画布上
      const text = new fabric.Text(this.inputText, {
        left: 40, // 指定文本的初始位置，根据需要调整
        top: 800, // 指定文本的初始位置，根据需要调整
        fontSize: 20, // 字体大小
        fill: 'black', // 文本颜色
        lockRotation: true,
      });
      // 确保文本对象等比例缩放
      text.on('scaling', function () {
        let scaleX = text.scaleX;
        let scaleY = text.scaleY;
        // 获取最小的缩放值
        let minScale = Math.min(scaleX, scaleY);
        // 设置等比例缩放
        text.set({
          scaleX: minScale,
          scaleY: minScale
        });
      });
      // 添加文本到画布上
      this.pdfCanvas.add(text);
      // 清空输入框，以便用户可以输入新的文本
      this.inputText = '';
      // 确保画布重新渲染以显示新添加的文本
      this.pdfCanvas.renderAll();
    },
    generatePdf() {
      this.clearSelections();
      // 创建一个 jsPDF 实例
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [this.pdfCanvas.width, this.pdfCanvas.height],
      });
      // 主要的pdfCanvas导出并添加到PDF
      let dataUrl = this.pdfCanvas.toDataURL({
        format: "png",
        multiplier: 2,
        quality: 1,
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
      // 适当调整，确保从动态添加的每个canvas导出图像
      const dynamicCanvases = document.querySelectorAll('canvas[id^="dynamicCanvas"]');
      dynamicCanvases.forEach((canvas, index) => {
        // 为每个canvas创建新的PDF页面（如果不是第一个）
        if (index > 0 || (index === 0 && this.pdfCanvas)) { // 如果已有pdfCanvas，则对第一个动态canvas也添加新页
          pdf.addPage([canvas.width, canvas.height], 'portrait');
        }
        // 直接使用canvas的toDataURL，而不是重新创建fabric实例
        const url = canvas.toDataURL({
          format: "png",
          multiplier: 2,
          quality: 1,
        });
        // 添加到PDF中
        pdf.addImage(url, "PNG", 0, 0, canvas.width, canvas.height);
      });
      // 保存PDF文件
      pdf.save("canvasCollection.pdf");
    },
    clearSelections() {
      // 清除主 canvas 上的选中项
      if (this.$refs.pdfCanvas.fabric) { 
        this.$refs.pdfCanvas.fabric.discardActiveObject().renderAll();
      }
      // 清除所有动态添加的 canvas 上的选中项
      const dynamicCanvases = document.querySelectorAll('canvas[id^="dynamicCanvas"]');
      dynamicCanvases.forEach(canvas => {
        if (canvas.fabric) { 
          canvas.fabric.discardActiveObject().renderAll();
        }
      });
    },
  }
}