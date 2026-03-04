<template>
  <div class="full-page-container">
    <el-steps :space="200" style="margin-bottom: 10px">
      <el-step title="ライン追加" status="finish"></el-step>
      <el-step title="図面生成" status="wait"></el-step>
    </el-steps>
    <el-container>
      <el-main style="padding: 0">
        <el-row :gutter="20" style="width: 80%">
          <el-col :span="24">
            <div class="grid-content" style="margin-bottom: 20px">
              <el-button type="primary" plain @click="setLineColor('blue')"
                ><span class="road-line"></span>車道側</el-button
              >
              <el-button type="danger" plain @click="setLineColor('red')"
                ><span class="building-line"></span>建物側</el-button
              >
              <el-button type="success" plain @click="setLineColor('green')"
                ><span class="gateway"></span>ゲート</el-button
              >
              <el-button type="warning" plain @click="setLineColor('yellow')"
                ><span class="prohibit"></span>禁止エリア</el-button
              >
            </div>
          </el-col>
          <el-col :span="24">
            <div class="grid-content">
              <el-input
                v-model="arrowText"
                placeholder="長さを入力してください"
                style="width: 400px"
              >
                <template slot="append">mm</template>
                <el-button type="info" slot="prepend" @click="drawDoubleArrow"
                  ><span class="dimension"></span>寸法追加</el-button
                >
              </el-input>
              <el-button
                type="danger"
                style="margin-left: 10px"
                @click="enableEraser"
                ><i class="el-icon-delete" style="margin-right: 8px"></i
                >削除</el-button
              >
              <el-button type="primary" @click="debouncedSendDataToBackend"
                >作成<i class="el-icon-right" style="margin-left: 8px"></i
              ></el-button>
            </div>
          </el-col>
        </el-row>
        <div class="canvas-container" style="position: relative">
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
            @change="loadImage"
            accept="image/*, .pdf"
            style="display: none"
          />
          <div
            class="canvas-container"
            style="overflow: scroll; width: 860px; height: 614px"
          >
            <canvas ref="canvas" :width="840" :height="594"></canvas>
          </div>
          <div v-if="showModal" class="modal">
            <div class="modal-content">
              <p v-html="modalMessage"></p>
              <!-- 添加进度条 -->
              <el-progress
                :percentage="progressPercentage"
                :format="format"
              ></el-progress>
            </div>
          </div>
        </div>
      </el-main>
      <el-aside width="200px">
        <div style="text-align: center">
          <span style="display: inline-block; margin-top: 10px"
            >場内車路幅</span
          >
        </div>
        <el-input v-model="roadWidth" type="number" style="margin-top: 10px">
          <template slot="append">mm</template>
        </el-input>
      </el-aside>
    </el-container>
    <!-- 弹窗部分 -->
    <el-dialog
      :visible.sync="isPopupVisible"
      title="レイアウトプレビュー"
      :width="'70%'"
      :height="'60%'"
      :before-close="handleClose"
    >
      <!-- 画布预览容器 -->
      <div class="canvas-preview-container">
        <!-- 循环显示所有画布区域 -->
        <div
          v-for="(area, index) in areas"
          :key="index"
          class="custom-canvas-container large-font"
          v-show="
            (step === 1 && isCurrentPage(index)) ||
            (step === 2 && selectedCanvases.includes(index))
          "
        >
          <!-- 第一步：多选框选择画布 -->
          <el-checkbox
            v-model="selectedCanvases"
            :label="index"
            v-if="step === 1"
          >
            レイアウト {{ index + 1 }}
          </el-checkbox>
          <!-- 第二步：单选最终画布 -->
          <el-radio v-model="finalCanvasIndex" :label="index" v-if="step === 2">
            レイアウト {{ index + 1 }}
          </el-radio>
          <canvas
            :ref="'popupCanvas' + index"
            width="840"
            height="594"
          ></canvas>
        </div>
      </div>
      <!-- 对话框底部按钮 -->
      <span slot="footer" class="dialog-footer">
        <!-- 根据步骤更改按钮功能 -->
        <el-button @click="step === 1 ? closeBothPopups() : goToPreviousStep()">
          {{ step === 1 ? "閉じる" : "戻る" }}
        </el-button>
        <!-- 第一步的“下一步”按钮 -->
        <el-button v-if="step === 1" type="primary" @click="goToNextStep"
          >次へ</el-button
        >
        <!-- 第二步的“確認”按钮 -->
        <el-button v-if="step === 2" type="primary" @click="saveSelectedCanvas"
          >確認</el-button
        >
      </span>
      <!-- 分页控件，仅在第一步显示 -->
      <el-pagination
        v-if="step === 1"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-size="1"
        layout="total, prev, pager, next, jumper"
        :total="areas.length"
      >
      </el-pagination>
    </el-dialog>
  </div>
</template>

<script>
import { fabric } from "fabric";
import axios from "axios";
import Canvas from "./Canvas";
import BackendService from "./BackendService";
export default {
  name: "DrawingBoard",
  created() {
    fabric.Line.prototype.perPixelTargetFind = true;
    fabric.Line.prototype.targetFindTolerance = 10;
    this.debouncedSendDataToBackend = this.debounce(
      this.sendDataToBackend,
      1000
    );
  },
  mixins: [Canvas, BackendService],
  data() {
    return {
      canvas: null,
      isDrawingLine: false,
      isDrawingDoubleArrow: false,
      points: [],
      currentLineColor: "blue",
      arrowText: "", // 箭头线上的文字
      showModal: false,
      modalMessage: "",
      progressPercentage: 0,
      isCtrlPressed: false,
      isPopupVisible: false,
      areas: [], // 从服务器获取的区域数据
      fabricCanvases: [], // 存储 fabric 画布实例
      selectedCanvasIndex: null,
      currentPage: 1,
      step: 1, // 步骤1: 选择多个画布，步骤2: 最终选择一个画布
      selectedCanvases: [], // 存储选中画布的索引数组
      finalCanvasIndex: null, // 最终选中画布的索引
      isContinuousDrawing: false, // 連續畫線模式
      lastLineEndPoint: null, // 存儲最後一條線的終點坐標
      roadWidth: "5000",
    };
  },
  mounted() {
    this.canvas = new fabric.Canvas(this.$refs.canvas, {
      selection: false,
    });
    this.canvas.on("mouse:down", (options) => this.onCanvasClick(options));
    this.initMouseEvents();
    // 添加键盘事件监听
    this.handleKeyDown = (event) => {
      if (event.key === "Control") {
        this.isCtrlPressed = true;
      }
      if (event.key === "Delete") {
        this.enableEraser();
      }
      if (event.key === "Escape") {
        this.exitDrawingMode();
      }
    };
    this.handleKeyUp = (event) => {
      if (event.key === "Control") {
        this.isCtrlPressed = false;
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    this.addCanvasScalingAndPanning();
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  },
  methods: {
    addCanvasScalingAndPanning() {
      // 缩放功能
      this.canvas.on("mouse:wheel", (opt) => {
        if (opt.e.shiftKey) {
          var delta = opt.e.deltaY;
          var zoom = this.canvas.getZoom();
          zoom *= 0.999 ** delta;
          if (zoom > 5) zoom = 5; // 设置最大缩放比例
          if (zoom < 1) zoom = 1; // 设置最小缩放比例
          this.canvas.setZoom(zoom);
          this.canvas.setWidth(840 * zoom); // 根据缩放比例调整画布宽度
          this.canvas.setHeight(594 * zoom); // 根据缩放比例调整画布高度
          this.canvas.forEachObject((obj) => {
            if (obj.type === "line") {
              obj.strokeWidth = 2 / zoom;
            }
          });
          this.canvas.requestRenderAll();
          opt.e.preventDefault();
          opt.e.stopPropagation();
        }
      });
    },
    handleClose(done) {
      this.closeBothPopups();
      done(); // 调用这个函数来实际关闭对话框
    },
    handleCurrentChange(newPage) {
      this.currentPage = newPage;
    },
    isCurrentPage(index) {
      return index === this.currentPage - 1;
    },
    format(percentage) {
      // 这里可以根据percentage自定义格式，例如：
      return percentage + "%";
    },
    enableEraser() {
      this.canvas.isDrawingMode = false;
      this.canvas.getActiveObjects().forEach((obj) => {
        this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject().renderAll();
    },
    // 显示弹窗并准备画布
    showPopup() {
      this.isPopupVisible = true;
      this.$nextTick(() => {
        this.createFabricCanvases();
        // this.copyCanvasContent();
      });
    },
    // 动态创建 fabric 画布
    createFabricCanvases() {
      // 首先清理现有的 fabricCanvases
      this.fabricCanvases.forEach((canvas) => canvas && canvas.dispose());
      this.fabricCanvases = [];
      // 对每个 area，找到对应的 canvas 元素并创建 fabric.Canvas
      this.areas.forEach((area, index) => {
        // 使用 Vue 的 ref 引用对应的 canvas 元素
        const canvasElement = this.$refs["popupCanvas" + index][0];
        // 确保 canvasElement 是存在的
        if (canvasElement) {
          const fabricCanvas = new fabric.Canvas(canvasElement);
          this.fabricCanvases.push(fabricCanvas);
          fabricCanvas.on("mouse:down", () => {
            this.toggleCanvasSelection(index);
          });
        }
      });
    },
    // 复制原始画布内容到新画布
    // copyCanvasContent() {
    //   const originalCanvas = this.$refs.canvas;
    //   if (!originalCanvas) {
    //     console.error("元のキャンバス要素が見つかりません");
    //     return;
    //   }
    //   if (!(this.canvas instanceof fabric.Canvas)) {
    //     console.error(
    //       "元のキャンバスはfabric.Canvasインスタンスではありません"
    //     );
    //     return;
    //   }
    //   this.canvas.discardActiveObject().renderAll();
    //   this.fabricCanvases.forEach((popupFabricCanvas, i) => {
    //     if (!popupFabricCanvas) {
    //       console.error(`ポップアップキャンバス ${i + 1} が見つかりません`);
    //       return;
    //     }
    //     this.canvas.getObjects().forEach((obj) => {
    //       obj.clone((clonedObj) => {
    //         popupFabricCanvas.add(clonedObj);
    //       });
    //     });
    //   });
    // },
    goToNextStep() {
      this.step = 2; // 切换到第二步
    },
    goToPreviousStep() {
      this.step = 1; // 返回到第一步
    },
    saveSelectedCanvas() {
      if (
        this.finalCanvasIndex === null ||
        !this.fabricCanvases[this.finalCanvasIndex]
      ) {
        alert("先にレイアウトを選択してください");
        return;
      }
      const selectedCanvas = this.fabricCanvases[this.finalCanvasIndex];
      // 临时存储并移除border对象
      const borders = selectedCanvas.getObjects().filter((obj) => obj.isBorder);
      borders.forEach((border) => selectedCanvas.remove(border));
      // 放大画布上的每个对象
      selectedCanvas.getObjects().forEach((obj) => {
        obj.set({
          left: obj.left * 2.5,
          top: obj.top * 2.5,
          scaleX: obj.scaleX * 2.5,
          scaleY: obj.scaleY * 2.5,
        });
      });
      selectedCanvas.renderAll();
      // 保存画布内容
      const canvasJson = selectedCanvas.toJSON(["parkingSpace"]);
      this.$store.commit("canvas/setCanvasContent", canvasJson);
      // 将border对象再添加回画布
      borders.forEach((border) => selectedCanvas.add(border));
      selectedCanvas.renderAll();
      // 以下是新增的逻辑，用于保存对应的 area 数据
      const selectedAreas = this.areas[this.finalCanvasIndex];
      if (selectedAreas && Array.isArray(selectedAreas)) {
        // 遍历 selectedAreas 数组，放大每个 area 对象的 center 数值
        selectedAreas.forEach((area) => {
          if (area.center && Array.isArray(area.center)) {
            area.center = area.center.map((value) => value * 2.5);
          }
        });
        this.$store.commit("canvas/setSelectedArea", selectedAreas);
      } else {
        console.error("选定的画布没有对应的区域数据或区域数据不完整");
      }
      // 在数据保存之后执行跳转
      this.goToDrawSuccess();
    },
    goToDrawSuccess() {
      // 这里实现跳转逻辑
      this.$router.push({
        name: "drawsuccess",
        params: {
          drawSuccessData: this.$store.state.canvas.canvasContent,
        },
      });
    },
    closeBothPopups() {
      this.isPopupVisible = false;
      this.showModal = false;
    },
    toggleCanvasSelection(index) {
      if (this.step === 1) {
        const selectedIndex = this.selectedCanvases.indexOf(index);
        if (selectedIndex >= 0) {
          this.selectedCanvases.splice(selectedIndex, 1); // 如果已选中，则移除
        } else {
          this.selectedCanvases.push(index); // 如果未选中，则添加
        }
      }
      // 第二步的单选逻辑
      else if (this.step === 2) {
        this.finalCanvasIndex = index; // 直接设置为最终选择的画布索引
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.canvas-container {
  position: relative;
  canvas {
    border: 1px solid black;
  }
}
.modal {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  z-index: 2; // 高于 canvas 的 z-index
  left: 0;
  top: 0;
  width: 840px; // 与 canvas 宽度相同
  height: 630px; // 与 canvas 高度相同
  background-color: rgba(0, 0, 0, 0.5); // 半透明背景
}
.modal-content {
  background-color: #fefefe;
  margin: auto; // 水平和垂直居中
  padding: 20px;
  border: 1px solid #888;
  width: 50%; // 根据需要调整模态窗口的宽度
  text-align: center;
  border-radius: 4px;
}
.el-row {
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
}
.el-col {
  border-radius: 4px;
}
.bg-purple-dark {
  background: #99a9bf;
}
.bg-purple {
  background: #d3dce6;
}
.bg-purple-light {
  background: #e5e9f2;
}
.grid-content {
  border-radius: 4px;
  min-height: 36px;
}
.row-bg {
  padding: 10px 0;
  background-color: #f9fafc;
}
.full-page-container {
  padding: 20px; // 在元素内部四周创建20px的空间
  box-sizing: border-box; // 确保元素的最终尺寸包括了 padding
}
.canvas-preview-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  height: 100%; /* 确保容器占满整个对话框的高度 */
}
.custom-canvas-container {
  margin-bottom: 100px; /* 设置间距 */
}
::v-deep.building-line {
  background: url("/svg/building-line.svg") no-repeat center center !important; /* 替换为你的图标图片路径 */
  display: inline-block;
  width: 14px; /* 根据你的图标大小调整 */
  height: 14px; /* 根据你的图标大小调整 */
  background-size: contain !important;
  vertical-align: middle;
  margin-right: 8px; /* 按钮文本和图标之间的间距 */
}
::v-deep.road-line {
  background: url("/svg/road-line.svg") no-repeat center center !important; /* 替换为你的图标图片路径 */
  display: inline-block;
  width: 14px; /* 根据你的图标大小调整 */
  height: 14px; /* 根据你的图标大小调整 */
  background-size: contain !important;
  vertical-align: middle;
  margin-right: 8px; /* 按钮文本和图标之间的间距 */
}
::v-deep.gateway {
  background: url("/svg/gateway.svg") no-repeat center center !important; /* 替换为你的图标图片路径 */
  display: inline-block;
  width: 14px; /* 根据你的图标大小调整 */
  height: 14px; /* 根据你的图标大小调整 */
  background-size: contain !important;
  vertical-align: middle;
  margin-right: 8px; /* 按钮文本和图标之间的间距 */
}
::v-deep.dimension {
  background: url("/svg/dimension.svg") no-repeat center center !important; /* 替换为你的图标图片路径 */
  display: inline-block;
  width: 14px; /* 根据你的图标大小调整 */
  height: 14px; /* 根据你的图标大小调整 */
  background-size: contain !important;
  vertical-align: middle;
  margin-right: 8px; /* 按钮文本和图标之间的间距 */
}
::v-deep.prohibit {
  background: url("/svg/prohibit.svg") no-repeat center center !important; /* 替换为你的图标图片路径 */
  display: inline-block;
  width: 14px; /* 根据你的图标大小调整 */
  height: 14px; /* 根据你的图标大小调整 */
  background-size: contain !important;
  vertical-align: middle;
  margin-right: 8px; /* 按钮文本和图标之间的间距 */
}
.button-text-container {
  display: flex;
  align-items: flex-end; /* 使子元素对齐到容器的底部 */
}
.half-size-text {
  margin-left: 10px; /* 文本左侧的空白 */
  margin-bottom: 5px;
}
</style>