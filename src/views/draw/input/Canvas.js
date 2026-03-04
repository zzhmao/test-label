import { fabric } from "fabric";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export default {
  methods: {
    triggerFileUpload() {
      this.$refs.fileInput.click(); // 触发原生文件上传控件
    },
    async loadImage(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          console.log('文件类型:', file.type);
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
                const canvasScale = 10; // 调整这个值以提高图像清晰度
                const canvasEl = document.createElement('canvas');
                const context = canvasEl.getContext('2d');
                canvasEl.width = viewport.width * canvasScale;
                canvasEl.height = viewport.height * canvasScale;
                context.scale(canvasScale, canvasScale);
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
                const imgUrl = canvasEl.toDataURL('image/png', 1.0);
                this.setBackgroundImage(imgUrl, true);
                canvasEl.remove();
              } catch (error) {
                console.error('处理 PDF 文件时出错:', error);
              }
            };
            fileReader.readAsArrayBuffer(file);
          } else if (file.type.match('image.*')) {
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
              console.log('图片文件加载成功');
              this.setBackgroundImage(e.target.result);
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
    setLineColor(color) {
      this.currentLineColor = color;
      // 如果颜色不是绿色也不是黄色，进入普通绘线模式
      this.isDrawingLine = (color !== 'green' && color !== 'yellow');
      // 如果颜色是绿色，进入绘制绿色线条模式
      this.isDrawingGreenLine = (color === 'green');
      // 如果颜色是黄色，进入绘制黄色线条模式
      this.isDrawingYellowLine = (color === 'yellow');
      this.isDrawingDoubleArrow = false; // 确保不在画双箭头模式
      this.canvas.defaultCursor = 'crosshair'; // 改变鼠标样式
      this.disableCanvasObjectsSelection(); // 禁用其他对象的选择
      this.lastLineEndPoint = null; // 清空最后一条线的终点坐标

      this.points = []; // 清空点数组，确保开始新的绘制时没有之前的点
    },
    drawDoubleArrow() {
      this.isDrawingDoubleArrow = true;
      this.isDrawingLine = false;
      this.isDrawingGreenLine = false;
      this.isDrawingYellowLine = false;
      this.points = []; // 重置点坐标，以便正确记录双箭头的两个端点
      this.canvas.defaultCursor = 'crosshair'; // 改变鼠标样式
      this.disableCanvasObjectsSelection();    // 禁用其他对象的选择
    },
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
        if (this.isDrawingLine || this.isDrawingDoubleArrow || this.isDrawingGreenLine || this.isDrawingYellowLine) {
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
      if (!this.isDrawingLine && !this.isDrawingDoubleArrow && !this.isDrawingGreenLine && !this.isDrawingYellowLine) return;
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
      if (this.isDrawingYellowLine && this.points.length >= 2) {
        const point1 = this.points[this.points.length - 2];
        const point2 = this.points[this.points.length - 1];
        const darkerYellow = '#E6A23C';
        const line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], {
          fill: darkerYellow,
          stroke: darkerYellow,
          strokeWidth: 2,
          selectable: true,
          isProhibit: true,
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
      if (!this.isDrawingLine && !this.isDrawingDoubleArrow && !this.isDrawingGreenLine && !this.isDrawingYellowLine) {
        this.canvas.defaultCursor = 'default';
        this.enableCanvasObjectsSelection();
      }
    },
    exitDrawingMode() {
      this.isDrawingLine = false;
      this.isDrawingDoubleArrow = false;
      this.isDrawingGreenLine = false;
      this.isDrawingYellowLine = false;
      this.points = [];
      if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      // 重置鼠标样式和启用对象选择
      this.canvas.defaultCursor = 'default';
      this.enableCanvasObjectsSelection();
      // 清除当前的选择
      this.canvas.discardActiveObject().requestRenderAll();
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
    checkClosedShapes(lines) {
      const groups = []; // 存储分组的闭合图形
      let currentGroup = []; // 当前处理的闭合图形
      let startPoint = null; // 起始点
      let endPoint = null; // 终点
      lines.forEach(line => {
        if (!startPoint) { // 设置起始点
          startPoint = { x: line.x1, y: line.y1 };
          endPoint = { x: line.x2, y: line.y2 };
          currentGroup.push(line);
        } else if (endPoint.x === line.x1 && endPoint.y === line.y1) { // 检查是否连续
          endPoint = { x: line.x2, y: line.y2 };
          currentGroup.push(line);
          if (endPoint.x === startPoint.x && endPoint.y === startPoint.y) { // 检查是否闭合
            groups.push([...currentGroup]); // 添加到闭合图形组
            currentGroup = []; // 重置当前闭合图形
            startPoint = null; // 重置起始点
          }
        } else { // 如果不连续，重置并开始新的闭合图形
          startPoint = { x: line.x1, y: line.y1 };
          endPoint = { x: line.x2, y: line.y2 };
          currentGroup = [line];
        }
      });
      return groups; // 返回闭合图形组
    },
  }
}