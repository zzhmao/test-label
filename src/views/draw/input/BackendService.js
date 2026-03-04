import parkingspace from "@/assets/draw/parkingspace1.svg";
import lighting from "@/assets/draw/lighting1.drawio.svg";
import paymentMachine from "@/assets/draw/paymentmachine1.drawio.svg";
import fullSkylight from "@/assets/draw/Full-skylight1.drawio.svg";

export default {
  methods: {
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
    sendDataToBackend() {
      // 检查蓝色线条（车道边线）
      const blueLines = this.canvas
        .getObjects("line")
        .filter((line) => line.stroke === "blue");
      // if (blueLines.length < 1) {
      //   alert(" 車道側ラインが必要です");
      //   return;
      // }
      // 检查双箭头（尺寸线）
      const doubleArrows = this.canvas
        .getObjects("group")
        .filter((group) => group.isDimension);
      if (doubleArrows.length < 2) {
        alert("寸法が2つ以上が必要です");
        return;
      }
      // 检查绿色线条（gateway）
      const greenRects = this.canvas
        .getObjects('polygon') // 获取所有多边形对象
        .filter((polygon) => polygon.isGateway && polygon.stroke === 'green'); // 筛选出绿色并且标记为 gateway 的对象
      const angleThreshold = 20; // 夹角阈值
      let angleGreaterThanThresholdFound = false;
      for (let i = 0; i < doubleArrows.length; i++) {
        for (let j = i + 1; j < doubleArrows.length; j++) {
          const angle = this.calculateAngleBetweenLines(
            doubleArrows[i].dimensionLine,
            doubleArrows[j].dimensionLine
          );
          if (angle > angleThreshold) {
            angleGreaterThanThresholdFound = true;
            break; // 跳出内层循环
          }
        }
        if (angleGreaterThanThresholdFound) {
          break; // 如果找到一个合适的角度，跳出外层循环
        }
      }
      // 如果没有找到任何夹角大于阈值的线对，则弹出警告
      if (!angleGreaterThanThresholdFound) {
        alert(
          `少なくとも1組の寸法線の間の角度が${angleThreshold}度以上である必要があります`
        );
        return;
      }
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
          const type = line.stroke === "blue" ? "road" : "building";
          const roundedPoint1 = roundPoint({ x: line.x1, y: line.y1 });
          const roundedPoint2 = roundPoint({ x: line.x2, y: line.y2 });
          const position = [
            roundedPoint1.x,
            roundedPoint1.y,
            roundedPoint2.x,
            roundedPoint2.y,
          ];
          return { type: type, position: position };
        });
      // 获取禁止綫
      const prohibitLines = this.canvas
        .getObjects("line")
        .filter((line) => line.isProhibit);
      // 检查闭合图形
      if (prohibitLines.length > 0 && !this.isClosedShape(prohibitLines)) {
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
      // 处理禁止线
      const allProhibitLines = this.canvas
        .getObjects("line")
        .filter((line) => line.isProhibit);
      const closedShapes = this.checkClosedShapes(allProhibitLines);

      // 处理每个闭合图形
      const prohibit = closedShapes.map(shape =>
        shape.map(line => {
          const roundedPoint1 = roundPoint({ x: line.x1, y: line.y1 });
          const roundedPoint2 = roundPoint({ x: line.x2, y: line.y2 });
          return {
            type: "prohibit",
            position: [
              roundedPoint1.x,
              roundedPoint1.y,
              roundedPoint2.x,
              roundedPoint2.y,
            ]
          };
        })
      );
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
      const greenRectData = this.canvas
        .getObjects('polygon')
        .filter((polygon) => polygon.isGateway && polygon.stroke === 'green')
        .map((polygon) => {
          const [point1, point2, point3, point4] = polygon.get("points");
          // 四舍五入点的坐标
          const roundedPoint1 = roundPoint(point1);
          const roundedPoint2 = roundPoint(point2);
          const roundedPoint3 = roundPoint(point3);
          const roundedPoint4 = roundPoint(point4);
          // 计算point3和point4的中点
          const midPoint = {
            x: (roundedPoint3.x + roundedPoint4.x) / 2,
            y: (roundedPoint3.y + roundedPoint4.y) / 2
          };
          // 计算两个向量
          const vector1 = { x: roundedPoint2.x - roundedPoint1.x, y: roundedPoint2.y - roundedPoint1.y };
          const vector2 = { x: midPoint.x - roundedPoint2.x, y: midPoint.y - roundedPoint2.y };
          // 计算叉积以确定旋转方向
          const crossProduct = vector1.x * vector2.y - vector1.y * vector2.x;
          // 确定旋转方向
          const isClockwise = crossProduct < 0;
          // 根据旋转方向调整position数组的顺序
          const position = isClockwise
            ? [roundedPoint2.x, roundedPoint2.y, roundedPoint1.x, roundedPoint1.y,]
            : [roundedPoint1.x, roundedPoint1.y, roundedPoint2.x, roundedPoint2.y,];
          // 计算长度
          const length = Math.round(Math.abs(polygon.userData.height));
          return { position: position, length: length };
        });
      const dataToSend = {
        id: Date.now().toString(),
        border: borders,
        dimension: dimensions,
        gateway: greenRectData,
        prohibit: prohibit,
      };
      console.log("drawing", JSON.stringify(dataToSend, null, 2));
      // 发送到后端的代码...
      let attemptCount = 0;
      const maxAttempts = 1200;
      const timestamp = Date.now().toString();
      // 获取id
      // 发送带有时间戳的上传请求
      fetch(`http://54.92.84.160/layout/upload?timestamp=${timestamp}`, {
      // fetch(`http://localhost:8080/layout/upload?timestamp=${timestamp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      })
        .then(response => {
          if (!response.ok) {
            if (response.status === 503) { // 服务器繁忙，处理超过3个请求
              alert("サーバーが忙しいです。後ほど再試行してください。");
            } else {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return;
          }
          return response.json();
        })
        .then(data => {
          if (!data) return;
          console.log(data);
          // 以下是查询结果的部分，根据您的逻辑进行修改
          const intervalId = setInterval(() => {
            // fetch(`http://localhost:8080/layout/result?timestamp=${timestamp}`, {
              fetch(`http://54.92.84.160/layout/result?timestamp=${timestamp}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ data }),
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
              })
              .then((data) => {
                switch (data.status) {
                  case 200:
                    attemptCount++;
                    this.modalMessage = "作成が完了するまでお待ちください…<br>" + data.message;
                    this.showModal = true;
                    this.progressPercentage = 100;
                    if (++attemptCount >= maxAttempts) {
                      clearInterval(intervalId);
                      this.showModal = false;
                      alert("タイムアウト！\n" + data.message);
                    }
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
                  case 180:
                    clearInterval(intervalId);
                    console.log(
                      "服务器返回的数据：",
                      JSON.parse(JSON.stringify(data))
                    );
                    const { scaleX, scaleY } = data.scale;
                    this.areas = data.area;
                    // 调用 showPopup 方法
                    this.showPopup();
                    let imagePromises = [];
                    // 从服务器返回的数据中获取 scale_fix
                    let scaleFix = data.scale_fix;
                    this.$nextTick(() => {
                      // 遍历每个 canvas 并尝试添加 border 线条和 gateway
                      this.fabricCanvases.forEach((canvas) => {
                        if (!canvas) {
                          return;
                        }
                        // 绘制 border 线条
                        data.border.forEach((borderItem) => {
                          const line = new fabric.Line(borderItem.position, {
                            fill: 'black',
                            stroke: 'black',
                            strokeWidth: 1,
                            selectable: false,
                            evented: false, // 禁止事件交互
                            isBorder: true, // 添加自定义属性以标识border线条
                            // 根据type设置实线或虚线
                            strokeDashArray: borderItem.type === 'road' ? [5, 5] : null
                          });
                          canvas.add(line);
                        });
                        // 绘制 gateway
                        data.gateway.forEach((gatewayItem) => {
                          const [x1, y1, x2, y2] = gatewayItem.position;
                          const height = gatewayItem.length_pixel;
                          // 计算平行于底边的向量
                          const dx = x2 - x1;
                          const dy = y2 - y1;
                          const length = Math.sqrt(dx * dx + dy * dy);
                          // 计算矩形的另外两个顶点
                          const ux = -dy / length; // 单位向量
                          const uy = dx / length; // 单位向量
                          const x3 = x1 + ux * height;
                          const y3 = y1 + uy * height;
                          const x4 = x2 + ux * height;
                          const y4 = y2 + uy * height;
                          // 计算矩形中心点
                          const centerX = (x1 + x2 + x3 + x4) / 4;
                          const centerY = (y1 + y2 + y3 + y4) / 4;
                          // 创建并添加矩形
                          const polygon = new fabric.Polygon([
                            { x: x1, y: y1 },
                            { x: x2, y: y2 },
                            { x: x4, y: y4 },
                            { x: x3, y: y3 }
                          ], {
                            fill: 'transparent',
                            stroke: 'black',
                            strokeWidth: 1,
                            selectable: false,
                            evented: false,
                            isGateway: true
                          });
                          canvas.add(polygon);
                          // 定义箭头的 SVG 路径数据
                          const arrowPathData = 'M 21 79.5 L 11 79.5 L 11 19.5 L 0.5 19.5 L 16 0.5 L 31.5 19.5 L 21 19.5 Z';
                          // 箭头大小和方向
                          const arrowScale = height / 2 / 79.5; // 假设 SVG 箭头的高度为 79.5
                          const arrowAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                          // 计算箭头移动距离
                          const arrowShift = length / 4;
                          // 创建并添加第一个箭头
                          const arrow1 = new fabric.Path(arrowPathData, {
                            left: centerX + arrowShift * Math.cos(arrowAngle * Math.PI / 180),
                            top: centerY + arrowShift * Math.sin(arrowAngle * Math.PI / 180),
                            originX: 'center',
                            originY: 'center',
                            angle: arrowAngle,
                            scaleX: arrowScale,
                            scaleY: arrowScale,
                            fill: 'transparent',
                            stroke: '#000000',
                            evented: false, // 禁止事件交互
                            selectable: false,
                          });
                          // 创建并添加第二个箭头（方向相反）
                          const arrow2 = new fabric.Path(arrowPathData, {
                            left: centerX - arrowShift * Math.cos(arrowAngle * Math.PI / 180),
                            top: centerY - arrowShift * Math.sin(arrowAngle * Math.PI / 180),
                            originX: 'center',
                            originY: 'center',
                            angle: arrowAngle + 180,
                            scaleX: arrowScale,
                            scaleY: arrowScale,
                            fill: 'transparent',
                            stroke: '#000000',
                            evented: false, // 禁止事件交互
                            selectable: false,
                          });
                          canvas.add(arrow1);
                          canvas.add(arrow2);
                        });
                        // 重绘当前 canvas
                        canvas.renderAll();
                      });
                    });
                    data.area.forEach((area, index) => {
                      if (area.length > 0 && Array.isArray(area)) {
                        // 此时 finalSortedAreas 就是按照上述逻辑排序后的车位数组
                        area.forEach((areaObject, areaIndex) => {
                          if (areaObject && areaObject.center && areaObject.center.length >= 2) {
                            const svgUrl = (() => {
                              switch (areaObject.type) {
                                case 'std':
                                  return { url: parkingspace, width: 2500, height: 5000 };
                                case 'p_sign':
                                  return { url: fullSkylight, width: 1000, height: 500 };
                                case 'light':
                                  return { url: lighting, width: 1000, height: 1000, type: 'light' }; // 加入类型标记
                                case 'fare':
                                  return { url: paymentMachine, width: 1000, height: 1000 };
                                default:
                                  return null;
                              }
                            })();
                            if (!svgUrl) return; // 如果没有对应的 SVG URL，则不处理
                            imagePromises.push(new Promise((resolve, reject) => {
                              const centerX = areaObject.center[0];
                              const centerY = areaObject.center[1];
                              const imageWidth = svgUrl.width / scaleFix;
                              const imageHeight = svgUrl.height / scaleFix;
                              const angleInDegrees = areaObject.angle * 360; // 将角度值转换为度
                              fabric.Image.fromURL(svgUrl.url, (oImg) => {
                                oImg.set({
                                  left: centerX,
                                  top: centerY,
                                  scaleX: imageWidth / oImg.width,
                                  scaleY: imageHeight / oImg.height,
                                  angle: angleInDegrees,
                                  selectable: false,
                                  originX: "center",
                                  originY: "center",
                                  selectable: false,
                                  evented: false,
                                  lightType: svgUrl.type === 'light', // 设置属性标记是否为 light 类型
                                  parkingSpace: (areaObject.type === 'std') ? `P${areaIndex + 1}` : undefined // 为 'std' 类型车位设置编号
                                });
                                // 根据 index 选择对应的画布
                                const currentCanvas = this.fabricCanvases[index];
                                if (currentCanvas) {
                                  currentCanvas.add(oImg).renderAll();
                                  if (areaObject.type === 'std') { // 只为类型为 'std' 的车位添加编号
                                    const fontSize = Math.round(1250 / scaleFix); // 假设原始字号为20，使用图像的横向缩放比例
                                    console.log(fontSize); // 输出计算后的字体大小
                                    // 为图像创建编号文本
                                    const text = new fabric.Text(String(areaIndex + 1), {
                                      left: centerX, // 位置根据需要调整
                                      top: centerY, // 文本位置位于图像正中心，可以根据需求上下调整
                                      fontSize: fontSize,
                                      fill: '#000',
                                      originX: 'center',
                                      originY: 'center',
                                      selectable: false,
                                      evented: false,
                                      lockScalingX: true,
                                      lockScalingY: true,
                                    });
                                    currentCanvas.add(text);
                                    // 建立图像和文本之间的关联
                                    text.bringToFront(); // 确保文本编号在图像上方
                                  }
                                } else {
                                  console.error(`popupFabricCanvas${index + 1} 見つかりません`);
                                  reject(new Error(`popupFabricCanvas${index + 1} 見つかりません`));
                                }
                                resolve(oImg);
                              }, { crossOrigin: "anonymous" });
                            }));
                          }
                        });
                      }
                    });
                    // 等待所有图片加载的promise都完成
                    Promise.all(imagePromises)
                      .then(() => {
                        // 遍历画布上的所有对象，将类型为 light 的图像移至最上层
                        this.canvas.getObjects().forEach(obj => {
                          if (obj.lightType) {
                            obj.bringToFront();
                          }
                        });
                        // 所有图片都已加载到画布，现在可以重绘
                        this.canvas.renderAll();
                        // 保存scaleX和scaleY到Vuex状态管理库
                        this.$store.commit("canvas/setCanvasScale", { scaleX, scaleY });
                        // 保存scale_fix到Vuex
                        this.$store.commit("canvas/setScaleFix", data.scale_fix);
                        // 保存border数据到Vuex
                        this.$store.commit('canvas/setCanvasBorder', data.border);
                      })
                      .catch((error) => {
                        console.error("画像の読み込み中にエラーが発生しました：", error);
                      });
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
        .catch((error) => {
          console.error("Error:", error);
        });
    },
  }
}