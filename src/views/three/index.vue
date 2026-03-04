<template>
  <el-container style="height: 90vh">
    <el-aside width="200px" style="padding-top: 20px; overflow-y: auto">
      <div v-if="thumbnails.length > 0" class="thumbnails-container">
        <div
          v-for="(thumbnail, index) in thumbnails"
          :key="index"
          class="thumbnail"
          @click="selectImage(index)"
        >
          <img :src="thumbnail" alt="Thumbnail" class="thumbnail-img" />
        </div>
      </div>
    </el-aside>
    <el-main class="main">
      <div class="labeler">
        <div class="button-text-container">
          <el-button @click="triggerFileUpload"
            ><i class="el-icon-upload" style="margin-right: 8px"></i
            >図面アップロード</el-button
          >
          <span class="half-size-text"
            >画像/PDFファイルをサポートしています</span
          >
        </div>
        <input
          type="file"
          ref="fileInput"
          @change="uploadImages"
          accept="image/*, .pdf"
          multiple
          webkitdirectory
          style="display: none"
        />
        <div
          class="canvas-scale-container"
          :style="scaleStyle"
          @wheel.prevent="handleWheel"
        >
          <canvas id="canvas"></canvas>
        </div>
      </div>
    </el-main>
    <el-aside width="200px" style="padding-top: 20px; overflow-y: auto">
      <el-form>
        <el-form-item>
          <el-select v-model="selectedText" placeholder="テキスト" filterable>
            <el-option
              v-for="option in options"
              :key="option"
              :label="option"
              :value="option"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="startDrawingRect"
            >注釈を追加</el-button
          >
        </el-form-item>
        <el-form-item>
          <el-button type="danger" @click="deleteSelectedRect">
            注釈を削除
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="exportRectData">
            注釈を出力
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button
            icon="el-icon-refresh-left"
            @click="undo"
            :disabled="undoStack.length === 0"
          ></el-button>
          <el-button
            icon="el-icon-refresh-right"
            @click="redo"
            :disabled="redoStack.length === 0"
          ></el-button>
        </el-form-item>
        <el-form-item label="注釈一覧">
          <el-radio-group
            v-model="selectedAnnoRadio"
            @change="handleAnnoRadioChange"
          >
            <el-radio
              v-for="(item, idx) in confidenceList"
              :key="idx"
              :label="idx"
            >
              {{ item.classText }}: {{ item.confText }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <span>注釈数: {{ confidenceList.length }} 件</span>
        </el-form-item>
      </el-form>
    </el-aside>
  </el-container>
</template>

<script>
import { fabric } from "fabric";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default {
  data() {
    return {
      canvas: null,
      scaledImageSize: null,
      selectedText: "",
      options: ["車両", "車番", "人間"],
      classDictionary: {
        0: "車両",
        1: "車番",
        2: "人間",
      },
      colorMap: {},
      isDrawing: false,
      images: [],
      thumbnails: [],
      currentImageIndex: 0,
      annotations: {},
      fileNames: [],
      confidenceDisplayText: "",
      confidenceList: [], //专门用于渲染侧边栏
      selectedAnnoRadio: null, // 当前单选的下标
      scaleFactor: 1, // 当前缩放倍率
      undoStack: [],
      redoStack: [],
      annotationsLoaded: {},
    };
  },
  mounted() {
    this.initCanvas();
    window.addEventListener("keydown", this.handleKeyDown);
    // 监听画布选中/取消选中事件
    this.canvas.on("selection:created", (e) => this.onCanvasSelection(e));
    this.canvas.on("selection:updated", (e) => this.onCanvasSelection(e));
    this.canvas.on("selection:cleared", () => this.onCanvasSelectionCleared());
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
  },
  computed: {
    scaleStyle() {
      // 让 transform-origin 固定左上(0,0)
      return {
        transform: `scale(${this.scaleFactor})`,
        transformOrigin: "0 0",
      };
    },
  },
  methods: {
    handleWheel(e) {
      // 阻止默认滚动行为
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        // 滚轮向上 => 放大
        this.scaleFactor += 0.1;
        if (this.scaleFactor > 5) {
          this.scaleFactor = 5; // 限制最大放大倍数
        }
      } else {
        // 滚轮向下 => 缩小，但最小不能低于1
        this.scaleFactor -= 0.1;
        if (this.scaleFactor < 1) {
          this.scaleFactor = 1;
        }
      }
    },
    handleAnnoRadioChange(newVal) {
      // newVal 就是选中的 annotation 下标，比如 0,1,2...
      if (newVal === null) {
        // 说明没有选中任何注释 => 取消画布选中
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
      } else {
        // 正常选中对应下标
        this.selectAnnotation(newVal);
      }
    },
    onCanvasSelection(e) {
      // 取得当前选中的对象
      const activeObj = e.selected && e.selected[0];
      if (!activeObj || activeObj.type !== "group") return;
      // 在 annotations 中找它对应的下标
      const currentFileName = this.fileNames[this.currentImageIndex];
      const currentAnnotations = this.annotations[currentFileName] || [];
      const foundIndex = currentAnnotations.findIndex(
        (a) => a.fabricGroup === activeObj
      );
      if (foundIndex !== -1) {
        // 同步到单选框
        this.selectedAnnoRadio = foundIndex;
      }
    },
    // 当画布取消选中时：
    onCanvasSelectionCleared() {
      // 说明没有任何对象被选中 => Radio 设为 null
      this.selectedAnnoRadio = null;
    },
    generateConfidenceDisplay() {
      const currentFileName = this.fileNames[this.currentImageIndex];
      const currentAnnotations = this.annotations[currentFileName] || [];
      // 1) 先生成文字，供原先的字符串需求使用
      const str = currentAnnotations
        .map((item) => {
          const classText =
            this.classDictionary[item.class] || "未知类: " + item.class;
          const confText = item.conf ? item.conf.toFixed(2) : "N/A";
          return `"${classText}": "${confText}"`;
        })
        .join("\n");
      // 2) 构造一个数组，专门给侧边栏循环用
      //    注意这里要把原注释在数组中的 index 记下来，方便点击时能选中对应的 annotation
      const list = currentAnnotations.map((item, idx) => {
        const classText =
          this.classDictionary[item.class] || "未知类: " + item.class;
        const confText = item.conf ? item.conf.toFixed(2) : "N/A";
        return {
          index: idx, // 在 annotations[...] 数组中的下标
          classText: classText,
          confText: confText,
        };
      });
      // 3) 把这个数组存进 data 里
      this.confidenceList = list;
      // 4) 如果还需要返回字符串（旧需求），就 return
      return str;
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    initCanvas() {
      this.canvas = new fabric.Canvas("canvas");
      this.resizeCanvas();
      this.canvas.selection = false;
      this.canvas.hoverCursor = "pointer";
      this.canvas.backgroundColor = "lightgray";
      this.canvas.renderAll();
    },
    resizeCanvas() {
      const container = document.querySelector(".labeler");
      this.canvas.setWidth(container.clientWidth * 0.8);
      this.canvas.setHeight(window.innerHeight * 0.6);
      this.canvas.renderAll();
    },
    clearCanvasAndData() {
      this.canvas.clear();
      this.scaledImageSize = null;
    },
    uploadImages(event) {
      this.clearCanvasAndData();
      this.images = [];
      this.thumbnails = [];
      this.annotations = {};
      const files = Array.from(event.target.files);
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target.result;
          fabric.Image.fromURL(data, (img) => {
            this.images.push(img);
            this.fileNames.push(file.name);
            this.annotations[file.name] = [];
            this.createThumbnail(data);
            if (this.images.length === 1) {
              this.displayImage(0);
            }
          });
        };
        reader.readAsDataURL(file);
      });
    },
    createThumbnail(data) {
      const thumbnail = new Image();
      thumbnail.src = data;
      thumbnail.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(thumbnail, 0, 0, 100, 100);
        this.thumbnails.push(canvas.toDataURL());
      };
    },
    displayImage(index) {
      this.clearCanvasAndData();
      const img = this.images[index];
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      const scaleFactor = canvasWidth / img.width;
      const scaledHeight = img.height * scaleFactor;
      if (scaledHeight > canvasHeight) {
        const heightScaleFactor = canvasHeight / img.height;
        img.scaleToHeight(canvasHeight);
        img.scaleToWidth(img.width * heightScaleFactor);
      } else {
        img.scaleToWidth(canvasWidth);
      }
      this.canvas.setBackgroundImage(
        img,
        this.canvas.renderAll.bind(this.canvas),
        {
          left: (canvasWidth - img.getScaledWidth()) / 2,
          top: (canvasHeight - img.getScaledHeight()) / 2,
          originX: "left",
          originY: "top",
          scaleX: img.scaleX,
          scaleY: img.scaleY,
          selectable: false,
          hasControls: false,
          evented: false,
        }
      );
      this.scaledImageSize = {
        width: img.getScaledWidth(),
        height: img.getScaledHeight(),
      };
      this.canvas.renderAll();
      this.currentImageIndex = index;
      this.restoreAnnotations();
    },
    selectImage(index) {
      this.undoStack = [];
      this.redoStack = [];
      this.displayImage(index);
    },
    getColorForText(text) {
      if (this.colorMap[text]) {
        return this.colorMap[text];
      }
      let randomColor = Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
      const adjustColor = (hex) => {
        const value = parseInt(hex, 16);
        return Math.max(value, 100);
      };
      const r = adjustColor(randomColor.slice(0, 2))
        .toString(16)
        .padStart(2, "0");
      const g = adjustColor(randomColor.slice(2, 4))
        .toString(16)
        .padStart(2, "0");
      const b = adjustColor(randomColor.slice(4, 6))
        .toString(16)
        .padStart(2, "0");
      const newColor = `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(
        b,
        16
      )}, 0.5)`;
      this.colorMap[text] = newColor;
      return newColor;
    },
    startDrawingRect() {
      if (this.isDrawing) {
        this.$message.error(
          "描画中ですので、現在の描画が完了してから新しい描画を開始してください。"
        );
        return;
      }
      if (!this.selectedText) {
        this.$message.error("まずテキストを選択してください。");
        return;
      }
      this.isDrawing = true;
      this.canvas.selection = false;
      this.canvas.discardActiveObject();
      this.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.hasControls = false; // 禁用操作点
        obj.hoverCursor = "crosshair";
        obj.moveCursor = "crosshair";
      });
      this.canvas.defaultCursor = "crosshair";
      this.canvas.renderAll();
      let rect, origX, origY;
      const strokeColor = this.getColorForText(this.selectedText); // 改为边框颜色
      const fillColor = "rgba(144,238,144, 0.5)"; // 固定填充为浅绿色
      const onMouseDown = (o) => {
        const pointer = this.canvas.getPointer(o.e);
        origX = pointer.x;
        origY = pointer.y;
        rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: "left",
          originY: "top",
          width: 0,
          height: 0,
          angle: 0,
          fill: fillColor,
          stroke: strokeColor, // 把原来的随机色改到 stroke
          strokeWidth: 5,
        });
        this.canvas.add(rect);
      };
      const onMouseMove = (o) => {
        if (!rect) return;
        const pointer = this.canvas.getPointer(o.e);
        rect.set({
          width: Math.abs(origX - pointer.x),
          height: Math.abs(origY - pointer.y),
        });
        if (origX > pointer.x) {
          rect.set({ left: pointer.x });
        }
        if (origY > pointer.y) {
          rect.set({ top: pointer.y });
        }
        this.canvas.renderAll();
      };
      const onMouseUp = () => {
        if (!rect) return;
        const text = new fabric.Text(this.selectedText, {
          left: rect.left + rect.width / 20,
          top: rect.top + rect.height / 20,
          originX: "left",
          originY: "top",
          fontSize: 20,
          fill: "#000",
        });
        this.canvas.remove(rect);
        const group = new fabric.Group([rect, text], {
          left: rect.left,
          top: rect.top,
          selectable: true,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        this.canvas.add(group);
        this.saveAnnotation(group);
        // 【关键】记录到 undoStack
        const currentFileName = this.fileNames[this.currentImageIndex];
        // 找到刚才保存的 annotation 数据（通常在 saveAnnotation 时已经 push 到 this.annotations[...] 最末）
        const annotationList = this.annotations[currentFileName];
        const newAnno = annotationList[annotationList.length - 1]; // 刚添加的
        this.undoStack.push({
          type: "add",
          fileName: currentFileName,
          annotation: newAnno, // 把它保存起来，方便撤销时移除
        });
        // 只要有新操作，就清空 redoStack
        this.redoStack = [];
        this.isDrawing = false;
        this.canvas.defaultCursor = "default";
        this.canvas.selection = true;
        this.canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.hasControls = false;
          obj.hoverCursor = "move";
          obj.moveCursor = "move";
        });
        this.canvas.off("mouse:down", onMouseDown);
        this.canvas.off("mouse:move", onMouseMove);
        this.canvas.off("mouse:up", onMouseUp);
      };
      this.canvas.once("mouse:down", onMouseDown);
      this.canvas.on("mouse:move", onMouseMove);
      this.canvas.once("mouse:up", onMouseUp);
    },
    deleteSelectedRect() {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject && activeObject.type === "group") {
        const rect = activeObject.item(0);
        const text = activeObject.item(1);
        // 获取背景图片的尺寸和位置
        const img = this.canvas.backgroundImage;
        const relativeLeft =
          (activeObject.left - img.left) / img.getScaledWidth();
        const relativeTop =
          (activeObject.top - img.top) / img.getScaledHeight();
        const relativeWidth = (rect.width * rect.scaleX) / img.getScaledWidth();
        const relativeHeight =
          (rect.height * rect.scaleY) / img.getScaledHeight();
        // 获取当前文件名
        const currentFileName = this.fileNames[this.currentImageIndex];
        // 对比注释数据和当前选择的对象
        const annotationIndex = this.annotations[
          currentFileName // 使用文件名称作为键
        ]?.findIndex((annotation) => {
          return (
            Math.abs(annotation.relative.left - relativeLeft) < 0.001 &&
            Math.abs(annotation.relative.top - relativeTop) < 0.001 &&
            Math.abs(annotation.relative.width - relativeWidth) < 0.001 &&
            Math.abs(annotation.relative.height - relativeHeight) < 0.001 &&
            annotation.text === text.text
          );
        });
        // 注释数据删除
        if (annotationIndex !== -1) {
          const removed = this.annotations[currentFileName][annotationIndex];
          // 【关键】记录到 undoStack
          this.undoStack.push({
            type: "delete",
            fileName: currentFileName,
            annotation: removed, // 待会儿撤销时可以根据它重新加回去
          });
          // 清空redoStack
          this.redoStack = [];
          // 真正从数组和画布里删除
          this.annotations[currentFileName].splice(annotationIndex, 1);
          this.canvas.remove(activeObject);
          this.$message.success("選択された注釈が削除されました。");
        }
      } else {
        this.$message.warning("選択された注釈がありません。");
      }
      this.confidenceDisplayText = this.generateConfidenceDisplay();
    },
    undo() {
      if (this.undoStack.length === 0) {
        this.$message.info("これ以上、取り消す操作はありません。");
        return;
      }
      // 1) 栈顶操作
      const lastAction = this.undoStack.pop();
      // 2) 推入 redoStack，方便以后恢复
      this.redoStack.push(lastAction);
      // 3) 根据操作类型进行“撤销”
      if (lastAction.type === "add") {
        // 撤销 添加 => 从 annotations 中移除这条记录，并从画布删除 group
        const { fileName, annotation } = lastAction;
        const annoArr = this.annotations[fileName];
        if (annoArr) {
          const idx = annoArr.indexOf(annotation);
          if (idx !== -1) {
            annoArr.splice(idx, 1);
            // 同步删除画布对象
            if (annotation.fabricGroup) {
              this.canvas.remove(annotation.fabricGroup);
            }
          }
        }
      } else if (lastAction.type === "delete") {
        // 撤销 删除 => 重新把这条 annotation 加回
        const { fileName, annotation } = lastAction;
        if (!this.annotations[fileName]) {
          this.annotations[fileName] = [];
        }
        this.annotations[fileName].push(annotation);
        // 把 fabricGroup 加回画布
        if (annotation.fabricGroup) {
          this.canvas.add(annotation.fabricGroup);
        }
      }
      // 重绘
      this.canvas.renderAll();
      this.confidenceDisplayText = this.generateConfidenceDisplay();
    },
    redo() {
      if (this.redoStack.length === 0) {
        this.$message.info("これ以上、やり直す操作はありません。");
        return;
      }
      // 1) 从 redoStack 取出栈顶
      const action = this.redoStack.pop();
      // 2) 推回 undoStack
      this.undoStack.push(action);
      // 3) 根据操作类型，执行“重做”
      if (action.type === "add") {
        // “重做”添加 => 再次把注释对象加进来
        const { fileName, annotation } = action;
        if (!this.annotations[fileName]) {
          this.annotations[fileName] = [];
        }
        this.annotations[fileName].push(annotation);
        // 同步到画布
        if (annotation.fabricGroup) {
          this.canvas.add(annotation.fabricGroup);
        }
      } else if (action.type === "delete") {
        // “重做”删除 => 再次删除对应注释
        const { fileName, annotation } = action;
        const annoArr = this.annotations[fileName];
        if (annoArr) {
          const idx = annoArr.indexOf(annotation);
          if (idx !== -1) {
            annoArr.splice(idx, 1);
            if (annotation.fabricGroup) {
              this.canvas.remove(annotation.fabricGroup);
            }
          }
        }
      }
      // 重绘
      this.canvas.renderAll();
      this.confidenceDisplayText = this.generateConfidenceDisplay();
    },
    saveAnnotation(group) {
      const rect = group.item(0);
      const text = group.item(1).text; // 获取用户选择的文本
      const img = this.canvas.backgroundImage;
      const relativeLeft = (group.left - img.left) / img.getScaledWidth();
      const relativeTop = (group.top - img.top) / img.getScaledHeight();
      const relativeWidth = (rect.width * rect.scaleX) / img.getScaledWidth();
      const relativeHeight =
        (rect.height * rect.scaleY) / img.getScaledHeight();
      // 从 classDictionary 反查 class
      const classKey = Object.keys(this.classDictionary).find(
        (key) => this.classDictionary[key] === text
      );
      const annotationData = {
        text: group.item(1).text,
        class: classKey || null, // 保存 class 对应的键
        relative: {
          left: relativeLeft,
          top: relativeTop,
          width: relativeWidth,
          height: relativeHeight,
        },
        fill: rect.fill,
        // 新增：把 group 引用保存下来
        fabricGroup: group,
      };
      const currentFileName = this.fileNames[this.currentImageIndex]; // 获取当前文件名称
      if (!this.annotations[currentFileName]) {
        this.annotations[currentFileName] = [];
      }
      this.annotations[currentFileName].push(annotationData); // 保存注释数据
      this.confidenceDisplayText = this.generateConfidenceDisplay();
    },
    restoreAnnotations() {
      const currentFileName = this.fileNames[this.currentImageIndex];
      const annotationData = this.annotations[currentFileName];
      // 新增：如果已尝试从后端加载过，并且数据为空，就不再请求
      if (!this.annotationsLoaded) {
        this.annotationsLoaded = {}; // 初始化记录器
      }
      const alreadyLoaded = this.annotationsLoaded[currentFileName];
      if (alreadyLoaded && (!annotationData || annotationData.length === 0)) {
        console.log(
          `图片 ${currentFileName} 注释为空，且已尝试加载，跳过后端请求`
        );
        return;
      }
      // 如果还没尝试加载，先标记
      if (!alreadyLoaded) {
        this.annotationsLoaded[currentFileName] = true;
      }
      if (annotationData && annotationData.length > 0) {
        console.log(
          `当前图片 (${currentFileName}) 的注释数据：`,
          JSON.stringify(annotationData, null, 2)
        );
      } else {
        console.log(
          `当前图片 (${currentFileName}) 没有注释数据，尝试从后端加载`
        );
        this.sendImageToServer(this.currentImageIndex)
          .then((response) => {
            const result = response?.result;
            if (Array.isArray(result) && result.length > 0) {
              console.log("后端返回的注释数据：", result);
              const img = this.canvas.backgroundImage;
              const scaledWidth = img.getScaledWidth();
              const scaledHeight = img.getScaledHeight();
              const imgLeft = img.left || 0;
              const imgTop = img.top || 0;
              const newAnnotations = result.map((item) => {
                const relativeLeft = item.x0 / scaledWidth;
                const relativeTop = item.y0 / scaledHeight;
                const relativeWidth = (item.x1 - item.x0) / scaledWidth;
                const relativeHeight = (item.y1 - item.y0) / scaledHeight;
                const convertedText =
                  this.classDictionary[item.class] || `未知类: ${item.class}`;
                const strokeColor = this.getColorForText(convertedText);
                return {
                  conf: item.conf,
                  class: item.class,
                  text: convertedText,
                  relative: {
                    left: relativeLeft,
                    top: relativeTop,
                    width: relativeWidth,
                    height: relativeHeight,
                  },
                  fill: strokeColor,
                };
              });
              this.$set(this.annotations, currentFileName, newAnnotations);
              newAnnotations.forEach((annotation) => {
                const left = annotation.relative.left * scaledWidth + imgLeft;
                const top = annotation.relative.top * scaledHeight + imgTop;
                const width = annotation.relative.width * scaledWidth;
                const height = annotation.relative.height * scaledHeight;
                const rect = new fabric.Rect({
                  left,
                  top,
                  width,
                  height,
                  fill: "rgba(144,238,144, 0.5)",
                  stroke: annotation.fill,
                  strokeWidth: 5,
                });
                const text = new fabric.Text(annotation.text, {
                  left: left + width / 20,
                  top: top + height / 20,
                  originX: "left",
                  originY: "top",
                  fontSize: 20,
                  fill: "#000",
                });
                const group = new fabric.Group([rect, text], {
                  left,
                  top,
                  selectable: true,
                  hasControls: false,
                  lockMovementX: true,
                  lockMovementY: true,
                });
                annotation.fabricGroup = group;
                this.canvas.add(group);
              });
              this.canvas.renderAll();
              this.displayImage(this.currentImageIndex);
            } else {
              console.log("后端未返回任何有效注释数据");
            }
          })
          .catch((err) => {
            console.error("加载后端注释失败：", err);
          });
        return;
      }
      // 渲染已有注释（不重复加载）
      const img = this.canvas.backgroundImage;
      this.annotations[currentFileName].forEach((annotation) => {
        const left = annotation.relative.left * img.getScaledWidth() + img.left;
        const top = annotation.relative.top * img.getScaledHeight() + img.top;
        const width = annotation.relative.width * img.getScaledWidth();
        const height = annotation.relative.height * img.getScaledHeight();
        const rect = new fabric.Rect({
          left,
          top,
          width,
          height,
          fill: "rgba(144,238,144, 0.5)",
          stroke: annotation.fill,
          strokeWidth: 5,
        });
        const text = new fabric.Text(annotation.text, {
          left: left + width / 20,
          top: top + height / 20,
          originX: "left",
          originY: "top",
          fontSize: 20,
          fill: "#000",
        });
        const group = new fabric.Group([rect, text], {
          left,
          top,
          selectable: true,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        annotation.fabricGroup = group;
        this.canvas.add(group);
      });
      this.confidenceDisplayText = this.generateConfidenceDisplay();
      this.canvas.renderAll();
    },
    handleKeyDown(event) {
      if (event.key === "Escape" && this.isDrawing) {
        this.isDrawing = false;
        this.canvas.defaultCursor = "default";
        this.canvas.selection = true;
        this.canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.hasControls = false;
          obj.hoverCursor = "move";
          obj.moveCursor = "move";
        });
        this.canvas.off("mouse:down");
        this.canvas.off("mouse:move");
        this.canvas.off("mouse:up");
        this.$message.info("描画がキャンセルされました。");
      } else if (event.key === "Delete") {
        this.deleteSelectedRect();
      }
    },
    exportRectData() {
      const zip = new JSZip();
      Object.entries(this.annotations).forEach(([fileName, annotations]) => {
        const processedAnnotations = annotations.map((annotation) => {
          const centerLeft = (
            parseFloat(annotation.relative.left) +
            parseFloat(annotation.relative.width) / 2
          ).toFixed(6);
          const centerTop = (
            parseFloat(annotation.relative.top) +
            parseFloat(annotation.relative.height) / 2
          ).toFixed(6);
          return `${
            annotation.class
          } ${centerLeft} ${centerTop} ${annotation.relative.width.toFixed(
            6
          )} ${annotation.relative.height.toFixed(6)}\n`;
        });
        // 文件名为图片名称去掉扩展名 + .txt
        const txtFileName = `${fileName.split(".")[0]}.txt`;
        const txtContent = processedAnnotations.join("");
        // 将 .txt 文件直接添加到 zip 根目录
        zip.file(txtFileName, txtContent);
      });
      // 生成压缩包并下载
      zip.generateAsync({ type: "blob" }).then((blob) => {
        const today = new Date();
        const zipName = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today
          .getDate()
          .toString()
          .padStart(2, "0")}.zip`;
        saveAs(blob, zipName);
        this.$message.success("注釈がZIPファイルに出力されました。");
      });
    },
    // 发送图片到服务器
    async sendImageToServer(index) {
      const img = this.images[index];
      // 将 Fabric.Image 对象转换为数据URL
      const dataURL = img.toDataURL({
        format: "png",
        quality: 1,
      });
      // 创建 FormData 对象
      const formData = new FormData();
      // 将 base64 数据转换为 Blob
      const blob = this.dataURLtoBlob(dataURL);
      // 将 Blob 对象添加到 FormData
      formData.append("image", blob, this.fileNames[index]);
      // 添加额外的 data
      formData.append("type", "three");
      try {
        // 使用 axios 发送 POST 请求
        const response = await axios.post(
          "http://172.16.1.75:6001/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return response.data; // 返回服务器响应
      } catch (error) {
        console.error("发送图片到服务器时出错：", error);
      }
    },
    // 将 dataURL 转换为 Blob 对象
    dataURLtoBlob(dataurl) {
      const arr = dataurl.split(",");
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    },
    selectAnnotation(index) {
      const currentFileName = this.fileNames[this.currentImageIndex];
      const currentAnnotations = this.annotations[currentFileName] || [];
      const targetAnno = currentAnnotations[index];
      if (!targetAnno || !targetAnno.fabricGroup) {
        this.$message.warning("注釈オブジェクトが見つかりません。");
        return;
      }
      // 在画布上选中对应注释
      this.canvas.setActiveObject(targetAnno.fabricGroup);
      this.canvas.renderAll();
    },
  },
};
</script>

<style scoped>
#canvas {
  border: 1px solid #000; /* 设置画布的边框 */
}
.labeler {
  display: flex;
  flex-direction: column; /* 使文件输入框位于画布下方 */
  justify-content: center;
  align-items: center;
  height: 80vh; /* 让画布垂直居中 */
}
input[type="file"] {
  margin-top: 10px; /* 给文件输入框一些顶部间距 */
}
.half-size-text {
  margin-left: 10px; /* 文本左侧的空白 */
  margin-bottom: 5px;
}
.button-text-container {
  display: flex;
  align-items: flex-end; /* 使子元素对齐到容器的底部 */
}
.thumbnails-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.thumbnail {
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}
.thumbnail-img {
  width: 150px; /* 固定宽度 */
  height: 100px; /* 固定高度 */
  object-fit: cover; /* 拉伸以填充 */
}
.thumbnail:hover {
  border-color: blue;
}
.canvas-scale-container {
  display: inline-block;
  overflow: auto;
}
</style>
