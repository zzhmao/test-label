import parkingSpaceSvg from "@/assets/draw/simulationparkingspace.svg";
import axios from 'axios';
export default {
  methods: {
    prakingLotenableEraser() {
      this.parkingLotCanvas.isDrawingMode = false;
      this.parkingLotCanvas.getActiveObjects().forEach((obj) => {
        this.parkingLotCanvas.remove(obj);
      });
      this.parkingLotCanvas.discardActiveObject().renderAll();
    },
    setLineColorParking(color) {
      this.exitDrawingModeParking();
      this.currentLineColor = color;
      this.isDrawingLine = true;
      this.parkingLotCanvas.defaultCursor = 'crosshair'; // 改变鼠标样式
      this.parkingLotCanvas.forEachObject((obj) => {
        obj.hoverCursor = 'crosshair';
      });
      this.disableCanvasObjectsSelectionParking(); // 禁用其他对象的选择
      this.lastLineEndPoint = null; // 清空最后一条线的终点坐标
      this.points = []; // 清空点数组，确保开始新的绘制时没有之前的点
    },
    // 吸附邏輯
    findClosestPointParking(point) {
      // 如果Ctrl键被按下，跳过吸附逻辑
      if (this.isCtrlPressed) {
        return null;
      }
      const SNAP_THRESHOLD_POINT = 20; // 端点的吸附阈值
      const SNAP_THRESHOLD_LINE = 10; // 线条的吸附阈值
      let closest = null;
      let minDistToPoint = SNAP_THRESHOLD_POINT;
      let minDistToLine = SNAP_THRESHOLD_LINE;
      this.parkingLotCanvas.getObjects().forEach((obj) => {
        if (obj.type === 'line') {
          // 检查点到线条的距离
          const distance = this.distanceToLineParking(point, obj);
          if (distance < minDistToLine) {
            const closestPointOnLineParking = this.closestPointOnLineParking(point, obj);
            if (closestPointOnLineParking) {
              closest = closestPointOnLineParking;
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
          this.parkingLotCanvas.add(this.snapCircle);
        } else {
          // 更新圆的位置
          this.snapCircle.set({ left: closest.x - 5, top: closest.y - 5 });
          this.snapCircle.setCoords();
        }
        this.parkingLotCanvas.renderAll();
      } else if (this.snapCircle) {
        this.parkingLotCanvas.remove(this.snapCircle);
        this.snapCircle = null;
        this.parkingLotCanvas.renderAll();
      }
      return closest;
    },
    distanceToLineParking(point, line) {
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
    closestPointOnLineParking(point, line) {
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
    initMouseEventsParking() {
      this.parkingLotCanvas.on('mouse:move', (options) => {
        if (this.isDrawingLine || this.isDrawingDoubleArrow || this.isDrawingGreenLine) {
          const { x, y } = options.absolutePointer;
          const snapPoint = this.isCtrlPressed ? null : this.findClosestPointParking({ x, y });
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
              this.parkingLotCanvas.add(this.snapCircle);
            } else {
              this.snapCircle.set({ left: snapPoint.x - 5, top: snapPoint.y - 5 });
              this.snapCircle.setCoords();
            }
          } else if (this.snapCircle) {
            this.parkingLotCanvas.remove(this.snapCircle);
            this.snapCircle = null;
          }
          this.parkingLotCanvas.renderAll();
        }
      });
    },
    distanceBetweenParking(point1, point2) {
      return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
      );
    },
    onCanvasClickParking(options) {
      if (this.isBezierDrawingMode) {
        let pointer = this.parkingLotCanvas.getPointer(options.e);
        this.bezierPoints.push({ x: pointer.x, y: pointer.y });

        if (this.bezierPoints.length === 2) {
          this.setupBezier();
        }
      } else {
        // 只有在绘制直线时才响应点击事件
        if (!this.isDrawingLine) return;
        const { x, y } = options.absolutePointer;
        // 如果按下了 Ctrl 键，不进行吸附；否则找到最近的点
        const snapPoint = this.isCtrlPressed ? null : this.findClosestPointParking({ x, y });
        this.points.push(snapPoint || { x, y });
        // 检查是否可以绘制直线（至少需要两个点）
        if (this.points.length >= 2) {
          const point1 = this.points[this.points.length - 2];
          const point2 = this.points[this.points.length - 1];
          // 使用 fabric.js 创建直线
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
          this.parkingLotCanvas.add(line).setActiveObject(line);
        }
        // 如果当前不是绘制直线状态，重置鼠标样式并启用画布上对象的选择
        if (!this.isDrawingLine) {
          this.parkingLotCanvas.defaultCursor = 'default';
          this.enableCanvasObjectsSelectionParking();
        }
        // 移除吸附圆圈（如果有）
        if (this.snapCircle) {
          this.parkingLotCanvas.remove(this.snapCircle);
          this.snapCircle = null;
        }
        this.canvas.forEachObject((obj) => {
          obj.hoverCursor = 'move';
        });
      }
    },
    exitDrawingModeParking() {
      this.isDrawingLine = false;
      this.isDrawingDoubleArrow = false;
      this.isDrawingGreenLine = false;
      this.isBezierDrawingMode = false;
      this.controlPoints.forEach(cp => this.parkingLotCanvas.remove(cp)); // 清除现有控制点
      this.points = [];
      if (this.snapCircle) {
        this.parkingLotCanvas.remove(this.snapCircle);
        this.snapCircle = null;
      }
      this.parkingLotCanvas.forEachObject((obj) => {
        obj.hoverCursor = 'move';
      });
      // 重置鼠标样式和启用对象选择
      this.parkingLotCanvas.defaultCursor = 'default';
      this.enableCanvasObjectsSelectionParking();
    },
    disableCanvasObjectsSelectionParking() {
      this.parkingLotCanvas.forEachObject((object) => {
        object.selectable = false;
      });
      this.parkingLotCanvas.discardActiveObject().renderAll();
    },
    // 启用画布对象选择的方法
    enableCanvasObjectsSelectionParking() {
      this.parkingLotCanvas.forEachObject((object) => {
        // 允许所有对象被选择
        object.selectable = true;
        // 如果对象是线段（假设线段用 Path 表示），则设置为不可移动
        if (object.type === 'path' && object.isBezier) {
          object.hasControls = false; // 禁用控制点
          object.lockMovementX = true; // 锁定X轴移动
          object.lockMovementY = true; // 锁定Y轴移动
        }
      });
    },
    setParkingSpaceSvg() {
      // 使用fabric.Image.fromURL加载SVG文件
      fabric.Image.fromURL(parkingSpaceSvg, (img) => {
        // 图片加载完成后的回调函数
        // 将加载的SVG作为图像添加到画布上
        this.parkingLotCanvas.add(img);
        this.parkingLotCanvas.renderAll();
        img.set({
          left: 100,
          top: 100,
          angle: 0,
          scaleX: this.scalingFactor,
          scaleY: this.scalingFactor,
          originX: 'center',
          originY: 'center',
        });
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
        this.parkingLotCanvas.renderAll(); // 重新渲染画布以显示添加的图像
      });
    },
    goToCamera() {
      this.exitDrawingModeParking();
      let attemptCount = 0;
      const maxAttempts = 300;
      if (!this.certificationOption) {
        alert("認証方法を選択してください。"); // 提示用户选择认证方式
        return; // 中断函数执行
      }
      // 获取所有贝塞尔曲线
      const pointInterval = this.Scale / 5;  // 计算每个点之间的间隔
      const bezierCurves = this.parkingLotCanvas.getObjects()
        .filter(obj => obj.type === 'path' && obj.isBezier)
        .map(curve => {
          const points = [];
          let lastPoint = null;
          for (let t = 0; t <= 1; t += 0.01) {
            const x = Math.round((1 - t) ** 2 * curve.path[0][1] + 2 * (1 - t) * t * curve.path[1][1] + t ** 2 * curve.path[1][3]);
            const y = Math.round((1 - t) ** 2 * curve.path[0][2] + 2 * (1 - t) * t * curve.path[1][2] + t ** 2 * curve.path[1][4]);
            let point = [x, y];
            if (!lastPoint || Math.sqrt(Math.pow(point[0] - lastPoint[0], 2) + Math.pow(point[1] - lastPoint[1], 2)) >= pointInterval) {
              points.push(point);
              lastPoint = point;
            }
          }
          return points;
        });
      // 获取所有边界线（蓝色和红色）
      const borderLines = this.parkingLotCanvas
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
      // 用于处理边界线的部分
      const allBorderLines = this.parkingLotCanvas
        .getObjects("line")
        .filter((line) => line.isBorder);
      const closedShapes = this.checkClosedShapes(allBorderLines);
      const borders = closedShapes.map(shape => // 处理每个闭合图形
        shape.map(line => {
          const roundedPoint1 = roundPoint({ x: line.x1, y: line.y1 });
          const roundedPoint2 = roundPoint({ x: line.x2, y: line.y2 });
          return [
            roundedPoint1.x,
            roundedPoint1.y,
            roundedPoint2.x,
            roundedPoint2.y,
          ];
        })
      );
      // 处理尺寸线（双箭头）
      const dimensions = this.parkingLotCanvas
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
      const certificationOptionMapping = {
        "ハイブリッド": "hybrid",
        "車室認証": "parkingspace",
        "ゲート式": "gatetype"
      };
      // 创建要输出的结构
      const outputData = {
        ID: this.ID,
        certificationOption: certificationOptionMapping[this.certificationOption],
        borders: JSON.stringify(borders),
        parkingSpacesData,
        route: JSON.stringify(bezierCurves),
      };
      // 使用console.log以指定格式打印数据
      console.log(JSON.stringify(outputData, null, 2));
      // // 从parkingLotCanvas导出画布内容为DataURL
      // const dataUrl = this.parkingLotCanvas.toDataURL({
      //   format: 'png',
      //   quality: 1.0
      // });
      // // 清除cameraCanvas上的内容
      // this.cameraCanvas.clear();
      // // 使用导出的DataURL设置cameraCanvas的背景图像
      // this.cameraCanvas.setBackgroundImage(dataUrl, () => {
      //   // 图像已加载，现在可以安全访问 backgroundImage 的属性
      //   const img = this.cameraCanvas.backgroundImage;
      //   const scaleX = this.cameraCanvas.width / img.width;
      //   const scaleY = this.cameraCanvas.height / img.height;
      //   const scaleToFit = Math.min(scaleX, scaleY);
      //   img.scaleX = scaleToFit;
      //   img.scaleY = scaleToFit;
      //   img.originX = 'left';
      //   img.originY = 'top';
      //   img.top = 0;
      //   img.left = 0;
      //   this.cameraCanvas.renderAll();
      // });
      axios.post(`http://54.92.84.160/layout/parkinglot/upload`, outputData, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(response => {
          console.log('Success:', response.data);
          const task = response.data.task;
          this.task = task;
          const intervalId = setInterval(() => {
            axios.post(`http://54.92.84.160/layout/parkinglot/result`, { ID: this.ID, task: this.task }, {
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
                    if (data && data.cameraData && data.scale) { // 确保数据存在
                      this.setSector(data.cameraData, parseFloat(data.scale));
                    } else {
                      console.error("无法获取数据");
                    }
                    this.showModal = false;
                    // 然后再跳转到parking-lot标签
                    this.activeName = "camera";
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
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },
    backInPut() {
      this.activeName = "load-draw";
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
    setSector(cameraData, scale) {
      // 清除画布，但保留背景
      this.cameraCanvas.getObjects().forEach((obj) => {
        if (obj.type !== 'image') { // 假设背景是唯一的图像类型对象
          this.cameraCanvas.remove(obj);
        }
      });
      cameraData.forEach((data, index) => {
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
        const defaultCameraAngle = Math.abs(verticalangle - 90);
        const startAngle = - 90 - focal / 2;
        const endAngle = - 90 + focal / 2;
        const radius = defaultCameraRadius * this.Scale;
        // 调整中心点X坐标
        const levelangleRad = levelangle * (Math.PI / 180);
        const adjustedCenterX = center[0] * scale + radius / 2 * Math.sin(levelangleRad)
        const adjustedCenterY = center[1] * scale - radius / 2 * Math.cos(levelangleRad)
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
    // 启动绘制贝塞尔曲线模式
    startBezierDrawing() {
      this.exitDrawingModeParking();
      this.isBezierDrawingMode = true;
      this.bezierPoints = [];
      this.controlPoints = [];
    },
    setupBezier() {
      let [p1, p2] = this.bezierPoints;
      // 初始化控制点位置
      let initialControlX = (p1.x + p2.x) / 2;
      let initialControlY = (p1.y + p2.y) / 2;
      // 创建初始路径对象
      let bezierPath = new fabric.Path([['M', p1.x, p1.y], ['Q', initialControlX, initialControlY, p2.x, p2.y]], {
        fill: '',
        stroke: 'blue',
        strokeWidth: 2,
        selectable: false,
        isBezier: true  // 添加自定义标记
      });
      this.parkingLotCanvas.add(bezierPath);
      // 创建控制点
      let controlPoint = new fabric.Circle({
        left: initialControlX,
        top: initialControlY,
        strokeWidth: 5,
        radius: 5,
        fill: '#ff0000',
        hasBorders: false,
        hasControls: false,
        selectable: true,
        originX: 'center',
        originY: 'center'
      });
      this.parkingLotCanvas.add(controlPoint);
      this.controlPoints.push(controlPoint); // 存储新的控制点
      // 绑定控制点移动事件
      controlPoint.on('moving', () => {
        let newControlX = controlPoint.left;
        let newControlY = controlPoint.top;
        // 删除旧的路径对象
        this.parkingLotCanvas.remove(bezierPath);
        // 创建新的路径对象
        let newPath = [['M', p1.x, p1.y], ['Q', newControlX, newControlY, p2.x, p2.y]];
        bezierPath = new fabric.Path(newPath, {
          fill: '',
          stroke: 'blue',
          strokeWidth: 2,
          selectable: false,
          isBezier: true  // 添加自定义标记
        });
        this.parkingLotCanvas.add(bezierPath); // 添加新路径到画布
        this.parkingLotCanvas.requestRenderAll(); // 强制重绘画布
      });
    }
  }
}