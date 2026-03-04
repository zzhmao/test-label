import axios from 'axios';
import parkingSpaceSvg from "@/assets/draw/parkingspace1.svg";
export default {
  methods: {
    initMouseEventsCamera() {
      this.cameraCanvas.on('object:moving', (e) => {
        const movedObject = e.target;
        // 检查移动的对象是否有关联的文本对象
        if (movedObject.associatedText) {
          const { left, top } = movedObject;
          // 更新关联文本的位置，使其与扇形中心对齐
          movedObject.associatedText.set({ left, top });
          this.cameraCanvas.renderAll(); // 重新渲染画布以反映位置变化
        }
      });
      this.cameraCanvas.on('selection:created', (e) => {
        this.selectedObject = e.selected[0];
        this.isSelected = true; // 设置标志，表示有对象被选中
        if (this.selectedObject) { // 确保selectedObject不是null
          // 更新右侧属性栏的值
          this.selectedAngle = this.selectedObject.cameraData?.selectedAngle;
          this.cameraHeight = this.selectedObject.cameraData?.cameraHeight;
          this.cameraAngle = this.selectedObject.cameraData?.cameraAngle;
          this.cameraRadius = this.selectedObject.cameraData?.radius;
        }
        this.drawPreviewRectangles();
      });
      this.cameraCanvas.on('selection:updated', (e) => {
        this.selectedObject = e.selected[0];
        if (this.selectedObject) { // 同样在这里进行检查
          // 可能需要更新属性栏的值，就像在selection:created中那样
          this.selectedAngle = this.selectedObject.cameraData?.selectedAngle;
          this.cameraHeight = this.selectedObject.cameraData?.cameraHeight;
          this.cameraAngle = this.selectedObject.cameraData?.cameraAngle;
          this.cameraRadius = this.selectedObject.cameraData?.radius;
        }
        this.drawPreviewRectangles();
      });
      this.cameraCanvas.on('selection:cleared', (e) => {
        this.selectedObject = null;
        this.isSelected = false; // 清除标志，表示没有对象被选中
        // 这里也许需要清空或重置侧边栏的输入字段
      });
    },
    // 添加攝像頭
    addSector() {
      const defaultSelectedAngle = '79'; // 4mm
      const defaultCameraHeight = 3; // 单位: mm
      const defaultCameraAngle = 45; // 单位: 度
      const defaultCameraRadius = 3; // 单位: mm
      const radius = defaultCameraRadius * this.Scale;
      // 将角度调整为以中线垂直向下
      const startAngle = 50.5 - 180;
      const endAngle = 129.5 - 180;
      const path = this.createSectorPath(100, 100, radius, startAngle, endAngle);
      const sector = new fabric.Path(path, {
        left: 100,
        top: 100,
        fill: 'rgba(64, 158, 255, 0.5)',
        originX: 'center', // 设置旋转中心为对象的中心点（水平方向）
        originY: 'center', // 设置旋转中心为对象的中心点（垂直方向）
        angle: 0,
        lockScalingX: true,  // 锁定水平方向的缩放
        lockScalingY: true,  // 锁定垂直方向的缩放
        // 存储摄像头数据
        cameraData: {
          selectedAngle: defaultSelectedAngle,
          cameraHeight: defaultCameraHeight,
          cameraAngle: defaultCameraAngle,
          radius: defaultCameraRadius,
        }
      });
      this.cameraCanvas.add(sector);
      // 获取当前画布上所有扇形的数量来确定新扇形的编号
      const allSectors = this.cameraCanvas.getObjects().filter(obj => obj.type === 'path');
      const newSectorNumber = allSectors.length;
      // 创建编号文本
      const text = new fabric.Text(newSectorNumber.toString(), {
        left: sector.left,
        top: sector.top,
        fontSize: 14,
        originX: 'center',
        originY: 'center',
        fill: '#fff',
        selectable: false,
        evented: false,
      });
      // 将编号文本关联到新扇形对象
      sector.associatedText = text;
      // 添加扇形和编号文本到画布
      this.cameraCanvas.add(text);
      this.drawPreviewRectangles();
      this.cameraCanvas.renderAll();
    },
    createSectorPath(cx, cy, radius, startAngle, endAngle) {
      startAngle = (startAngle * Math.PI) / 180;
      endAngle = (endAngle * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${(endAngle - startAngle > Math.PI) ? 1 : 0} 1 ${x2} ${y2} z`;
      return path;
    },
    updateSector() {
      if (!this.selectedObject || !(this.selectedObject instanceof fabric.Path)) {
        console.error("No selected object or it's not a fabric.Path instance.");
        return;
      }
      // 确认有选中角度
      if (!this.selectedAngle) {
        console.error("No selected angle provided.");
        return;
      }
      let defaultCameraRadius; // 默认或动态计算的半径
      if (!this.radiusModifiedByUser) { // 如果用户没有手动修改半径
        switch (this.selectedAngle.toString()) {
          case '79':
            defaultCameraRadius = 3;
            break;
          case '50.8':
            defaultCameraRadius = 4;
            break;
          case '37.7':
            defaultCameraRadius = 5;
            break;
          case '24':
            defaultCameraRadius = 6;
            break;
          default:
            defaultCameraRadius = 3; // 可以根据需要调整此默认值
        }
        this.cameraRadius = defaultCameraRadius; // 更新cameraRadius为计算得到的默认值
      }
      // 计算新路径和扇形参数
      const radius = this.cameraRadius * this.Scale; // 使用用户输入的cameraRadius除以50作为半径
      const midAngle = -90;
      const halfAngle = parseFloat(this.selectedAngle) / 2;
      const startAngleDegrees = midAngle - halfAngle;
      const endAngleDegrees = midAngle + halfAngle;
      const newPath = this.createSectorPath(
        this.selectedObject.left,
        this.selectedObject.top,
        radius, // 使用修改后的radius
        startAngleDegrees,
        endAngleDegrees
      );
      // 复制原扇形的编号文本对象引用
      const originalText = this.selectedObject.associatedText;
      // 直接在这里根据selectedAngle设置颜色
      let fillColor;
      switch (this.selectedAngle.toString()) {
        case '79':
          fillColor = 'rgba(64, 158, 255, 0.5)'; // 4mm，对应#409EFF
          break;
        case '50.8':
          fillColor = 'rgba(103, 194, 58, 0.5)'; // 6mm，对应#67C23A
          break;
        case '37.7':
          fillColor = 'rgba(230, 162, 60, 0.5)'; // 8mm，对应#E6A23C
          break;
        case '24':
          fillColor = 'rgba(245, 108, 108, 0.5)'; // 12mm，对应#F56C6C
          break;
        default:
          fillColor = 'rgba(64, 158, 255, 0.5)'; // 默认为#409EFF
      }
      // 创建新的sector对象，包含更新后的cameraData
      const newSector = new fabric.Path(newPath, {
        left: this.selectedObject.left,
        top: this.selectedObject.top,
        originX: 'center', // 设置旋转中心为对象的中心点（水平方向）
        originY: 'center', // 设置旋转中心为对象的中心点（垂直方向）
        fill: fillColor, // 使用选择的颜色
        angle: this.selectedObject.angle,
        scaleX: this.selectedObject.scaleX,
        scaleY: this.selectedObject.scaleY,
        lockScalingX: true,  // 锁定水平方向的缩放
        lockScalingY: true,  // 锁定垂直方向的缩放
        cameraData: {
          selectedAngle: this.selectedAngle,
          cameraHeight: this.cameraHeight,
          cameraAngle: this.cameraAngle,
          radius: this.cameraRadius,
        } // 直接在新对象中设置cameraData
      });
      // 移除旧对象并添加新对象
      this.cameraCanvas.remove(this.selectedObject);
      this.cameraCanvas.add(newSector);
      if (originalText) {
        newSector.associatedText = originalText; // 重新关联编号文本
        // 确保编号文本位置正确
        originalText.set({
          left: newSector.left,
          top: newSector.top,
        });
      }
      this.cameraCanvas.bringToFront(originalText);
      this.cameraCanvas.setActiveObject(newSector); // 设置新对象为选中状态
      // 更新selectedObject为新对象
      this.selectedObject = newSector;
      this.drawPreviewRectangles();
      // 在这里重置radiusModifiedByUser标志
      this.radiusModifiedByUser = false;
      this.cameraCanvas.renderAll();
    },
    // 攝像頭預覽
    drawPreviewRectangles() {
      const canvas = document.getElementById('previewCanvas');
      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const baseX = canvas.width / 4;
        const baseY = canvas.height;
        const height = this.cameraHeight * 1000 / 20;
        const angle = this.cameraAngle;
        const cameraY = baseY - height;
        // 绘制摄像头
        ctx.beginPath();
        ctx.arc(baseX, cameraY, 8, 0, Math.PI * 2);
        ctx.fill();
        // 绘制垂直于地面的左侧视角线
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(baseX, cameraY);
        ctx.lineTo(baseX, baseY);
        ctx.stroke();
        ctx.lineWidth = 1;
        // 绘制左侧视角线的平行线，左侧偏移10px
        const parallelLineX = baseX - 20;
        ctx.beginPath();
        ctx.moveTo(parallelLineX, cameraY);
        ctx.lineTo(parallelLineX, baseY);
        ctx.stroke();
        // 绘制平行线上端的箭头
        ctx.beginPath();
        ctx.moveTo(parallelLineX - 2, cameraY + 10);
        ctx.lineTo(parallelLineX, cameraY);
        ctx.lineTo(parallelLineX + 2, cameraY + 10);
        ctx.fill();
        // 绘制平行线下端的箭头
        ctx.beginPath();
        ctx.moveTo(parallelLineX - 2, baseY - 10);
        ctx.lineTo(parallelLineX, baseY);
        ctx.lineTo(parallelLineX + 2, baseY - 10);
        ctx.fill();
        // 连接左侧视角线和平行线的上端点
        ctx.beginPath();
        ctx.moveTo(baseX, cameraY);
        ctx.lineTo(parallelLineX, cameraY);
        ctx.stroke();
        // 连接左侧视角线和平行线的下端点
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(parallelLineX, baseY);
        ctx.stroke();
        const rectWidth = 30;
        const rectHeight = 10;
        // 计算长方形左上角的x和y坐标
        const rectX = baseX - rectWidth / 2; // 从中心点向左移动宽度的一半
        const rectY = baseY - rectHeight; // 位于canvas底部，向上移动高度的量
        ctx.beginPath();
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        // 设置字体以便能正确测量文本
        ctx.font = "14px Arial";
        // 计算文本的宽度（对于旋转后的高度来说）
        const text = `${this.cameraHeight}m`;
        const textWidth = ctx.measureText(text).width;
        // 计算文本绘制的中心点
        const textX = baseX - 30;
        const textY = cameraY + (baseY - cameraY) / 2;
        // 保存当前画布状态
        ctx.save();
        // 移动画布原点到文本的中心位置
        ctx.translate(textX, textY);
        // 逆时针旋转90度
        ctx.rotate(-Math.PI / 2);
        // 绘制文本，由于原点已经移到文本中心，所以起始点为文本宽度的一半的负值
        // 这里假设文本的高度（在旋转前是宽度）大约为字体大小，即14px，因此向上偏移一半的高度
        ctx.fillText(text, -textWidth / 2, 14 / 2);
        // 恢复画布状态
        ctx.restore();
        if (angle <= 90) {
          const angleRad = angle * Math.PI / 180;
          const lineLength = height * Math.tan(angleRad);
          // 右侧视角线 - 设置为虚线
          ctx.beginPath();
          ctx.setLineDash([10, 5]); // 设置虚线样式
          ctx.moveTo(baseX, cameraY);
          ctx.lineTo(baseX + lineLength, baseY);
          ctx.stroke();
          ctx.setLineDash([]); // 重置为实线，以便后续绘制不受影响
          // 调整半径以适应文本位置
          const arcRadius = 50;
          // 弧线起始和结束角度
          const startAngle = Math.PI / 2; // 垂直向上，起点角度
          const endAngle = startAngle - angleRad; // 根据角度计算终点角度
          // 绘制弧线
          ctx.beginPath();
          ctx.arc(baseX, cameraY, arcRadius, startAngle, endAngle, true);
          ctx.stroke();
          // 计算角平分线方向上的文本位置
          // 由于左侧视角线垂直，角平分线实质上是右侧视角线与垂直线的夹角的一半
          const bisectAngle = (Math.PI / 2 - angleRad / 2);
          // 选择一个适当的距离（这里使用arcRadius来定位文本）
          const textPositionX = baseX + (arcRadius + 20) * Math.cos(bisectAngle);
          const textPositionY = cameraY + (arcRadius + 20) * Math.sin(bisectAngle);
          // 绘制角度文本
          ctx.save(); // 保存当前画布状态
          ctx.translate(textPositionX, textPositionY); // 移动到文本的新位置
          ctx.fillText(`${angle}°`, -ctx.measureText(`${angle}°`).width / 2, 0); // 确保文本居中显示
          ctx.restore(); // 恢复画布状态
        }
        else {
          console.error('角度大于90度,绘制逻辑需要根据实际应用场景调整');
        }
      }
    },
    cameraenableEraser() {
      this.cameraCanvas.isDrawingMode = false;
      this.cameraCanvas.getActiveObjects().forEach((obj) => {
        this.cameraCanvas.remove(obj);
        if (obj.associatedText) {
          this.cameraCanvas.remove(obj.associatedText);
        }
      });
      this.cameraCanvas.discardActiveObject().renderAll();
      this.updateSectorsNumbers();
    },
    updateSectorsNumbers() {
      let index = 1; // 重新编号开始于1
      // 遍历所有扇形对象
      this.cameraCanvas.getObjects().filter(obj => obj.type === 'path').forEach((sector) => {
        if (sector.associatedText) {
          // 更新编号文本
          sector.associatedText.set({ text: String(index) });
          this.cameraCanvas.bringToFront(sector.associatedText); // 确保编号文本在最上层
        }
        index++;
      });
      this.cameraCanvas.renderAll();
    },
    goToOutPut() {
      // 获取所有扇形对象
      const cameraData = this.cameraCanvas.getObjects().filter(obj => obj instanceof fabric.Path).map(obj => {
        const radius = Number(obj.cameraData.radius * this.Scale);
        const levelangleRad = obj.angle * (Math.PI / 180);
        // 扇形对象的中心点计算可能需要根据具体的绘制逻辑调整
        const centerX = (obj.left - radius / 2 * Math.sin(levelangleRad)) / this.Scale;
        const centerY = (obj.top + radius / 2 * Math.cos(levelangleRad)) / this.Scale;
        console.log('obj.left:', obj.left, 'obj.top:', obj.top, 'levelangleRad:', levelangleRad, 'centerX:', centerX, 'centerY:', centerY, 'radius:', radius,);
        // 定义一个映射从selectedAngle到focal的值
        // 使用映射来转换selectedAngle到focal的值
        const focal = Number(obj.cameraData.selectedAngle.toString());
        // 确保height和verticalangle是数字
        const height = Number(obj.cameraData.cameraHeight);
        const verticalangle = Number(obj.cameraData.cameraAngle) - 90; // 减去90度
        return {
          focal: focal,// 从cameraData获取selectedAngle
          height: isNaN(height) ? 0 : height, // 确保是数字，否则默认为0
          verticalangle: Math.abs(isNaN(verticalangle) ? 0 : verticalangle),// 确保是数字，否则默认为0
          levelangle: obj.angle, // 水平角度
          center: [centerX, centerY],
          type: "std" // 假设所有扇形都是标准类型
        };
      });
      const parkingSpacesData = this.parkingLotCanvas.getObjects().filter(obj => obj.type === 'image').map(obj => {
        // 考虑缩放因子后的宽度和高度
        // 计算缩放后的中心点坐标    
        const centerX = obj.left / this.Scale;
        const centerY = obj.top / this.Scale;
        return {
          angle: obj.angle,
          center: [centerX, centerY],
          type: "std"
        };
      });
      // 创建要输出的结构
      const outputData = {
        ID: this.ID,
        "camera": cameraData,
        "area": parkingSpacesData,
      };
      // 使用console.log以指定格式打印数据
      console.log(JSON.stringify(outputData, null, 2));
      // 现在，我们将这些数据发送到后端
      // 使用axios发送POST请求
      axios.post(`http://54.92.84.160/layout/camera`, {
        ID: this.ID,
        parkingSpacesData, // 已有的停车位数据
        cameraData,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(response => {
          console.log('Success:', response.data);
          this.activeName = "output";
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },
    backToParkingLot() {
      // 发送GET请求
      // axios.get('http://54.92.84.160/layout/backtoparkinglot')
      //   .then(response => {
      //     console.log(response.data); // 打印响应数据到控制台
      //     this.renewParkingSpaceSvg(response.data.parkingSpacesData);
      //     this.activeName = "parking-lot";
      //   })
      //   .catch(error => {
      //     console.error('There was an error!', error); // 打印错误信息到控制台
      //   });
      this.activeName = "parking-lot";
    },
    renewParkingSpaceSvg(parkingSpacesData) {
      console.log(parkingSpacesData);
      this.parkingLotCanvas.getObjects().forEach((obj) => {
        if (!obj.isBackground) {
          this.parkingLotCanvas.remove(obj);
        }
      });
      parkingSpacesData.forEach((data) => {
        const { angle, center } = data;
        fabric.Image.fromURL(parkingSpaceSvg, (img) => {
          const imgWidth = img.width * img.scaleX;
          const imgHeight = img.height * img.scaleY;
          const X = center[0] - imgWidth / 2;
          const Y = (center[1] - imgHeight / 2);
          img.set({
            left: X,
            top: Y,
            angle: angle,
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
  }
}