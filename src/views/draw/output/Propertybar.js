export default {
  computed: {
    shouldShowDiv() {
      if (!this.selectedImage) return false;
      const customAttributes = ['signboardSvg', 'fullSkylight', 'telephonePole', 'cameraPole', 'paymentMachine', 'iBarrierCar', 'uBarrierCar', 'lighting', 'controlBox', 'parkingSpace'];
      return customAttributes.some(attr => this.selectedImage[attr]);
    },
    uiTexts() {
      let texts = {
        placeholder: 'オプションを選択してください',
        buttonText: '画像を更新'
      };
      if (this.selectedImage) {
        if (this.selectedImage.signboardSvg) {
          texts.placeholder = '看板タイプを選択してください';
          texts.buttonText = '看板を更新';
        } else if (this.selectedImage.fullSkylight) {
          texts.placeholder = '満空灯タイプを選択してください';
          texts.buttonText = '満空灯を更新';
        } else if (this.selectedImage.telephonePole) {
          texts.placeholder = '電柱タイプを選択してください';
          texts.buttonText = '電柱を更新';
        } else if (this.selectedImage.cameraPole) {
          texts.placeholder = 'カメラポールタイプを選択してください';
          texts.buttonText = 'カメラポールを更新';
        } else if (this.selectedImage.paymentMachine) {
          texts.placeholder = '精算機タイプを選択してください';
          texts.buttonText = '精算機を更新';
        } else if (this.selectedImage.iBarrierCar) {
          texts.placeholder = 'Iバリアカータイプを選択してください';
          texts.buttonText = 'Iバリアカーを更新';
        } else if (this.selectedImage.uBarrierCar) {
          texts.placeholder = 'Uバリアカータイプを選択してください';
          texts.buttonText = 'Uバリアカーを更新';
        } else if (this.selectedImage.lighting) {
          texts.placeholder = '照明タイプを選択してください';
          texts.buttonText = '照明を更新';
        } else if (this.selectedImage.controlBox) {
          texts.placeholder = '制御ボックスタイプを選択してください';
          texts.buttonText = '制御ボックスを更新';
        } else if (this.selectedImage.parkingSpace) {
          texts.placeholder = '車室タイプを選択してください';
          texts.buttonText = '車室を更新';
        }
      }
      return texts;
    }
  },
  methods: {
    handleObjectSelected(event) {
      if (event.selected && event.selected.length > 0) {
        const selectedObject = event.selected[0];
        // 检查选中对象是否为图片
        if (selectedObject.type === 'image') {
          // 绑定一个处理旋转吸附的事件处理函数
          this.canvas.on('object:rotating', this.handleImageRotation);
        } else {
          // 解绑处理旋转吸附的事件处理函数
          this.canvas.off('object:rotating', this.handleImageRotation);
        }
        // 定义所有自定义属性
        const customAttributes = ['signboardSvg', 'fullSkylight', 'telephonePole', 'cameraPole', 'paymentMachine', 'iBarrierCar', 'uBarrierCar', 'lighting', 'controlBox', 'parkingSpace'];
        // 如果之前已经选中了一个对象
        if (this.selectedImage) {
          // 检查是否需要重置 selectedImageUrl
          let isDifferentAttribute = customAttributes.some(attr => {
            return (this.selectedImage[attr] !== undefined || selectedObject[attr] !== undefined) && (this.selectedImage[attr] !== selectedObject[attr]);
          });
          if (isDifferentAttribute) {
            this.selectedImageUrl = ''; // 重置选中的图像 URL
          }
        } else {
          // 如果之前没有选中对象，则根据当前选中对象是否有自定义属性来决定
          if (customAttributes.some(attr => selectedObject[attr] !== undefined)) {
            this.selectedImageUrl = '';
          }
        }
        // 更新 selectedImage
        this.selectedImage = selectedObject;
        customAttributes.forEach(attr => {
          if (selectedObject[attr]) {
            // 根据不同属性更新图像选项
            this.updateImageOptions(attr);
          }
        });
        // 处理选中的是文本对象的情况
        if (selectedObject.type === 'text') {
          this.selectedText = selectedObject;
          this.selectedDimensionLine = null;
          this.selectedImage = null;
          this.selectedLine = null;
          this.editText = selectedObject.text;
          this.selectedFontSize = selectedObject.fontSize; // 存储选中文本的字号
          this.fontSizeInput = this.selectedFontSize.toString(); // 更新输入框的值为当前字号
        } else {
          this.selectedText = null;
        }
        // 处理选中的是线条对象的情况
        if (selectedObject.type === 'line') {
          this.selectedDimensionLine = null;
          this.selectedImage = null;
          this.selectedText = null;
          this.selectedLine = selectedObject;
          switch (selectedObject.strokeWidth) {
            case 1:
              this.lineWidth = "1"; // 对应 0.5mm
              break;
            case 2:
              this.lineWidth = "2"; // 对应 1mm
              break;
            case 3:
              this.lineWidth = "3"; // 对应 1.5mm
              break;
            default:
              this.lineWidth = "1"; // 默认值或未知值
          }
          // 检查线条样式
          if (selectedObject.strokeDashArray) {
            if (selectedObject.strokeDashArray[0] === 10) {
              // 长虚线
              this.lineStyle = 'dashed';
            } else if (selectedObject.strokeDashArray[0] === 5) {
              // 短虚线
              this.lineStyle = 'dashedShort';
            } else if (selectedObject.strokeDashArray[0] === 15 && selectedObject.strokeDashArray[1] === 2) {
              // 点划线
              this.lineStyle = 'dotDashed';
            }
          } else {
            // 默认选中第一个选项
            this.lineStyle = 'dashedShort';
          }
          this.selectedDimensionLine = null;
          console.log("Selected Line Properties:", this.selectedLine);
        }
        // 处理选中的是图像对象的情况
        if (selectedObject.type === 'image') {
          this.selectedLine = null;
          this.selectedDimensionLine = null;
          this.selectedText = null;
          this.selectedImage = selectedObject;
          // 更新 imageWidth 和 imageHeight 为选中图像的当前尺寸
          // 从 Vuex 获取 scale_fix
          const scaleFix = this.$store.state.canvas.scaleFix / 2.5;
          this.imageWidth = Math.round((selectedObject.width * scaleFix * selectedObject.scaleX) / 100) * 100;
          this.imageHeight = Math.round((selectedObject.height * scaleFix * selectedObject.scaleY) / 100) * 100;
        }
        // 处理选中的是尺寸线对象的情况
        else if (selectedObject.isDimensionLine) {
          this.selectedLine = null;
          this.selectedImage = null;
          this.selectedText = null;
          this.selectedDimensionLine = selectedObject;
          let textObject = this.getTextFromDimensionLine(selectedObject); // 使用this
          if (textObject) {
            this.dimensionText = textObject.text;
          }
          this.selectedLine = null;
          // 初始化或更新累积移动距离
          if (!this.selectedDimensionLine.totalMove) {
            this.selectedDimensionLine.totalMove = { x: 0, y: 0 };
          }
          // 保存线段的原始位置
          this.selectedDimensionLine.originalLeft = this.selectedDimensionLine.left;
          this.selectedDimensionLine.originalTop = this.selectedDimensionLine.top;
        }
        const canvas = this.canvas;
        canvas.on('object:moving', (e) => {
          const target = e.target;
          if (target.type === 'image') {
            if (this.snapEnabledA) {
              // 获取画布上所有的图片对象
              const allImages = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj !== target);
              allImages.forEach(img => {
                // 获取中心点
                const targetCenter = target.getCenterPoint();
                const imgCenter = img.getCenterPoint();
                // 计算中心点之间的距离
                const distanceX = targetCenter.x - imgCenter.x;
                const distanceY = targetCenter.y - imgCenter.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                // 设置吸附阈值
                const snapThreshold = 20; // 您可以根据需要调整此值
                // 检查是否应该吸附
                if (Math.abs(distanceY) < snapThreshold && Math.abs(distanceX) < snapThreshold) {
                  // 获取旋转角度
                  const radians = fabric.util.degreesToRadians(img.angle || 0);
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  // 计算吸附目标的左边缘位置
                  const imgLeftEdgeX = imgCenter.x - (img.getScaledWidth() / 2) * cos + (img.getScaledHeight() / 2) * sin;
                  const imgLeftEdgeY = imgCenter.y - (img.getScaledWidth() / 2) * sin - (img.getScaledHeight() / 2) * cos;
                  // 计算新位置
                  target.set({
                    left: imgLeftEdgeX - (target.getScaledWidth() / 2) * cos - (target.getScaledHeight() / 2) * sin,
                    top: imgLeftEdgeY - (target.getScaledWidth() / 2) * sin + (target.getScaledHeight() / 2) * cos,
                    angle: img.angle // 吸附时设置角度与吸附对象一致
                  });
                  target.setCoords(); // 更新对象的坐标
                }
              });
              this.canvas.renderAll(); // 更新和渲染画布
            }
            if (this.snapEnabledD) {
              // 获取画布上所有的图片对象
              const allImages = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj !== target);
              allImages.forEach(img => {
                // 获取中心点
                const targetCenter = target.getCenterPoint();
                const imgCenter = img.getCenterPoint();
                // 计算中心点之间的距离
                const distanceX = targetCenter.x - imgCenter.x;
                const distanceY = targetCenter.y - imgCenter.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                // 设置吸附阈值
                const snapThreshold = 20; // 您可以根据需要调整此值
                // 检查是否应该吸附
                if (Math.abs(distanceY) < snapThreshold && Math.abs(distanceX) < snapThreshold) {
                  // 获取旋转角度
                  const radians = fabric.util.degreesToRadians(img.angle || 0);
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  // 计算吸附对象的右边缘位置
                  const imgRightEdgeX = imgCenter.x + (img.getScaledWidth() / 2) * cos - (img.getScaledHeight() / 2) * sin;
                  const imgRightEdgeY = imgCenter.y + (img.getScaledWidth() / 2) * sin + (img.getScaledHeight() / 2) * cos;
                  // 计算新位置
                  target.set({
                    left: imgRightEdgeX + (target.getScaledWidth() / 2) * cos + (target.getScaledHeight() / 2) * sin,
                    top: imgRightEdgeY + (target.getScaledWidth() / 2) * sin - (target.getScaledHeight() / 2) * cos,
                    angle: img.angle // 吸附时设置角度与吸附对象一致
                  });
                  target.setCoords(); // 更新对象的坐标
                }
              });
              this.canvas.renderAll(); // 更新和渲染画布
            }
            if (this.snapEnabledS) {
              // 获取画布上所有的图片对象
              const allImages = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj !== target);
              allImages.forEach(img => {
                // 获取中心点
                const targetCenter = target.getCenterPoint();
                const imgCenter = img.getCenterPoint();
                // 计算中心点之间的距离
                const distanceX = targetCenter.x - imgCenter.x;
                const distanceY = targetCenter.y - imgCenter.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                // 设置吸附阈值
                const snapThreshold = 20; // 您可以根据需要调整此值
                // 检查是否应该吸附
                if (Math.abs(distanceY) < snapThreshold && Math.abs(distanceX) < snapThreshold) {
                  // 获取旋转角度
                  const radians = fabric.util.degreesToRadians(img.angle || 0);
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  // 计算吸附对象的上边缘位置
                  const imgTopEdgeX = imgCenter.x - (img.getScaledWidth() / 2) * cos - (img.getScaledHeight() / 2) * sin;
                  const imgTopEdgeY = imgCenter.y - (img.getScaledWidth() / 2) * sin + (img.getScaledHeight() / 2) * cos;
                  // 设置拖动对象的新位置
                  target.set({
                    left: imgTopEdgeX + (target.getScaledWidth() / 2) * cos - (target.getScaledHeight() / 2) * sin,
                    top: imgTopEdgeY + (target.getScaledWidth() / 2) * sin + (target.getScaledHeight() / 2) * cos,
                    angle: img.angle // 吸附时设置角度与吸附对象一致
                  });
                  target.setCoords(); // 更新对象的坐标
                }
              });
              this.canvas.renderAll(); // 更新和渲染画布
            }
            if (this.snapEnabledW) {
              // 获取画布上所有的图片对象
              const allImages = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj !== target);
              allImages.forEach(img => {
                // 获取中心点
                const targetCenter = target.getCenterPoint();
                const imgCenter = img.getCenterPoint();
                // 计算中心点之间的距离
                const distanceX = targetCenter.x - imgCenter.x;
                const distanceY = targetCenter.y - imgCenter.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                // 设置吸附阈值
                const snapThreshold = 20; // 您可以根据需要调整此值
                // 检查是否应该吸附
                if (Math.abs(distanceY) < snapThreshold && Math.abs(distanceX) < snapThreshold) {
                  // 获取旋转角度
                  const radians = fabric.util.degreesToRadians(img.angle || 0);
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  // 计算吸附对象的上边缘位置
                  const imgTopEdgeX = imgCenter.x + (img.getScaledWidth() / 2) * cos + (img.getScaledHeight() / 2) * sin;
                  const imgTopEdgeY = imgCenter.y + (img.getScaledWidth() / 2) * sin - (img.getScaledHeight() / 2) * cos;
                  // 设置拖动对象的新位置
                  target.set({
                    left: imgTopEdgeX - (target.getScaledWidth() / 2) * cos + (target.getScaledHeight() / 2) * sin,
                    top: imgTopEdgeY - (target.getScaledWidth() / 2) * sin - (target.getScaledHeight() / 2) * cos,
                    angle: img.angle // 吸附时设置角度与吸附对象一致
                  });
                  target.setCoords(); // 更新对象的坐标
                }
              });
              this.canvas.renderAll(); // 更新和渲染画布
            }
          }
          if (target.type === 'image' && target.parkingSpace) {
            this.renumberImages();
          }
          if (target.type === 'image' && target.associatedText) {
            // 获取图像的中心点
            const targetCenter = target.getCenterPoint();
            // 更新关联文本的位置，使其与图像中心对齐
            target.associatedText.set({
              left: targetCenter.x,
              top: targetCenter.y,
            });
            target.associatedText.setCoords(); // 更新文本对象的坐标系统
          }
          if (target.isDimensionLine && canvas.getActiveObjects().length === 1) {
            // 获取尺寸线的角度
            const angle = target.lineAngle;
            // 根据角度计算单位向量（沿线方向）
            const lineDirectionX = Math.cos(angle);
            const lineDirectionY = Math.sin(angle);
            // 计算移动向量
            const moveX = e.target.left - e.target.originalLeft;
            const moveY = e.target.top - e.target.originalTop;
            // 将移动向量投影到线的方向上
            const dotProduct = moveX * lineDirectionX + moveY * lineDirectionY;
            const projectedMoveX = dotProduct * lineDirectionX;
            const projectedMoveY = dotProduct * lineDirectionY;
            // 使用投影向量更新尺寸线的位置
            target.left = e.target.originalLeft + projectedMoveX;
            target.top = e.target.originalTop + projectedMoveY;
            // 更新尺寸线对象的原始位置
            target.originalLeft = e.target.left;
            target.originalTop = e.target.top;
            // 更新累积移动距离
            target.totalMove.x += projectedMoveX;
            target.totalMove.y += projectedMoveY;
            // 获取原始端点
            const originalPoints = target.originalPoints;
            if (originalPoints && originalPoints.length === 2) {
              // 删除现有的辅助线段
              const toBeRemoved = [];
              target.canvas.forEachObject(obj => {
                if (obj.auxiliaryLine === true && obj.dimensionLineId === target.dimensionLineId) {
                  toBeRemoved.push(obj);
                }
              });
              // 从画布中移除这些对象
              toBeRemoved.forEach(obj => {
                target.canvas.remove(obj);
              });
              // 清空线段数组
              target.dimensionLines = [];
              // 基于最新的位置重新创建线段
              originalPoints.forEach((point, index) => {
                const newX = point.x + target.totalMove.x;
                const newY = point.y + target.totalMove.y;
                const line = new fabric.Line([newX, newY, newX - target.totalMove.x, newY - target.totalMove.y], {
                  stroke: 'black',
                  selectable: false,
                  evented: false,
                  strokeWidth: 0.5,
                  isDimensionLine: true,
                  dimensionLineId: target.dimensionLineId,
                  auxiliaryLine: true,
                });
                target.canvas.add(line);
                target.dimensionLines.push(line); // 重新存储线段
              });
            }
            target.canvas.renderAll();
          }
        });
        // 当对象移动结束时，记录线段的最新端点坐标
        // this.canvas.on('object:modified', function (e) {
        //   const target = e.target;
        //   if (target.type === 'line') {
        //     console.log(`原始端点坐标: (${target.x1}, ${target.y1}), (${target.x2}, ${target.y2})`);
        //     // 计算线段中心点的原始坐标
        //     const originalCenterX = (target.x1 + target.x2) / 2;
        //     const originalCenterY = (target.y1 + target.y2) / 2;
        //     // 获取线段的当前边界
        //     const bbox = target.getBoundingRect();
        //     // 计算新的中心点坐标，基于边界的中心
        //     const newCenterX = bbox.left + bbox.width / 2;
        //     const newCenterY = bbox.top + bbox.height / 2;
        //     // 计算移动量
        //     const deltaX = newCenterX - originalCenterX;
        //     const deltaY = newCenterY - originalCenterY;
        //     // 应用移动量到端点坐标
        //     target.set({ x1: target.x1 + deltaX, y1: target.y1 + deltaY, x2: target.x2 + deltaX, y2: target.y2 + deltaY });
        //     // 更新对象的坐标系统
        //     target.setCoords();
        //     // 在控制台输出更新后的端点坐标
        //     console.log(`Updated line coordinates: (${target.x1}, ${target.y1}), (${target.x2}, ${target.y2})`);
        //   }
        // });
        // 添加尺寸线删除时的事件监听器
        this.canvas.on('object:removed', function (e) {
          const target = e.target;
          if (target.isDimensionLine && target.dimensionLines) {
            // 删除与尺寸线相关的所有线段
            target.dimensionLines.forEach(line => {
              target.canvas.remove(line);
            });
          }
        });
      }
      console.log("New selected image:", this.selectedImage); // 调试信息
    },
    updateImageOptions(attribute) {
      const optionsMap = {
        'signboardSvg': [
          { label: '看板タイプ 1', value: 'signboard1.drawio.svg' },
          { label: '看板タイプ 2', value: 'signboard2.drawio.svg' }
        ],
        'fullSkylight': [
          { label: '満空灯タイプ 1', value: 'Full-skylight1.drawio.svg' },
          { label: '満空灯タイプ 2', value: 'Full-skylight2.drawio.svg' }
        ],
        'telephonePole': [
          { label: '電柱タイプ 1', value: 'telephonepole1.drawio.svg' },
          { label: '電柱タイプ 2', value: 'telephonepole2.drawio.svg' }
        ],
        'cameraPole': [
          { label: 'カメラポールタイプ 1', value: 'camerapole1.drawio.svg' },
          { label: 'カメラポールタイプ 2', value: 'camerapole2.drawio.svg' }
        ],
        'paymentMachine': [
          { label: '精算機', value: 'paymentmachine1.drawio.svg' },
          { label: '精算看板', value: 'paymentmachine2.drawio.svg' }
        ],
        'iBarrierCar': [
          { label: 'Iバリカータイプ 1', value: 'Ibarriercar1.drawio.svg' },
          { label: 'Iバリカータイプ 2', value: 'Ibarriercar2.drawio.svg' }
        ],
        'uBarrierCar': [
          { label: 'Uバリカータイプ 1', value: 'Ubarriercar1.drawio.svg' },
          { label: 'Uバリカータイプ 2', value: 'Ubarriercar2.drawio.svg' }
        ],
        'lighting': [
          { label: '照明タイプ 1', value: 'lighting1.drawio.svg' },
          { label: '照明タイプ 2', value: 'lighting2.drawio.svg' }
        ],
        'controlBox': [
          { label: '制御ボックスタイプ 1', value: 'controlbox1.drawio.svg' },
          { label: '制御ボックスタイプ 2', value: 'controlbox2.drawio.svg' }
        ],
        'parkingSpace': [
          { label: '車室タイプ 1', value: 'parkingspace1.svg' },
          { label: '車室タイプ 2', value: 'parkingspace2.svg' },
        ],
        // 其他属性的相应选项...
      };
      this.imageOptions = optionsMap[attribute] || [
        { label: 'オプション', value: 'default.svg' } // 通用默认选项
      ];
    },
    handleImageRotation(event) {
      // 当用户按下Ctrl键或者选中的是多个对象时，不执行旋转吸附
      if (this.isCtrlPressed || event.target.type === 'activeSelection') {
        return;
      }
      // 设置旋转吸附角度
      const snapAngle = 15; // 你想要的吸附角度
      const target = event.target;
      target.angle = Math.round(target.angle / snapAngle) * snapAngle;
    },
    updateText() {
      if (this.selectedText) {
        this.selectedText.text = this.editText;
        this.canvas.renderAll();
        this.updateCanvasState();
      }
    },
    updateFontSize() {
      if (this.selectedText) {
        const fontSize = Math.round(Number(this.fontSizeInput));
        // 设置选中文本的字号大小
        this.selectedText.fontSize = fontSize;
        this.canvas.renderAll(); // 重新渲染画布以显示更新
        this.updateCanvasState();
      }
    },
    updateLine() {
      if (this.selectedLine) {
        // 更新线条的粗细
        this.selectedLine.strokeWidth = parseInt(this.lineWidth);
        this.selectedLine.originalStrokeWidth = this.selectedLine.strokeWidth; // 存储原始粗细
        // 更新线条的样式
        switch (this.lineStyle) {
          case 'dashed':
            this.selectedLine.set({ strokeDashArray: [10, 5] }); // 长虚线
            break;
          case 'dashedShort':
            this.selectedLine.set({ strokeDashArray: [0, 0] });
            break;
          case 'dotDashed':
            this.selectedLine.set({ strokeDashArray: [15, 2, 1, 2] }); // 点划线
            break;
          default:
            this.selectedLine.set({ strokeDashArray: null }); // 实线
        }
        // 请求渲染画布
        this.canvas.requestRenderAll();
        this.updateCanvasState();
      }
    },
    updateDimensionText() {
      if (this.selectedDimensionLine) {
        let textObject = this.getTextFromDimensionLine(this.selectedDimensionLine);
        if (textObject) {
          textObject.set('text', this.dimensionText);
          this.canvas.requestRenderAll();
        }
      }
      this.updateCanvasState();
    },
    getTextFromDimensionLine(dimensionLine) {
      let textObject = dimensionLine.getObjects().find(obj => obj.type === 'text');
      return textObject;
    },
    updateImage() {
      if (this.selectedImage) {
        if (this.selectedImage.parkingSpace) {
          this.updateparkingSpaceImage();
        } else if (this.selectedImage.signboardSvg) {
          this.updateSignboardSvgImage();
        } else if (this.selectedImage.fullSkylight) {
          this.updatefullSkylightImage();
        } else if (this.selectedImage.telephonePole) {
          this.updatetelephonePoleImage();
        } else if (this.selectedImage.cameraPole) {
          this.updatecameraPoleImage();
        } else if (this.selectedImage.paymentMachine) {
          this.updatepaymentMachineImage();
        } else if (this.selectedImage.iBarrierCar) {
          this.updateiBarrierCarImage();
        } else if (this.selectedImage.uBarrierCar) {
          this.updateuBarrierCarImage();
        } else if (this.selectedImage.lighting) {
          this.updatelightingImage();
        } else if (this.selectedImage.controlBox) {
          this.updatecontrolBoxImage();
        }
      }
      this.updateCanvasState();
    },
    updateSignboardSvgImage() {
      this.updateImageWithCustomLogic('signboardSvg');
    },
    updatefullSkylightImage() {
      this.updateImageWithCustomLogic('fullSkylight');
    },
    updatetelephonePoleImage() {
      this.updateImageWithCustomLogic('telephonePole');
    },
    updatecameraPoleImage() {
      this.updateImageWithCustomLogic('cameraPole');
    },
    updatepaymentMachineImage() {
      this.updateImageWithCustomLogic('paymentMachine');
    },
    updateiBarrierCarImage() {
      this.updateImageWithCustomLogic('iBarrierCar');
    },
    updateuBarrierCarImage() {
      this.updateImageWithCustomLogic('uBarrierCar');
    },
    updatelightingImage() {
      this.updateImageWithCustomLogic('lighting');
    },
    updatecontrolBoxImage() {
      this.updateImageWithCustomLogic('controlBox');
    },
    updateparkingSpaceImage() {
      this.updateImageWithCustomLogic('parkingSpace');
    },
    updateImageWithCustomLogic() {
      try {
        // 使用 imagesContext 来动态加载图像
        const newImageUrl = this.imagesContext('./' + this.selectedImageUrl);
        // 获取原始图片的属性
        const originalProps = {
          left: this.selectedImage.left,
          top: this.selectedImage.top,
          scaleX: this.selectedImage.scaleX,
          scaleY: this.selectedImage.scaleY,
          angle: this.selectedImage.angle,
          width: this.selectedImage.width,
          height: this.selectedImage.height,
        };
        // 更新图片源
        this.selectedImage.setSrc(newImageUrl, () => {
          // 应用通用的图像更新逻辑
          this.applyImageUpdateLogic(originalProps);
        }, {
          crossOrigin: 'anonymous' // 根据需要设置跨域
        });
      } catch (error) {
        console.error("画像の読み込みに失敗しました:", error);
      }
    },
    resizeImage() {
      // 检查输入的宽度和高度是否合理
      if (this.imageWidth <= 0 || this.imageHeight <= 0) {
        alert('有効なサイズを入力してください！'); // 请输入有效的尺寸！
        return;
      }
      // 检查是否有选中的图片
      if (!this.selectedImage) {
        alert('選択された画像がありません！'); // 没有选中的图片！
        return;
      }
      // 获取原始图片的属性
      const originalProps = {
        left: this.selectedImage.left,
        top: this.selectedImage.top,
        scaleX: this.selectedImage.scaleX,
        scaleY: this.selectedImage.scaleY,
        angle: this.selectedImage.angle
      };
      // 计算新的缩放比例
      // 从 Vuex 获取 scale_fix
      const scaleFix = this.$store.state.canvas.scaleFix / 2.5;
      const newScaleX = (this.imageWidth / scaleFix) / this.selectedImage.width;
      const newScaleY = (this.imageHeight / scaleFix) / this.selectedImage.height;
      // 更新图片的尺寸
      this.selectedImage.set({
        scaleX: newScaleX,
        scaleY: newScaleY,
        left: originalProps.left,
        top: originalProps.top,
        angle: originalProps.angle
      });
      // 刷新 canvas 或者其他相关组件来显示更新后的图片
      this.canvas.renderAll(); // 如果你使用 fabric.js 的 canvas
      this.updateCanvasState();
    },
    // 应用图像更新逻辑的辅助方法
    applyImageUpdateLogic(originalProps) {
      this.selectedImage.set({ angle: 0 });
      // 计算新的缩放比例
      const newScaleX = originalProps.width / this.selectedImage.width;
      const newScaleY = originalProps.height / this.selectedImage.height;
      this.selectedImage.set({
        left: originalProps.left,
        top: originalProps.top,
        scaleX: newScaleX * this.selectedImage.scaleX,
        scaleY: newScaleY * this.selectedImage.scaleY,
        angle: originalProps.angle
      });
      this.selectedImage.setCoords();
      this.canvas.renderAll();
    },
    // 不可移動尺寸綫
    handleSelection(event) {
      let selection = this.canvas.getActiveObject();
      if (!selection) {
        console.log("No active selection.");
        return;
      }
      if (selection.type === 'activeSelection' || selection.type === 'group') {
        let items = selection.getObjects();
        let dimensionLines = items.filter(item => item.isDimensionLine);
        if (dimensionLines.length > 0) {
          dimensionLines.forEach(line => {
            selection.removeWithUpdate(line);
          });
          if (selection.getObjects().length === 0) {
            this.canvas.discardActiveObject();
          } else {
            selection.setCoords();
          }
          this.canvas.requestRenderAll();
        }
      }
    },
  },
};