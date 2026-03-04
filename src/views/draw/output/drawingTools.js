// drawingTools.js
import { fabric } from "fabric";

export default {
  methods: {
    disableCanvasObjectsSelection() {
      this.canvas.forEachObject((object) => {
        object.selectable = false;
      });
      this.canvas.discardActiveObject().renderAll();
    },
    enableCanvasObjectsSelection() {
      this.canvas.forEachObject((object) => {
        object.selectable = true;
      });
    },
    startDrawingLine() {
      this.disableCanvasObjectsSelection();
      this.canvas.discardActiveObject().renderAll();
      this.canvas.selection = false;
      this.canvas.defaultCursor = 'crosshair';
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'crosshair';
      });
      this.isDrawingLine = true;
      this.linePoints = [];
      this.canvas.off('mouse:down');
      this.canvas.on('mouse:down', (options) => {
        if (this.isDrawingLine) {
          let endPoint = options.absolutePointer;
          if (!this.isCtrlPressed) { // 当没有按下 Ctrl 时启用吸附
            let snapPoint = this.findClosestPoint(endPoint);
            if (!snapPoint) {
              snapPoint = this.applySnapToAxis(this.linePoints[0] || endPoint, endPoint);
            }
            endPoint = snapPoint || endPoint;
          }
          this.linePoints.push(endPoint);
          if (this.linePoints.length === 2) {
            this.drawLine();
            this.canvas.off('mouse:down');
          }
        }
      });
      this.canvas.on('mouse:move', (options) => {
        let endPoint = options.absolutePointer;
        if (this.isDrawingLine) {
          if (!this.isCtrlPressed) { // 当没有按下 Ctrl 时启用吸附
            let snapPoint = this.findClosestPoint(endPoint);
            if (!snapPoint) {
              snapPoint = this.applySnapToAxis(this.linePoints[0] || endPoint, endPoint);
            }
            endPoint = snapPoint || endPoint;
          } else {
            // 清除临时圆
            if (this.snapCircle) {
              this.canvas.remove(this.snapCircle);
              this.snapCircle = null;
              this.canvas.renderAll();
            }
          }
          // 如果有绘制第一个点，更新预览线
          if (this.linePoints.length === 1) {
            this.updatePreviewLine(endPoint);
          }
        }
      });
      // 初始化标志变量
      this.handleOutsideClick = (event) => {
        if (!this.hasClickedOnce) {
          this.hasClickedOnce = true;
          return;
        }
        // 获取包裹canvas的div的边界
        const container = document.querySelector('.canvas-container');
        const containerBounds = container.getBoundingClientRect();
        // 检查点击是否在该div外
        const clickedOutsideContainer = (
          event.clientX < containerBounds.left ||
          event.clientX > containerBounds.right ||
          event.clientY < containerBounds.top ||
          event.clientY > containerBounds.bottom
        );
        if (clickedOutsideContainer) {
          // 结束绘制线条的逻辑
          this.exitDrawingLineMode();
        }
      };
      document.addEventListener('click', this.handleOutsideClick);
      // 为 document 添加键盘事件监听，检测 ESC 按键
      this.handleKeyDown = (event) => {
        if (event.key === "Escape") {
          // 执行退出绘线模式的逻辑
          this.exitDrawingLineMode();
        }
      };
      document.addEventListener('keydown', this.handleKeyDown);
    },
    drawLine() {
      if (this.linePoints.length !== 2) {
        return;
      }
      if (this.previewLine) {
        this.canvas.remove(this.previewLine);
        this.previewLine = null;
      }
      const [point1, point2] = this.linePoints;
      const line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], {
        stroke: 'black',
        lockScalingX: true,  // 锁定水平缩放
        lockScalingY: true,  // 锁定垂直缩放
        lockRotation: true,  // 锁定旋转
        hasControls: false, // 禁用控制点
      });
      this.canvas.add(line);
      this.canvas.requestRenderAll();
      this.isDrawingLine = false;
      this.linePoints = [];
      // 恢复选择和默认鼠标样式
      this.canvas.selection = true;
      this.canvas.defaultCursor = 'default';
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'move'; // 这里假设默认的 hoverCursor 是 'move'
      });
      this.enableCanvasObjectsSelection();
      if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      this.canvas.renderAll();
      this.updateCanvasState();
      // 重置标志变量并移除监听器
      this.hasClickedOnce = false;
      document.removeEventListener('click', this.handleOutsideClick);
    },
    exitDrawingLineMode() {
      // 检查并删除预览线
      if (this.previewLine) {
        this.canvas.remove(this.previewLine);
        this.previewLine = null;
        this.canvas.renderAll();
      }
      // 其他退出绘线模式的清理逻辑
      this.canvas.remove(this.snapCircle);
      this.snapCircle = null;
      this.isDrawingLine = false;
      this.linePoints = [];
      this.canvas.selection = true;
      this.canvas.defaultCursor = 'default';
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'move'; // 这里假设默认的 hoverCursor 是 'move'
      });
      this.enableCanvasObjectsSelection();
      this.canvas.renderAll();
      this.updateCanvasState();
      // 移除事件监听器
      this.hasClickedOnce = false;
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('keydown', this.handleKeyDown);
    },
    findClosestPoint(point) {
      // 定义原始吸附阈值的常量
      const ORIGINAL_SNAP_THRESHOLD_POINT = 20; // 端点的原始吸附阈值
      const ORIGINAL_SNAP_THRESHOLD_LINE = 10; // 线条的原始吸附阈值
      // 获取当前画布的缩放级别
      const zoom = this.canvas.getZoom();
      // 根据缩放级别调整吸附阈值
      const SNAP_THRESHOLD_POINT = ORIGINAL_SNAP_THRESHOLD_POINT / zoom;
      const SNAP_THRESHOLD_LINE = ORIGINAL_SNAP_THRESHOLD_LINE / zoom;
      let closest = null;
      let minDistToPoint = SNAP_THRESHOLD_POINT;
      let minDistToLine = SNAP_THRESHOLD_LINE;
      this.canvas.getObjects().forEach((obj) => {
        if (obj.type === 'line' && !obj.isPreviewLine && !obj.isDimensionLine) {
          // 根据线段端点计算基础角度（弧度）
          const baseAngleRadians = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
          // 如果angle未定义或为空，则默认为0
          const additionalAngle = obj.angle !== undefined && obj.angle !== null ? obj.angle : 0;
          // 总角度是基于端点的角度加上额外的angle值
          const totalAngleRadians = baseAngleRadians + (Math.PI / 180) * additionalAngle;
          const cosTheta = Math.cos(totalAngleRadians);
          const sinTheta = Math.sin(totalAngleRadians);
          // 确保使用线段的实际长度
          const lineLength = Math.sqrt(Math.pow(obj.x2 - obj.x1, 2) + Math.pow(obj.y2 - obj.y1, 2)) / 2;
          const dx = lineLength * cosTheta;
          const dy = lineLength * sinTheta;
          // 更新线段中心点的计算方式
          const objCenterX = obj.left + obj.width / 2;
          const objCenterY = obj.top + obj.height / 2;
          const x1 = objCenterX - dx;
          const y1 = objCenterY - dy;
          const x2 = objCenterX + dx;
          const y2 = objCenterY + dy;
          // 检查点到线段的距离
          const distance = this.distanceToLine(point, x1, y1, x2, y2);
          if (distance < minDistToLine) {
            closest = this.closestPointOnLine(point, x1, y1, x2, y2);
            minDistToLine = distance;
          }
          // 检查是否更接近端点
          const points = [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ];
          points.forEach((p) => {
            const d = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
            if (d < minDistToPoint) {
              closest = p;
              minDistToPoint = d;
            }
          });
        }
        // 新增对图像的处理
        else if (obj.type === 'image') {
          const imageX = obj.left;
          const imageY = obj.top;
          const imageWidth = obj.width * obj.scaleX;
          const imageHeight = obj.height * obj.scaleY;
          const angleInRadians = fabric.util.degreesToRadians(obj.angle || 0);
          const cos = Math.cos(angleInRadians);
          const sin = Math.sin(angleInRadians);
          // 获取图像中心点
          const center = {
            x: imageX,
            y: imageY
          };
          // 计算四个角点（相对于中心点）
          const corners = [
            { x: -imageWidth / 2, y: -imageHeight / 2 },
            { x: imageWidth / 2, y: -imageHeight / 2 },
            { x: -imageWidth / 2, y: imageHeight / 2 },
            { x: imageWidth / 2, y: imageHeight / 2 }
          ].map(corner => ({
            x: corner.x * cos - corner.y * sin + center.x,
            y: corner.x * sin + corner.y * cos + center.y
          }));
          // 检查距离并应用吸附逻辑
          corners.forEach(corner => {
            const d = Math.sqrt(Math.pow(corner.x - point.x, 2) + Math.pow(corner.y - point.y, 2));
            if (d < minDistToPoint) {
              closest = corner;
              minDistToPoint = d;
            }
          });
        }
      });
      if (closest) {
        // 获取当前画布的缩放级别
        const zoom = this.canvas.getZoom();
        // 调整圆圈的大小和位置以适应缩放级别
        const adjustedRadius = 5 / zoom; // 调整后的半径
        const adjustedOffset = adjustedRadius; // 调整后的位置偏移量
        if (!this.snapCircle) {
          this.snapCircle = new fabric.Circle({
            left: closest.x - adjustedOffset, // 圆心坐标减去调整后的半径
            top: closest.y - adjustedOffset, // 圆心坐标减去调整后的半径
            radius: adjustedRadius,
            stroke: 'blue',
            fill: 'transparent',
            selectable: false,
            evented: false,
          });
          this.canvas.add(this.snapCircle);
        } else {
          // 更新圆的位置
          this.snapCircle.set({ left: closest.x - adjustedOffset, top: closest.y - adjustedOffset, radius: adjustedRadius });
          this.snapCircle.setCoords();
        }
        this.canvas.renderAll();
      }
      else if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
        this.canvas.renderAll();
      }
      return closest;
    },
    updatePreviewLine(endPoint) {
      if (!this.isDrawingLine || this.linePoints.length !== 1) return;
      if (this.previewLine) {
        this.canvas.remove(this.previewLine);
      }
      const startPoint = this.linePoints[0];
      this.previewLine = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
        stroke: 'black',
        selectable: false,
        evented: false,
        isPreviewLine: true  // 添加这个属性
      });
      this.canvas.add(this.previewLine);
      this.canvas.requestRenderAll();
    },
    applySnapToAxis(startPoint, endPoint) {
      const SNAP_ANGLE = 5; // 角度阈值，例如5度以内
      const deltaX = endPoint.x - startPoint.x;
      const deltaY = endPoint.y - startPoint.y;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      // 水平吸附
      if (Math.abs(angle) < SNAP_ANGLE || Math.abs(angle - 180) < SNAP_ANGLE || Math.abs(angle + 180) < SNAP_ANGLE) {
        return { x: endPoint.x, y: startPoint.y };
      }
      // 垂直吸附
      if (Math.abs(angle - 90) < SNAP_ANGLE || Math.abs(angle + 90) < SNAP_ANGLE) {
        return { x: startPoint.x, y: endPoint.y };
      }
      return endPoint;
    },
    distanceToLine(point, x1, y1, x2, y2) {
      const A = point.x - x1;
      const B = point.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) {
        param = dot / len_sq;
      }
      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      const dx = point.x - xx;
      const dy = point.y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    },
    closestPointOnLine(point, x1, y1, x2, y2) {
      const A = point.x - x1;
      const B = point.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) {
        param = dot / len_sq;
      }
      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      return { x: xx, y: yy };
    },
    startDrawingDimensionLine() {
      this.disableCanvasObjectsSelection();
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'crosshair';
      });
      this.isDrawingDimensionLine = true;
      this.dimensionLinePoints = [];
      this.canvas.off('mouse:down');
      this.canvas.on('mouse:down', (options) => {
        if (this.isDrawingDimensionLine) {
          let endPoint = options.absolutePointer;
          if (!this.isCtrlPressed) {
            let snapPoint = this.findClosestPoint(endPoint);
            if (snapPoint) {
              endPoint = snapPoint;
            }
          }
          this.dimensionLinePoints.push(endPoint);
          if (this.dimensionLinePoints.length === 2) {
            this.drawDimensionLine();
            this.canvas.off('mouse:down');
          }
        }
      });
      this.canvas.on('mouse:move', (options) => {
        if (this.isDrawingDimensionLine) {
          let endPoint = options.absolutePointer;
          if (!this.isCtrlPressed) {
            let snapPoint = this.findClosestPoint(endPoint);
            if (!snapPoint && this.snapCircle) {
              this.canvas.remove(this.snapCircle);
              this.snapCircle = null;
            }
          } else if (this.snapCircle) {
            this.canvas.remove(this.snapCircle);
            this.snapCircle = null;
          }
          this.canvas.renderAll();
        }
      });
      // 添加 Esc 键退出绘制状态的监听器
      this.escKeyListener = (e) => {
        if (e.key === "Escape") {
          this.exitDrawingDimensionLine(); // 使用专门的方法退出绘制状态
        }
      };
      document.addEventListener('keydown', this.escKeyListener);
    },
    drawDimensionLine() {
      if (this.dimensionLinePoints.length !== 2) {
        return;
      }
      // // 应用吸附逻辑
      // let endPoint = this.applySnapToAxis(this.dimensionLinePoints[0], this.dimensionLinePoints[1]);
      // this.dimensionLinePoints[1] = endPoint;
      const [point1, point2] = this.dimensionLinePoints;
      const dimensionLineId = Date.now().toString();
      // 从 Vuex 获取 scale_fix
      const scaleFix = this.$store.state.canvas.scaleFix / 2.5;
      console.log('scaleFix value:', scaleFix);
      const line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], {
        stroke: 'black',
      });
      // 分别计算 X 轴和 Y 轴的像素长度
      const pixelLengthX = Math.abs(point2.x - point1.x);
      const pixelLengthY = Math.abs(point2.y - point1.y);
      // 使用 scaleX 和 scaleY 转换为实际尺寸
      const realLengthX = Math.round(pixelLengthX * scaleFix);
      const realLengthY = Math.round(pixelLengthY * scaleFix);
      // 计算总长度
      const realTotalLength = Math.round(Math.sqrt(Math.pow(realLengthX, 2) + Math.pow(realLengthY, 2)));
      const midPoint = {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2
      };
      // 计算文字旋转的角度（使其与尺寸线平行）
      let textAngle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
      const textOffsetDirection = point1.x > point2.x ? -1 : 1; // 根据绘制方向调整偏移
      let textOffset = 20 * textOffsetDirection; // 垂直偏移量
      // 计算线段的角度
      const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) + Math.PI / 2;
      // 如果线段是从右向左绘制的，调整文本角度
      if (point1.x > point2.x) {
        textAngle += 180;
        textOffset = -20 * textOffsetDirection;
      }
      // 调整文本位置
      let textX = midPoint.x;
      let textY = midPoint.y;
      // 根据线条角度动态调整文本位置
      if (textAngle === 0 || Math.abs(textAngle) === 180) { // 水平线条
        textY += textOffset;
      } else if (textAngle === 90 || textAngle === -90) { // 垂直线条
        textX += textOffset;
      } else { // 斜线条
        const dx = (point2.x - point1.x) / 2;
        const dy = (point2.y - point1.y) / 2;
        textX += dy / Math.abs(dy) * textOffset;
        textY -= dx / Math.abs(dx) * textOffset;
      }
      const text = new fabric.Text(realTotalLength.toString(), {
        left: textX,
        top: textY,
        fontSize: 20,
        angle: textAngle,
        originX: 'center', // 设置文本X轴对齐方式为中心
        originY: 'center', // 设置文本Y轴对齐方式为中心
        stroke: null, // 移除边框
        strokeWidth: 0 // 边框宽度设为0
      });
      // 创建箭头
      const arrowAngle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
      const arrowLength = 10; // 箭头的总长度
      const arrow1 = new fabric.Triangle({
        fill: 'black',
        width: 5,
        height: arrowLength,
        left: point1.x + Math.cos(arrowAngle * Math.PI / 180) * arrowLength / 2,
        top: point1.y + Math.sin(arrowAngle * Math.PI / 180) * arrowLength / 2,
        angle: arrowAngle - 90,
        originX: 'center',
        originY: 'center'
      });
      const arrow2 = new fabric.Triangle({
        fill: 'black',
        width: 5,
        height: arrowLength,
        left: point2.x - Math.cos(arrowAngle * Math.PI / 180) * arrowLength / 2,
        top: point2.y - Math.sin(arrowAngle * Math.PI / 180) * arrowLength / 2,
        angle: arrowAngle + 90,
        originX: 'center',
        originY: 'center'
      });
      const group = new fabric.Group([line, text, arrow1, arrow2], {
        selectable: true,
        isDimensionLine: true,
        dimensionLineId: dimensionLineId,  // 存储唯一ID
        lineAngle: angle,
        originalPoints: [point1, point2],
        originalStartPoint: { x: point1.x, y: point1.y },
        originalEndPoint: { x: point2.x, y: point2.y },
        lockScalingX: true,  // 锁定水平缩放
        lockScalingY: true,  // 锁定垂直缩放
        lockRotation: true,   // 锁定旋转
        hasControls: false, // 禁用控制点
        hasBorders: false,
        totalMove: { x: 0, y: 0 }  // 初始化totalMove属性
      });
      this.canvas.add(group);
      this.canvas.requestRenderAll();
      // 绘制完成后移除吸附圆圈
      if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      this.isDrawingDimensionLine = false;
      this.dimensionLinePoints = [];
      // 添加对象选择事件监听器
      this.canvas.on('object:selected', function (e) {
        if (e.target.isDimensionLine) {
          // 更新属性框以显示当前文本属性
          updatePropertyBox(e.target);
        }
      });
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'move'; // 这里假设默认的 hoverCursor 是 'move'
      });
      this.enableCanvasObjectsSelection();
      this.updateCanvasState();
    },
    exitDrawingDimensionLine() {
      this.enableCanvasObjectsSelection();
      this.canvas.forEachObject((obj) => {
        obj.hoverCursor = 'move'; // 这里假设默认的 hoverCursor 是 'move'
      });
      this.canvas.off('mouse:down');
      this.canvas.off('mouse:move');
      if (this.snapCircle) {
        this.canvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      this.isDrawingDimensionLine = false;
      this.dimensionLinePoints = [];
      document.removeEventListener('keydown', this.escKeyListener); // 移除 Esc 键的事件监听器
      this.updateCanvasState(); // 更新画布状态
    },
  },
};