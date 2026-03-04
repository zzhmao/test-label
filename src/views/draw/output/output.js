import { fabric } from "fabric";
import signboardSvg from "@/assets/draw/signboard1.drawio.svg";
import fullSkylight from "@/assets/draw/Full-skylight1.drawio.svg";
import telephonePole from "@/assets/draw/telephonepole1.drawio.svg";
import cameraPole from "@/assets/draw/camerapole1.drawio.svg";
import paymentMachine from "@/assets/draw/paymentmachine1.drawio.svg";
import iBarrierCar from "@/assets/draw/Ibarriercar1.drawio.svg";
import uBarrierCar from "@/assets/draw/Ubarriercar1.drawio.svg";
import lighting from "@/assets/draw/lighting1.drawio.svg";
import controlBox from "@/assets/draw/controlbox1.drawio.svg";
import parkingSpaceSvg from "@/assets/draw/parkingspace1.svg";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import '@/assets/fonts/MyJapaneseFont.js';
import drawingTools from './drawingTools.js';
import Propertybar from './Propertybar.js';
import park4d from "@/assets/park4d2.png";

export default {
  name: "NewPage",
  mixins: [drawingTools, Propertybar],
  data() {
    return {
      isCollapsed: false, // 默认显示侧边栏
      canvas: null,
      carroomInput: "",
      textInput: "", // 用于绑定输入框的数据
      isDrawingLine: false,
      linePoints: [],
      isDrawingDimensionLine: false,
      dimensionLinePoints: [],
      previewLine: null, // 用于预览的线条
      selectedLine: null, // 存储当前选中的线条
      lineWidth: "1",// 存储线条粗细，默认为1
      lineStyle: null, // 默认为实线
      selectedDimensionLine: null,
      selectedImage: null,
      dimensionText: '',
      selectedImageUrl: '', // 绑定到下拉选择框的属性
      currentImageOptions: [], // 当前显示的图像选项
      imagesContext: require.context('@/assets/draw/', false, /\.svg$/), // 创建图像的上下文
      imageOptions: [],
      isScaled: false,
      isBackgroundVisible: true, // 初始时背景可见
      backgroundImage: null,
      snapCircle: null, // 用于显示吸附点的临时圆
      isCtrlPressed: false,
      imageWidth: 0,
      imageHeight: 0,
      canvasState: [],         // 用于存储画布状态的历史记录
      stateIndex: -1,          // 指示当前画布状态在 canvasState 数组中的位置
      isLoadCanvas: false,
      selectedText: null, // 用于追踪当前选中的文本对象
      editText: '',       // 绑定到文本输入框的数据
      isAKeyPressed: false,
      fontSizeInput: '50',
      space: 0,
      spaceTextObj: null,
      road: false, // 开关
      addCount: 0, // 添加对象的次数
    };
  },
  mounted() {
    // 画布初始化
    this.canvas = new fabric.Canvas('new-canvas', {
      preserveObjectStacking: true,
      targetFindTolerance: 10,
      selection: true,
      selectionFullyContained: true
    });
    // 设置画布上对象的初始状态
    this.canvas.forEachObject(obj => {
      obj.originalScaleX = obj.scaleX;
      obj.originalScaleY = obj.scaleY;
      obj.originalLeft = obj.left;
      obj.originalTop = obj.top;
    });
    // 绑定事件
    this.bindCanvasEvents();
    // 添加缩放和平移功能
    this.addCanvasScalingAndPanning();
    // 设置背景和内容
    this.renderCanvasBackground().then(() => {
      // 可能的回调或其他操作
      this.renderCanvasContent();
    }).catch((error) => {
      console.error("Error setting up canvas:", error);
    });
    // 监听键盘事件
    this.bindKeyboardEvents();
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.canvas.on('selection:created', (e) => this.handleSelection(e));
    this.canvas.on('selection:updated', (e) => this.handleSelection(e));
  },
  beforeDestroy() {
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  },
  methods: {
    // 複製
    copySelectedObject() {
      const activeObject = this.canvas.getActiveObject();
      if (!activeObject) {
        alert('まずはオブジェクトを選択してください!');
        return;
      }
      // 复制选中对象
      activeObject.clone((clonedObj) => {
        this.canvas.discardActiveObject(); // 取消当前对象的选中状态
        const copyCustomProperties = (sourceObj, targetObj) => {
          // 列出所有可能的自定义属性
          const customProps = [
            'parkingSpace', 'signboardSvg', 'fullSkylight', 'telephonePole',
            'cameraPole', 'paymentMachine', 'iBarrierCar', 'uBarrierCar',
            'lighting', 'controlBox',
          ];
          // 遍历每个属性并复制
          customProps.forEach(prop => {
            if (sourceObj[prop] !== undefined) {
              targetObj[prop] = sourceObj[prop];
            }
          });
          // 特殊处理: 如果有parkingSpace属性，绑定scaling事件
          if (targetObj.parkingSpace && targetObj.type === 'image') {
            targetObj.on('scaling', function () {
              this.set({
                lockScalingX: true,
                lockScalingY: true,
                snapAngle: 5,
              });
            });
          }
        };
        // 应用自定义属性的复制
        copyCustomProperties(activeObject, clonedObj);
        clonedObj.set({
          left: clonedObj.left + 10,
          top: clonedObj.top + 10,
          evented: true,
        });
        if (clonedObj.type === 'activeSelection') {
          // 处理多个对象的复制
          clonedObj.canvas = this.canvas;
          clonedObj.forEachObject((obj, index) => {
            this.canvas.add(obj);
            const originalObj = activeObject.getObjects()[index];
            copyCustomProperties(originalObj, obj);
          });
          clonedObj.setCoords();
          this.associateTextWithParkingSpaces();
        } else {
          this.canvas.add(clonedObj);
          if (clonedObj.parkingSpace && clonedObj.type === 'image') {
            const allParkingSpaces = this.canvas.getObjects().filter(obj => obj['parkingSpace']);
            const newParkingSpaceNumber = allParkingSpaces.length; // 当前parkingSpace的数量作为新编号
            this.space = allParkingSpaces.length; // 更新space为当前最大编号
            // 创建编号文本
            const fontSize = Math.round(1250 / this.$store.state.canvas.scaleFix) * 2.5;
            console.log(fontSize); // 输出计算后的字体大小
            const text = new fabric.Text(String(newParkingSpaceNumber), {
              left: clonedObj.left,
              top: clonedObj.top,
              fontSize: 20,
              fill: '#000',
              originX: 'center',
              originY: 'center',
              lockScalingX: true,
              lockScalingY: true,
              selectable: true, // 禁止选择
              evented: false, // 禁止事件（如点击事件）
              isNumber: true,
            });
            // 添加编号文本到画布
            this.canvas.add(text);
            clonedObj.associatedText = text; // 更新关联属性
          }
        }
        const allParkingSpaces = this.canvas.getObjects().filter(obj => obj.parkingSpace);
        this.space = allParkingSpaces.length; // 更新space为当前最大编号
        // 如果spaceTextObj存在，更新其显示的值
        if (this.spaceTextObj) {
          this.spaceTextObj.set('text', this.space.toString());
          this.canvas.requestRenderAll(); // 重新渲染画布以显示更新后的内容
        }
        this.canvas.setActiveObject(clonedObj); // 设置复制的对象为选中状态
        this.canvas.requestRenderAll();
        this.updateCanvasState(); // 确保更新画布状态的方法存在
      });
      this.renumberImages();
    },
    associateTextWithParkingSpaces() {
      // 获取所有图像对象，这里改为只针对具有parkingSpace属性的图像
      const parkingSpaceImages = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj.parkingSpace);
      // 获取所有文本对象
      const texts = this.canvas.getObjects().filter(obj => obj.type === 'text');
      // 清除之前的关联，防止重复
      parkingSpaceImages.forEach(image => {
        delete image.associatedText;
      });
      // 为每个具有parkingSpace属性的图像尝试找到一个匹配的文本
      parkingSpaceImages.forEach((img) => {
        const imgCenter = img.getCenterPoint();
        texts.forEach((text) => {
          const textCenter = text.getCenterPoint();
          // 使用较宽松的匹配条件来判断是否关联图像和文本
          if (Math.abs(imgCenter.x - textCenter.x) < 1 && Math.abs(imgCenter.y - textCenter.y) < 1) {
            // 关联文本到图像
            img.associatedText = text;
            text.set({
              selectable: false,
              evented: false,
            });
          }
        });
      });
      this.renumberImages();
    },
    addCanvasScalingAndPanning() {
      // 缩放功能
      this.canvas.on("mouse:wheel", (opt) => {
        if (opt.e.shiftKey) {
          var delta = opt.e.deltaY;
          var zoom = this.canvas.getZoom();
          zoom *= 0.999 ** delta;
          if (zoom > 5) zoom = 5;
          if (zoom < 0.4) zoom = 0.4;
          this.canvas.setZoom(zoom);
          this.canvas.setWidth(2100 * zoom);
          this.canvas.setHeight(1485 * zoom);
          this.canvas.forEachObject((obj) => {
            if (obj.type === "line" && !obj.isDimensionLine) {
              // 使用原始粗细乘以缩放因子
              var originalStrokeWidth = obj.originalStrokeWidth || 1;
              obj.strokeWidth = originalStrokeWidth / zoom;
            }
          });
          this.canvas.requestRenderAll();
          opt.e.preventDefault();
          opt.e.stopPropagation();
        }
      });
    },
    bindKeyboardEvents() {
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
          this.isCtrlPressed = true;
          if (this.snapCircle) {
            this.canvas.remove(this.snapCircle);
            this.snapCircle = null;
            this.canvas.renderAll();
          }
        } else {
          // 检测方向键并移动选中对象
          this.moveSelectedObjectWithArrowKeys(e);
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === "Control") {
          this.isCtrlPressed = false;
        }
      });
    },
    // 新添加的方法来处理方向键移动
    moveSelectedObjectWithArrowKeys(e) {
      const selectedObject = this.canvas.getActiveObject();
      if (!selectedObject) {
        return;
      }
      const movementDistance = 1; // 可以根据需要调整移动距离
      let moved = false;
      switch (e.keyCode) {
        case 37: // 左箭头
          selectedObject.left -= movementDistance;
          moved = true;
          break;
        case 38: // 上箭头
          selectedObject.top -= movementDistance;
          moved = true;
          break;
        case 39: // 右箭头
          selectedObject.left += movementDistance;
          moved = true;
          break;
        case 40: // 下箭头
          selectedObject.top += movementDistance;
          moved = true;
          break;
      }
      if (moved) {
        selectedObject.setCoords();
        // 如果被移动的对象是图像并且有关联的文本
        if (selectedObject.type === 'image' && selectedObject.associatedText) {
          // 获取图像的中心点
          const targetCenter = selectedObject.getCenterPoint();
          // 更新关联文本的位置，使其与图像中心对齐
          selectedObject.associatedText.set({
            left: targetCenter.x,
            top: targetCenter.y,
          });
          selectedObject.associatedText.setCoords(); // 更新文本对象的坐标系统
        }
        this.canvas.renderAll();
        this.updateCanvasState();
      }
    },
    bindCanvasEvents() {
      // 绑定撤销和恢复功能的事件监听器
      this.canvas.on('object:modified', () => this.updateCanvasState());
      // 绑定其他事件监听器
      this.canvas.on('selection:created', this.handleObjectSelected);
      this.canvas.on('selection:updated', this.handleObjectSelected);
    },
    updateCanvasState() {
      if (this.isLoadCanvas || this.isUndoingOrRedoing) {
        return; // 如果正在加载画布状态或正在执行undo/redo，则不执行更新
      }
      const canvasAsJson = this.canvas.toJSON([
        'background',
        'isRoad',
        'dimensionLines',
        'parkingSpace',
        'isDimensionLine',
        'isSpaceText',
        'isform',
        'isNumber',
        'dimensionLineId',
        'auxiliaryLine',
        'signboardSvg',
        'fullSkylight',
        'telephonePole',
        'cameraPole',
        'paymentMachine',
        'iBarrierCar',
        'uBarrierCar',
        'lighting',
        'controlBox',
        'selectable',
        'evented',
        'lineAngle',
        'originalPoints',
        'originalStartPoint',
        'originalEndPoint',
        'lockScalingX',
        'lockScalingY',
        'lockRotation',
        'totalMove',]);
      this.canvasState.splice(this.stateIndex + 1);
      this.canvasState.push(JSON.stringify(canvasAsJson));
      this.stateIndex++;
    },
    loadCanvasState() {
      this.isLoadCanvas = true;
      this.canvas.loadFromJSON(this.canvasState[this.stateIndex], () => {
        // 在设置属性之前，先寻找所有图像和文本的匹配对
        const images = this.canvas.getObjects().filter(obj => obj.type === 'image');
        const texts = this.canvas.getObjects().filter(obj => obj.type === 'text');
        // 清除之前的关联，防止重复
        images.forEach(image => {
          delete image.associatedText;
        });
        // 为每个图像尝试找到一个匹配的文本
        images.forEach((img) => {
          const imgCenter = img.getCenterPoint();
          texts.forEach((text) => {
            const textCenter = text.getCenterPoint();
            if (Math.abs(imgCenter.x - textCenter.x) < 1 && Math.abs(imgCenter.y - textCenter.y) < 1) {
              // 关联文本到图像
              img.associatedText = text;
            }
          });
        });
        this.canvas.getObjects().forEach((obj) => {
          if (obj.background === true) {
            obj.set({
              selectable: false,
              evented: false,
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false,
              hasBorders: false
            });
          } else if (obj.isDimensionLine === true) {
            obj.set({
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false,
              hasBorders: false,
            });
          } else if (obj.parkingSpace === true) {
            obj.set({
              lockScalingX: true,
              lockScalingY: true,
            });
          } else if (obj.isSpaceText === true) {
            // 根据自定义属性恢复this.spaceTextObj的引用
            this.spaceTextObj = obj;
          } else if (obj.isNumber === true) {
            obj.set({
              selectable: true,
              evented: false,
            });
          } else if (obj.type === 'group') {
            obj.on('scaling', function () {
              let minScale = Math.min(this.scaleX, this.scaleY);
              this.set({ scaleX: minScale, scaleY: minScale });
            });
          } else if (obj.type === 'line') {
            obj.set({
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false, // 禁用控制点
            });
          } else if (obj.type === 'text') {
            obj.set({
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true, // 也禁用旋转
              hasControls: false, // 禁用控制点
            });
          }
        });
        this.canvas.renderAll();
        this.isLoadCanvas = false;
      });
    },
    undo() {
      if (this.stateIndex > 0) {
        this.isUndoingOrRedoing = true;
        this.stateIndex--;
        this.loadCanvasState();
        this.isUndoingOrRedoing = false;
      }
    },
    redo() {
      if (this.stateIndex < this.canvasState.length - 1) {
        this.isUndoingOrRedoing = true;
        this.stateIndex++;
        this.loadCanvasState();
        this.isUndoingOrRedoing = false;
      }
    },
    renderCanvasBackground() {
      return new Promise((resolve, reject) => {
        if (!this.canvas) {
          reject(new Error("Canvas is not initialized."));
          return;
        }
        // 创建一个临时的canvas元素
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        let ctx = tempCanvas.getContext('2d');
        // 设置边框属性
        const borderWidth = 1;
        const left = 20;
        const top = 20;
        const width = this.canvas.width - 40;
        const height = this.canvas.height - 40;
        // 在临时canvas上绘制矩形
        ctx.strokeStyle = 'black';
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(left, top, width, height);
        // 将临时canvas转换为图像
        let backgroundImageUrl = tempCanvas.toDataURL();
        // 清除画布上的现有对象
        this.canvas.clear();
        // 将图像设置为Fabric画布的背景
        this.canvas.setBackgroundImage(backgroundImageUrl, () => {
          this.canvas.renderAll();
          resolve();
        }, {
          originX: 'left',
          originY: 'top',
          width: this.canvas.width,
          height: this.canvas.height,
          crossOrigin: 'anonymous'
        });
        // 清理临时canvas
        tempCanvas = null;
      });
    },
    renderCanvasContent() {
      return new Promise((resolve, reject) => {
        const canvasContent = this.$store.state.canvas.canvasContent;
        // 从 Vuex 获取 scaleFix 和 border 数据，并将其放大2.5倍
        const scaleFix = this.$store.state.canvas.scaleFix;
        const borderData = this.$store.state.canvas.border.map(borderItem => ({
          ...borderItem,
          position: borderItem.position.map(value => value * 2.5)
        }));
        const selectedArea = JSON.parse(JSON.stringify(this.$store.state.canvas.selectedArea));
        console.log("获取的 selectedArea 数据：", selectedArea);
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, "/"); // 格式为 "YYYY/MM/DD"
        if (canvasContent) {
          this.canvas.loadFromJSON(canvasContent, () => {
            const images = this.canvas.getObjects().filter(obj => obj.type === 'image');
            const texts = this.canvas.getObjects().filter(obj => obj.type === 'text');
            // 为具有 parkingSpace 属性的图像创建和绑定编号
            images.forEach((img) => {
              if (img.parkingSpace) {
                const imgCenter = img.getCenterPoint();
                texts.forEach((text) => {
                  const textCenter = text.getCenterPoint();
                  if (Math.abs(imgCenter.x - textCenter.x) < 1 && Math.abs(imgCenter.y - textCenter.y) < 1) {
                    // 将text关联到img上
                    img.associatedText = text;
                  }
                });
              }
            });
            this.canvas.getObjects().forEach(obj => {
              if (obj.type === 'image' && obj.parkingSpace) {
                obj.parkingSpace = true;
                obj.set({
                  lockScalingX: true,
                  lockScalingY: true,
                  snapAngle: 5,
                });
                // 标记为parkingSpace的图像被添加或存在时，更新最大编号
                const allParkingSpaces = this.canvas.getObjects().filter(obj => obj.parkingSpace);
                this.space = allParkingSpaces.length; // 更新space为当前最大编号
                // 如果spaceTextObj存在，则更新其显示的值
                if (this.spaceTextObj) {
                  this.spaceTextObj.set('text', this.space.toString());
                  this.canvas.requestRenderAll(); // 重新渲染画布以显示更新后的内容
                }
              } else if (obj.type === 'line') {
                obj.set({
                  stroke: 'black',
                  lockMovementX: true,
                  lockMovementY: true,
                  lockScalingX: true,
                  lockScalingY: true,
                  lockRotation: true,
                });
              } else if (obj.type === 'text') {
                obj.isNumber = true;
                // 设置文本对象为不可交互和不可选中
                obj.set({
                  selectable: true, // 禁止选择
                  evented: false, // 禁止事件（如点击事件）
                });
              }
            });
            // 创建矩形和线条对象
            const rects = [
              { left: 0, top: 0, width: 400, height: 60 },
              { left: 400, top: 0, width: 720, height: 60 },
              { left: 0, top: 60, width: 400, height: 60 },
              { left: 400, top: 60, width: 720, height: 60 },
              { left: 400, top: 0, width: 120, height: 60 },
              { left: 520, top: 0, width: 120, height: 60 },
              { left: 640, top: 0, width: 120, height: 60 },
              { left: 760, top: 0, width: 120, height: 60 },
              { left: 880, top: 0, width: 120, height: 60 }
            ];
            let shapes = [];
            rects.forEach(rectProps => {
              var rect = new fabric.Rect({
                left: rectProps.left + 40, // 向右移动50个像素
                top: rectProps.top + (this.canvas.height - 120) - 40, // 向上移动50个像素
                fill: 'transparent',
                width: rectProps.width,
                height: rectProps.height,
                stroke: 'black',
                strokeWidth: 1
              });
              shapes.push(rect);
            });
            // 创建线条
            var line = new fabric.Line([400 + 40, 30, 1120 + 40, 30], {
              fill: 'none',
              stroke: 'black',
              strokeWidth: 1,
              top: (this.canvas.height - 130)
            });
            shapes.push(line);
            // 创建和添加文本对象
            const textsAbove = ["DATE", "SCALE", "SPACE", "CHECK", "DRAWN", "NO."];
            const textsBelow = [currentDate, `1/${scaleFix * 2}`, this.space.toString(), "CHECK", "DRAWN", "NO."];
            const segmentLength = (line.x2 - line.x1) / 6;
            const textObjects = [];
            textsAbove.forEach((text, index) => {
              const textObjAbove = new fabric.Text(text, {
                left: line.x1 + segmentLength * index + segmentLength / 2 - 55,
                top: line.top + line.strokeWidth - 2 + 2,
                fontSize: 25,
                originY: 'bottom',
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                isform: true,
              });
              this.canvas.add(textObjAbove);
              textObjects.push(textObjAbove);
            });
            textsBelow.forEach((text, index) => {
              const textObjBelow = new fabric.Text(text, {
                left: line.x1 + segmentLength * index + segmentLength / 2 - 55,
                top: line.top + line.strokeWidth + 2 + 0,
                fontSize: 25,
                originY: 'top',
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true
              });
              this.canvas.add(textObjBelow);
              textObjects.push(textObjBelow);
              // 特别地，对于包含this.space值的文本对象，将其保存到this.spaceTextObj中
              if (index === 2) { // 假设"SPACE"对应的值位于textsBelow数组的第三个位置
                this.spaceTextObj = textObjBelow;
                textObjBelow.isSpaceText = true;
              }
            });
            // 创建群组
            var group = new fabric.Group(shapes, {
              sheet: true,
              selectable: false,
              evented: false,
              background: true,
            });
            group.on('scaling', function () {
              let minScale = Math.min(group.scaleX, group.scaleY);
              group.set({ scaleX: minScale, scaleY: minScale });
              textObjects.forEach(textObj => {
                // 更新文本位置的逻辑
                // 根据 group 的位置和缩放比例来调整文本位置
              });
            });
            group.set({ lockRotation: true });
            this.canvas.add(group);
            // 在群组上方 2px 添加文本
            const groupBoundingRect = group.getBoundingRect();
            const textAboveGroup = new fabric.Text('※現地寸法と相違が有る場合は、レイアウト・車室数が変更になる場合が有ります。', {
              left: 200,
              top: 1290,
              fontSize: 25,
              lockRotation: true,
              lockScalingX: true,
              lockScalingY: true,
              selectable: false,
              evented: false,
              background: true,
            });
            this.canvas.add(textAboveGroup);
            // 处理边界线
            borderData.forEach(borderItem => {
              const line = new fabric.Line(borderItem.position, {
                fill: 'black',
                stroke: 'black',
                strokeWidth: 1,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                hasControls: false, // 禁用控制点
                strokeDashArray: borderItem.type === 'road' ? [10] : null,
                isRoad: borderItem.type === 'road' // 根据是否是'road'类型来赋予isRoad属性
              });
              this.canvas.add(line);
            });
            textObjects.forEach(textObj => {
              this.canvas.bringToFront(textObj);
            });
            // 添加边框
            const borderWidth = 1; // 边框的宽度
            const border = new fabric.Rect({
              background: true,
              left: 20,
              top: 20,
              width: this.canvas.width - 40,
              height: this.canvas.height - 40,
              fill: 'transparent',
              stroke: 'black',
              strokeWidth: borderWidth,
              selectable: false, // 设置为不可选中
              evented: false, // 不响应任何事件
            });
            this.canvas.add(border);
            fabric.Image.fromURL(park4d, (img) => {
              // 应用灰度过滤器
              img.filters.push(new fabric.Image.filters.Grayscale());
              // 应用过滤器并重新渲染图像
              img.applyFilters();
              // 计算宽度以保持图片的宽高比
              let scaleFactor = 150 / img.height;
              let imageWidth = img.width * scaleFactor;
              // 设置图片属性
              img.set({
                left: this.canvas.width - imageWidth - 40,
                top: this.canvas.height - 180,
                scaleX: scaleFactor,
                scaleY: scaleFactor,
                selectable: false,
                evented: false,
                background: true,
              });
              // 添加等比例缩放的事件处理器
              img.on('scaling', function () {
                const scaleX = this.scaleX;
                const scaleY = this.scaleY;
                const minScale = Math.min(scaleX, scaleY);
                this.set({
                  scaleX: minScale,
                  scaleY: minScale
                });
              });
              // 将图片添加到画布上
              this.canvas.add(img);
              this.updateCanvasState();
            });
            // if (selectedArea && selectedArea.length > 0) {
            //   selectedArea.forEach(areaObject => {
            //     if (areaObject && areaObject.center && areaObject.center.length >= 2) {
            //       // 根据 areaObject 创建和添加图像
            //       const centerX = areaObject.center[0];
            //       const centerY = areaObject.center[1];
            //       const imageWidth = 2500 / scaleFix; // 使用 scaleFix 调整宽度
            //       const imageHeight = 5000 / scaleFix; // 使用 scaleFix 调整高度
            //       const angleInDegrees = areaObject.angle * 360; // 将角度值转换为度
            //       fabric.Image.fromURL(parkingSpaceSvg, (oImg) => {
            //         oImg.set({
            //           left: centerX,
            //           top: centerY,
            //           scaleX: imageWidth / oImg.width,
            //           scaleY: imageHeight / oImg.height,
            //           angle: angleInDegrees,
            //           selectable: false,
            //           originX: "center",
            //           originY: "center",
            //         });
            //         // 新增: 设置 parkingSpace 属性
            //         oImg.parkingSpace = true;
            //         // 新增: 定义缩放事件处理
            //         oImg.on('scaling', function() {
            //           const minScale = Math.min(this.scaleX, this.scaleY);
            //           this.set({ scaleX: minScale, scaleY: minScale });
            //         });                  
            //         this.canvas.add(oImg);
            //       }, { crossOrigin: "anonymous" });
            //     }
            //   });
            // }   
            this.canvas.requestRenderAll();
          }, function (o, object) {
            // 恢复自定义属性
            if (o.parkingSpace) {
              object.parkingSpace = o.parkingSpace;  // 恢复 parkingSpace 属性
            }
          });
        } else {
          resolve();
        }
      });
    },
    handleKeyDown(event) {
      // 检查按下的键是否是 'Delete'
      if (event.key === 'Delete') {
        this.removeSelectedObject();
      }
      if (event.key === 'a') {
        this.snapEnabledA = true;
      }
      if (event.key === 's') {
        this.snapEnabledS = true;
      }
      if (event.key === 'd') {
        this.snapEnabledD = true;
      }
      if (event.key === 'w') {
        this.snapEnabledW = true;
      }
      // 检查按下的键是否是 'Escape'（ESC键）
      if (event.key === 'Escape') {
        if (this.canvas) {
          this.canvas.discardActiveObject();
          this.canvas.requestRenderAll();
        }
      }
      // 添加 Ctrl+Z 触发 undo 功能
      if (event.ctrlKey && event.key === 'z') {
        // 调用 undo 方法
        this.undo();
      }
      // 添加 Ctrl+Y 触发 redo 功能
      if (event.ctrlKey && event.key === 'y') {
        // 调用 redo 方法
        this.redo();
      }
      // 添加 Ctrl+C 触发 copySelectedObject 功能
      if (event.ctrlKey && event.key === 'c') {
        // 调用 copySelectedObject 方法
        this.copySelectedObject();
      }
    },
    handleKeyUp(event) {
      if (event.key === 'a') {
        this.snapEnabledA = false;
      }
      if (event.key === 's') {
        this.snapEnabledS = false;
      }
      if (event.key === 'd') {
        this.snapEnabledD = false;
      }
      if (event.key === 'w') {
        this.snapEnabledW = false;
      }
    },
    removeSelectedObject() {
      // 删除选定的对象
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        if (activeObject.type === 'image' && activeObject.parkingSpace && activeObject.associatedText) {
          // 只有当删除的是带有parkingSpace属性的图像对象时才更新编号
          const deletedIndex = parseInt(activeObject.associatedText.text); // 获取被删除图像的当前编号
          this.canvas.remove(activeObject.associatedText); // 删除关联的文本
          this.canvas.remove(activeObject); // 删除图像
          this.canvas.discardActiveObject(); // 取消选择任何对象
          this.canvas.requestRenderAll(); // 更新画布
          // 获取所有图像对象并按编号顺序排序
          const imageObjects = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj.parkingSpace && obj.associatedText)
            .sort((a, b) => parseInt(a.associatedText.text) - parseInt(b.associatedText.text));
          // 更新删除对象之后的图像编号
          imageObjects.forEach((img) => {
            const currentIndex = parseInt(img.associatedText.text);
            if (currentIndex > deletedIndex) { // 只处理被删除对象之后的对象
              img.associatedText.text = String(currentIndex - 1); // 更新编号，填补被删除的编号空缺
            }
          });
          // 更新space为当前最大编号
          this.space = imageObjects.length ? parseInt(imageObjects[imageObjects.length - 1].associatedText.text) : 0;
          // 如果spaceTextObj存在，则更新其显示的值
          if (this.spaceTextObj) {
            this.spaceTextObj.set('text', this.space.toString());
            this.canvas.requestRenderAll(); // 重新渲染画布以显示更新后的内容
          }
        } else {
          // 对于其他所有对象，应用基础的删除逻辑
          this.canvas.remove(activeObject);
          this.canvas.discardActiveObject(); // 取消选择任何对象
        }
        this.canvas.requestRenderAll(); // 重新渲染画布
        // 更新画布状态的其它操作
        this.updateCanvasState();
      }
    },
    renumberImages() {
      const imageObjects = this.canvas.getObjects().filter(obj => obj.type === 'image' && obj.parkingSpace);
      // 首先对图像进行排序，基于图像中心点的x坐标
      const sortedImages = imageObjects.sort((a, b) => {
        const centerA = a.getCenterPoint();
        const centerB = b.getCenterPoint();
        return centerA.x - centerB.x;
      });
      // 定义计算欧几里得距离的函数，此处基于图像的中心点来计算
      const calcDistance = (centerA, centerB) => {
        return Math.sqrt(Math.pow(centerA.x - centerB.x, 2) + Math.pow(centerA.y - centerB.y, 2));
      };
      const threshold = 7500 / this.$store.state.canvas.scaleFix; // 统一使用与提供代码相同的阈值
      console.log("Threshold:", threshold); // 打印阈值
      let groups = []; // 存放分组后的图像
      sortedImages.forEach(img => {
        const imgCenter = img.getCenterPoint(); // 获取当前图像的中心点
        let addedToGroup = false;
        for (let group of groups) {
          // 检查当前图像是否与分组中任一图像的中心点距离小于阈值
          if (group.some(member => {
            const memberCenter = member.getCenterPoint(); // 获取分组中成员的中心点
            return calcDistance(imgCenter, memberCenter) < threshold;
          })) {
            group.push(img);
            addedToGroup = true;
            break;
          }
        }
        // 如果当前图像与现有所有组的成员中心点距离都不小于阈值，创建新的组
        if (!addedToGroup) {
          groups.push([img]);
        }
      });
      // 对每个分组内的图像再次根据中心点的X坐标进行排序，如果X相同，则比较Y坐标
      groups.forEach(group => {
        group.sort((a, b) => {
          const centerA = a.getCenterPoint();
          const centerB = b.getCenterPoint();
          return centerA.x - centerB.x || centerA.y - centerB.y;
        });
      });
      // 将分组平坦化为一个数组，并按照新的排序重新编号
      const finalSortedImages = groups.flat();
      finalSortedImages.forEach((img, index) => {
        if (img.associatedText) {
          const newText = String(index + 1); // 新编号
          img.associatedText.text = newText; // 更新文本对象的内容
        }
      });
      this.canvas.requestRenderAll();
    },
    // 添加看板
    addSvgToCanvas(svgName) {
      let svgPath;
      let scaleValues; // 用于存储每个SVG的缩放值
      // 从 Vuex 获取 scale_fix
      const scaleFix = this.$store.state.canvas.scaleFix / 2.5;;
      console.log('scaleFix value:', scaleFix);
      switch (svgName) {
        case "signboardSvg":
          svgPath = signboardSvg;
          scaleValues = { scaleX: (4000 / scaleFix), scaleY: (500 / scaleFix) };
          break;
        case "fullSkylight":
          svgPath = fullSkylight;
          scaleValues = { scaleX: (2000 / scaleFix), scaleY: (500 / scaleFix) };
          break;
        case "telephonePole":
          svgPath = telephonePole;
          scaleValues = { scaleX: (1000 / scaleFix), scaleY: (1000 / scaleFix) };
          break;
        case "cameraPole":
          svgPath = cameraPole;
          scaleValues = { scaleX: (1000 / scaleFix), scaleY: (1000 / scaleFix) };
          break;
        case "paymentMachine":
          svgPath = paymentMachine;
          scaleValues = { scaleX: (2000 / scaleFix), scaleY: (2000 / scaleFix) };
          break;
        case "iBarrierCar":
          svgPath = iBarrierCar;
          scaleValues = { scaleX: (1000 / scaleFix), scaleY: (1000 / scaleFix) };
          break;
        case "uBarrierCar":
          svgPath = uBarrierCar;
          scaleValues = { scaleX: (2000 / scaleFix), scaleY: (500 / scaleFix) };
          break;
        case "lighting":
          svgPath = lighting;
          scaleValues = { scaleX: (1000 / scaleFix), scaleY: (1000 / scaleFix) };
          break;
        case "controlBox":
          svgPath = controlBox;
          scaleValues = { scaleX: (1000 / scaleFix), scaleY: (1000 / scaleFix) };
          break;
        case "parkingSpace":
          svgPath = parkingSpaceSvg;
          scaleValues = { scaleX: (2500 / scaleFix), scaleY: (5000 / scaleFix) };
          break;
        default:
          return; // 如果没有匹配的svg，则直接返回
      }
      const loadAndScaleImage = (path, scaleValues, svgName) => {
        fabric.Image.fromURL(path, (img) => {
          if (!img) {
            console.error('Image loading failed');
            return;
          }
          // 获取原始图像尺寸并进行打印
          const originalWidth = img.width;
          const originalHeight = img.height;
          console.log('Original Width:', originalWidth, 'Original Height:', originalHeight);
          // 根据原始尺寸和提供的缩放值计算最终缩放比例
          const calculatedScaleX = scaleValues.scaleX / originalWidth;
          const calculatedScaleY = scaleValues.scaleY / originalHeight;
          console.log('calculatedScaleX:', calculatedScaleX, 'calculatedScaleY:', calculatedScaleY);
          // 设置图像的缩放
          img.scaleX = calculatedScaleX;
          img.scaleY = calculatedScaleY;
          // 为每个图像设置一个与其名称相对应的自定义属性
          img[svgName] = true;
          img.set({ originX: 'center', originY: 'center' });
          // 仅当SVG是parkingSpace时，应用等比例缩放逻辑
          if (svgName === 'parkingSpace') {
            img.on('scaling', function () {
              const minScale = Math.min(img.scaleX, img.scaleY);
              img.set({
                scaleX: minScale,
                scaleY: minScale
              });
            });
          }
          img[svgName] = true;
          img.set({ originX: 'center', originY: 'center' });
          this.addToCanvas(img);
        });
      };
      // 使用为每个SVG定制的缩放值加载和缩放图像
      loadAndScaleImage(svgPath, scaleValues, svgName);
    },
    addToCanvas(svgObject) {
      this.canvas.add(svgObject);
      this.canvas.setActiveObject(svgObject);
      if (svgObject.type === 'image') {
        const baseLeft = 200; // 基础左侧位置
        const baseTop = 200; // 基础顶部位置
        const increment = 10; // 每次位置增加的值
        // 计算新的位置
        const newLeft = baseLeft + (this.addCount * increment);
        const newTop = baseTop + (this.addCount * increment);
        // 对于图像的特殊处理
        svgObject.set({
          left: newLeft,
          top: newTop,
        });
        if (svgObject['parkingSpace']) {
          // 特殊处理parkingSpace SVG
          const allParkingSpaces = this.canvas.getObjects().filter(obj => obj['parkingSpace']);
          const newParkingSpaceNumber = allParkingSpaces.length; // 当前parkingSpace的数量作为新编号
          this.space = allParkingSpaces.length; // 更新space为当前最大编号
          // 创建编号文本
          const fontSize = Math.round(1250 / this.$store.state.canvas.scaleFix) * 2.5;
          console.log(fontSize); // 输出计算后的字体大小
          const text = new fabric.Text(String(newParkingSpaceNumber), {
            left: svgObject.left,
            top: svgObject.top,
            fontSize: fontSize,
            fill: '#000',
            originX: 'center',
            originY: 'center',
            lockScalingX: true,
            lockScalingY: true,
            selectable: true, // 禁止选择
            evented: false, // 禁止事件
            isNumber: true,
          });
          // 添加编号文本到画布
          this.canvas.add(text);
          // 更新svgObject的属性，以便后续可以通过svgObject直接访问到关联的文本
          svgObject.associatedText = text;
          // 确保在图像缩放时，关联的编号文本也相应调整位置和大小
          svgObject.set({
            lockScalingX: true,
            lockScalingY: true,
            snapAngle: 5,
          });
        }
      } else {
        // 对于组合对象的通用处理
        svgObject.set({
          left: this.canvas.width / 2 - svgObject.getScaledWidth() / 2,
          top: this.canvas.height / 2 - svgObject.getScaledHeight() / 2,
          hasBorders: true,
          hasControls: true,
          snapAngle: 5,
        });
      }
      // 如果spaceTextObj存在，则更新其显示的值
      if (this.spaceTextObj) {
        this.spaceTextObj.set('text', this.space.toString());
        this.canvas.requestRenderAll(); // 重新渲染画布以显示更新后的内容
      }
      this.addCount += 1;
      svgObject.setCoords();
      this.canvas.renderAll();
      this.updateCanvasState();
    },
    // 添加带文本的正方形
    addTextSquare() {
      const square = new fabric.Rect({
        width: 50, // 正方形的宽度，调整为较小的尺寸
        height: 50, // 正方形的高度，调整为较小的尺寸
        fill: "transparent", // 正方形的填充色设置为透明
        stroke: "transparent", // 如果需要，可以给正方形添加边框颜色
        strokeWidth: 1, // 边框的宽度
        originX: "center",
        originY: "center",
      });
      const text = new fabric.Text(this.carroomInput, {
        fontSize: 14, // 字体大小，根据正方形尺寸进行调整
        originX: "center",
        originY: "center",
      });
      // 创建一个组合对象
      const group = new fabric.Group([square, text], {
        left: this.canvas.width / 2 - 25, // 根据正方形尺寸调整位置
        top: this.canvas.height / 2 - 25, // 根据正方形尺寸调整位置
        angle: 0,
      });
      // 设置等比例缩放
      group.on('scaling', function () {
        let scaleX = group.scaleX;
        let scaleY = group.scaleY;
        // 获取最小的缩放值
        let minScale = Math.min(scaleX, scaleY);
        // 设置等比例缩放
        group.set({
          scaleX: minScale,
          scaleY: minScale
        });
      });
      // 将组合对象添加到画布
      this.canvas.add(group);
      this.canvas.setActiveObject(group); // 选中该对象
      this.canvas.requestRenderAll(); // 重新渲染画布
      this.updateCanvasState();
    },
    addTextToCanvas() {
      // 创建一个新的文本对象并设置属性
      const fontSize = this.fontSizeInput ? Math.round(Number(this.fontSizeInput)) : 50;
      const text = new fabric.Text(this.textInput, {
        left: 100, // 可以根据需要调整位置
        top: 100, // 可以根据需要调整位置
        fontSize: fontSize, // 使用上面确定的字号大小
        fill: "#000000", // 文本颜色
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false, // 禁用控制点
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
      // 将文本对象添加到画布上
      this.canvas.add(text);
      this.canvas.renderAll(); // 更新画布以显示新添加的文本
      // 清空输入框
      this.textInput = "";
      this.updateCanvasState();
    },
    exportAsPDF() {
      // 重置画布缩放比例为1
      this.canvas.setZoom(1);
      // 同时，将画布尺寸重置为原始尺寸
      this.canvas.setWidth(2100);
      this.canvas.setHeight(1485);
      const textsInfo = [];
      // 在导出之前进行线条粗细处理
      this.canvas.forEachObject((obj) => {
        if (obj.type === "line") {
          // 检查线条是否有一个已经设置的原始粗细值
          if (obj.auxiliaryLine) {
            // 对于具有auxiliaryLine属性的线，设置粗细为0.5像素
            obj.strokeWidth = 0.5;
          } else {
            if (obj.originalStrokeWidth === undefined) {
              // 如果没有设置，就默认为1像素
              obj.originalStrokeWidth = 1;  // 设置原始粗细值
            }
            // 使用设置的原始粗细值，不进行缩放调整
            obj.strokeWidth = obj.originalStrokeWidth;
          }
        } else if (obj.type === "text") {
          if (!obj.isform && !obj.isNumber) {
            // 保存文本信息
            textsInfo.push({
              text: obj.text,
              fontSize: obj.fontSize,
              angle: obj.angle,
              left: obj.left,
              top: obj.top + obj.fontSize,
              fontFamily: obj.fontFamily,
            });
            // 从画布上临时移除文本
            this.canvas.remove(obj);
          }
        }
      });
      this.canvas.requestRenderAll();
      // 将Canvas导出为SVG字符串
      const svgString = this.canvas.toSVG();
      // 创建一个 jsPDF 实例
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [2100, 1485],
      });
      // 导入的字体
      pdf.addFont('NotoSansJP-Regular-normal.ttf', 'NotoSansJP-Regular', 'normal');
      pdf.setFont('NotoSansJP-Regular');
      // 将SVG字符串转换为DOM元素
      const svgElement = new DOMParser().parseFromString(svgString, "text/xml").documentElement;
      // 使用svg2pdf将SVG元素渲染到PDF中，这里异步处理
      pdf.svg(svgElement).then(() => {
        // SVG渲染完成后，再添加文本
        textsInfo.forEach(textInfo => {
          pdf.setFontSize(textInfo.fontSize);
          pdf.text(textInfo.text, textInfo.left, textInfo.top, { angle: textInfo.angle });
        });
        // 完成后保存PDF
        pdf.save("output.pdf");
        // PDF保存完成后，将文本重新添加回画布
        textsInfo.forEach(textInfo => {
          const text = new fabric.Text(textInfo.text, {
            fontSize: textInfo.fontSize,
            angle: textInfo.angle,
            left: textInfo.left,
            top: textInfo.top - textInfo.fontSize,
            fontFamily: textInfo.fontFamily,
            // 还原其他属性
          });
          this.canvas.add(text);
        });
        this.canvas.requestRenderAll(); // 确保画布更新显示
      });
    },
    // toggleScale() {
    //   // 从 Vuex 获取 scaleX 和 scaleY
    //   const scaleX = this.$store.state.canvas.canvasScale.scaleX;
    //   const scaleY = this.$store.state.canvas.canvasScale.scaleY;
    //   // 从 Vuex 获取 scale_fix
    //   const scaleFix = this.$store.state.canvas.scaleFix;
    //   // 计算新的缩放比例
    //   const newScaleFactorX = 1 / (scaleFix * scaleX);
    //   const newScaleFactorY = 1 / (scaleFix * scaleY);
    //   const canvasCenter = {
    //     x: this.canvas.getWidth() / 2,
    //     y: this.canvas.getHeight() / 2
    //   };
    //   this.canvas.forEachObject((obj) => {
    //     if (!this.isScaled) {
    //       // 保存原始尺寸和位置
    //       obj.originalScaleX = obj.scaleX;
    //       obj.originalScaleY = obj.scaleY;
    //       obj.originalLeft = obj.left;
    //       obj.originalTop = obj.top;
    //     }
    //     // 应用新的缩放比例
    //     const adjustedScaleX = this.isScaled ? obj.originalScaleX : obj.scaleX * newScaleFactorX;
    //     const adjustedScaleY = this.isScaled ? obj.originalScaleY : obj.scaleY * newScaleFactorY;
    //     // 计算相对于画布中心的位置
    //     const offsetX = (obj.left + obj.width * obj.scaleX / 2) - canvasCenter.x;
    //     const offsetY = (obj.top + obj.height * obj.scaleY / 2) - canvasCenter.y;
    //     // 计算新的位置
    //     const newLeft = this.isScaled ? obj.originalLeft : canvasCenter.x + offsetX * newScaleFactorX - obj.width * adjustedScaleX / 2;
    //     const newTop = this.isScaled ? obj.originalTop : canvasCenter.y + offsetY * newScaleFactorY - obj.height * adjustedScaleY / 2;
    //     // 应用新的位置和缩放
    //     obj.set({ scaleX: adjustedScaleX, scaleY: adjustedScaleY, left: newLeft, top: newTop }).setCoords();
    //   });
    //   this.canvas.requestRenderAll();
    //   this.isScaled = !this.isScaled;
    // },
    toggleBackground() {
      if (!this.isBackgroundVisible) {
        // 如果当前背景是隐藏的，显示背景
        this.canvas.setBackgroundImage(this.savedBackgroundImage, this.canvas.renderAll.bind(this.canvas));
      } else {
        // 如果当前背景是可见的，先保存背景图片引用，然后隐藏背景
        this.savedBackgroundImage = this.canvas.backgroundImage;
        this.canvas.setBackgroundImage(null, this.canvas.renderAll.bind(this.canvas));
      }
      this.isBackgroundVisible = !this.isBackgroundVisible;
    },
    // 道路虛綫
    toggleRoadVisibility() {
      this.canvas.forEachObject((obj) => {
        if (obj.isRoad) {
          // 直接根据开关状态更新线段的strokeDashArray属性
          obj.strokeDashArray = this.road ? null : [10];
          // 标记对象为需要重新渲染，确保变化立即生效
          obj.dirty = true;
        }
      });
      // 请求画布重新渲染以应用更改
      this.canvas.requestRenderAll();
    },
    goToSimulation() {
      if (this.canvas) {
        const dataUrl = this.canvas.toDataURL(); // 将canvas转换为图像的data URL
        // 使用新的action名称保存到Vuex中
        this.$store.dispatch('canvas/saveLayoutData', dataUrl);
        // 获取带有自定义属性parkingSpace的对象的中心点坐标
        const parkingSpaceCoords = this.canvas.getObjects()
          .filter(obj => obj.parkingSpace) // 确保对象有parkingSpace属性
          .map(obj => {
            // 计算并缩小坐标
            const scaledLeft = (obj.left) / 2.5;
            const scaledTop = (obj.top) / 2.5;
            const angle = obj.angle || 0;
            const type = "car";
            return {
              center: [scaledLeft, scaledTop],
              angle: angle,
              type: type,
            };
          });
        // 控制台输出所有坐标
        console.log("Parking Space Coords (scaled by 1/5):", parkingSpaceCoords);
        // 使用Vuex的action或mutation保存这些坐标
        this.$store.dispatch('canvas/saveParkingSpaceCoords', parkingSpaceCoords);
        this.$store.commit('canvas/setFromGoToSimulation', true);
      }
      // this.$router.push({ name: "simulation", query: { tab: 'parking-lot' } });
      this.$router.push({ name: "simulation", });
    },
  },
  watch: {
    // 监听线条粗细的变化
    lineWidth(newVal) {
      this.updateLine();
    },
    // 监听线条样式的变化
    lineStyle(newVal) {
      this.updateLine();
    },
    selectedLine(newVal) {
      if (newVal) {
        this.isCollapsed = false;
      }
    },
    selectedDimensionLine(newVal) {
      if (newVal) {
        this.isCollapsed = false;
      }
    },
    selectedImage(newVal) {
      if (newVal) {
        this.isCollapsed = false;
      }
    },
    road(newVal) {
      this.toggleRoadVisibility(); // 调用处理方法
    },
  },
};