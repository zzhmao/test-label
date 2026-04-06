<template>
  <el-container class="label-workspace">
    <el-aside
      ref="thumbnailAside"
      width="248px"
      class="workspace-aside workspace-aside-left"
    >
      <div class="workspace-panel workspace-panel-library">
        <div class="workspace-panel-header">
          <div class="workspace-panel-title">画像一覧</div>
        </div>
      <div class="thumb-header" v-if="images.length > 0">
        <span class="thumb-header-current">{{ currentImageIndex + 1 }}</span>
        <span class="thumb-header-divider">/</span>
        <span class="thumb-header-total">{{ images.length }}</span>
      </div>
      <div
        v-if="thumbnails.length > 0"
        ref="thumbnailsContainer"
        class="thumbnails-container"
      >
        <div
          v-for="(thumbnail, index) in thumbnails"
          :key="index"
          class="thumbnail"
          :class="[
            { active: index === currentImageIndex },
            getThumbnailStatusClass(fileNames[index]),
          ]"
          :ref="`thumb-${index}`"
          @click="selectImage(index)"
        >
          <div
            class="thumbnail-status"
            :class="getThumbnailStatusClass(fileNames[index])"
          >
            {{ getThumbnailStatusLabel(fileNames[index]) }}
          </div>
          <img :src="thumbnail" alt="Thumbnail" class="thumbnail-img" />
        </div>
      </div>
      </div>
    </el-aside>
    <el-main class="main">
      <div class="workspace-main-shell">
      <div ref="labeler" class="labeler">
        <div ref="summaryPanel" class="summary-panel">
          <div v-if="currentImageName" class="summary-header">
            <div class="summary-caption">{{ currentImageTitle }}</div>
            <div class="current-image-name" :title="currentImageName">
              {{ currentImageName }}
            </div>
          </div>
          <div class="summary-group">
            <div class="summary-group-title">{{ uploadSummaryTitle }}</div>
            <div class="upload-tag-container">
              <el-tag class="upload-stat-tag" size="medium" effect="plain" type="primary">
                {{ imageCountTitle }} {{ displayImageUploadCount }} 件
              </el-tag>
              <el-tag
                class="upload-stat-tag"
                size="medium"
                effect="plain"
                :type="displayLabelUploadCount > 0 ? 'success' : 'info'"
              >
                {{ labelCountTitle }} {{ displayLabelUploadCount }} 件
              </el-tag>
              <el-tag class="upload-stat-tag" size="medium" effect="plain" type="warning">
                {{ unmatchedLabelTitle }} {{ displayUnmatchedLabelCount }} 件
              </el-tag>
              <el-tag class="upload-stat-tag" size="medium" effect="plain" type="danger">
                {{ unmatchedImageTitle }} {{ displayUnmatchedImageCount }} 件
              </el-tag>
            </div>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-group">
            <div class="summary-group-title">{{ labelSummaryTitle }}</div>
            <div
              class="status-tag-container"
              :class="{ 'has-abnormal': requiredAnnotationCount !== null }"
            >
              <el-tag
                class="status-stat-tag is-clickable"
                size="medium"
                effect="plain"
                type="info"
                @click.native="jumpToNextStatusImage('empty')"
              >
                {{ emptyStatusTitle }} {{ displayEmptyStatusCount }} 件
              </el-tag>
              <el-tag
                class="status-stat-tag is-clickable"
                size="medium"
                effect="plain"
                type="primary"
                @click.native="jumpToNextStatusImage('ai')"
              >
                {{ aiStatusTitle }} {{ displayAiStatusCount }} 件
              </el-tag>
              <el-tag
                class="status-stat-tag is-clickable"
                size="medium"
                effect="plain"
                type="success"
                @click.native="jumpToNextStatusImage('modified')"
              >
                {{ modifiedStatusTitle }} {{ displayModifiedStatusCount }} 件
              </el-tag>
              <el-tag
                v-if="requiredAnnotationCount !== null"
                class="status-stat-tag is-clickable"
                size="medium"
                effect="plain"
                type="danger"
                @click.native="jumpToNextStatusImage('abnormal')"
              >
                {{ abnormalStatusTitle }} {{ displayAbnormalStatusCount }} 件
              </el-tag>
            </div>
          </div>
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
        <input
          type="file"
          ref="annotationInput"
          @change="uploadAnnotations"
          accept=".txt"
          multiple
          webkitdirectory
          style="display: none"
        />
        <div ref="canvasStageShell" class="canvas-stage-shell">
          <div
            class="canvas-viewport"
            ref="canvasViewport"
            :class="{
              'is-panning': isPanning,
              'is-pan-ready': isSpacePressed && !isDrawing && scaleFactor > 1,
            }"
            :style="canvasViewportStyle"
            @wheel.prevent="handleWheel"
          >
            <div class="canvas-scale-container" :style="scaleStyle">
              <canvas id="canvas"></canvas>
            </div>
          </div>
        </div>
      </div>
      </div>
    </el-main>
    <el-aside width="248px" class="workspace-aside">
      <div class="workspace-panel workspace-panel-tools">
        <div class="workspace-panel-header">
          <div class="workspace-panel-title">ラベル操作</div>
        </div>
      <el-form class="tool-form">
        <el-form-item class="tool-form-item tool-form-item-select">
          <el-select
            v-model="selectedText"
            class="tool-select"
            :placeholder="toolPanelSubtitle"
            filterable
          >
            <el-option
              v-for="option in options"
              :key="option"
              :label="option"
              :value="option"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item class="tool-form-item">
          <el-button class="tool-button" type="primary" @click="startDrawingRect">
            ラベルを追加
          </el-button>
        </el-form-item>
        <el-form-item class="tool-form-item">
          <el-button class="tool-button" type="danger" @click="deleteSelectedRect">
            ラベルを削除
          </el-button>
        </el-form-item>
        <el-form-item class="tool-form-item">
          <el-button class="tool-button" type="success" @click="exportRectData">
            ラベルを出力
          </el-button>
        </el-form-item>
        <el-form-item class="tool-form-item tool-inline-actions-item">
          <div class="tool-inline-actions">
            <el-button
              class="tool-icon-button"
              icon="el-icon-refresh-left"
              @click="undo"
              :disabled="undoStack.length === 0"
            ></el-button>
            <el-button
              class="tool-icon-button"
              icon="el-icon-refresh-right"
              @click="redo"
              :disabled="redoStack.length === 0"
            ></el-button>
          </div>
        </el-form-item>
        <el-form-item class="tool-form-item annotation-list-item">
          <el-radio-group
            v-model="selectedAnnoRadio"
            class="annotation-radio-group"
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
        <el-form-item v-if="countWarningVisible" class="tool-form-item">
          <el-alert
            :title="countWarningText"
            type="error"
            show-icon
            :closable="false"
          />
        </el-form-item>
        <el-form-item class="tool-form-item">
          <span class="annotation-count-text">
            {{ annotationCountLabel }}: {{ confidenceList.length }} 件
          </span>
        </el-form-item>
      </el-form>
      </div>
    </el-aside>
    <el-dialog
      title="ラベルを選択"
      :visible.sync="labelDialogVisible"
      width="360px"
      append-to-body
      :close-on-click-modal="false"
      @closed="handleLabelDialogClosed"
    >
      <el-select
        v-model="pendingLabelText"
        class="label-dialog-select"
        filterable
        placeholder="ラベルを選択"
      >
        <el-option
          v-for="option in options"
          :key="option"
          :label="option"
          :value="option"
        />
      </el-select>
      <span slot="footer" class="dialog-footer">
        <el-button @click="labelDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" @click="confirmPendingLabelSelection">
          決定
        </el-button>
      </span>
    </el-dialog>
  </el-container>
</template>

<script>
import { fabric } from "fabric";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default {
  name: "LabelPage",
  props: {
    pageConfig: {
      type: Object,
      default: () => ({}),
    },
    initialImageFiles: {
      type: Array,
      default: () => [],
    },
    initialAnnotationFiles: {
      type: Array,
      default: () => [],
    },
    uploadSummary: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      canvas: null,
      scaledImageSize: null,
      selectedText: "",
      colorMap: {},
      isDrawing: false,
      images: [],
      thumbnails: [],
      currentImageIndex: 0,
      annotations: {},
      fileNames: [],
      imageRelativePaths: [],
      confidenceDisplayText: "",
      confidenceList: [],
      selectedAnnoRadio: null,
      scaleFactor: 1,
      panX: 0,
      panY: 0,
      drawingCleanup: null,
      labelDialogVisible: false,
      pendingLabelText: "",
      pendingDrawRectData: null,
      editingAnnotationTarget: null,
      isApplyingAnnotationHistory: false,
      isSpacePressed: false,
      isPanning: false,
      isAnnotationPreviewHidden: false,
      hiddenActiveObject: null,
      panStartClientX: 0,
      panStartClientY: 0,
      panOriginX: 0,
      panOriginY: 0,
      undoStack: [],
      redoStack: [],
      annotationsLoaded: {},
      annotationSources: {},
      pendingServerImageName: "",
      lastImageSwitchHintAt: 0,
      thumbnailCenterRequestId: 0,
      layoutResizeObserver: null,
      canvasRelayoutFrameId: 0,
      uploadedAnnotationFiles: {
        exact: {},
        base: {},
      },
      statusJumpPointers: {
        empty: -1,
        ai: -1,
        modified: -1,
        abnormal: -1,
      },
    };
  },
  mounted() {
    this.initCanvas();
    this.startLayoutResizeObserver();
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("mouseup", this.handleGlobalMouseUp);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    this.canvas.on("selection:created", (e) => this.onCanvasSelection(e));
    this.canvas.on("selection:updated", (e) => this.onCanvasSelection(e));
    this.canvas.on("selection:cleared", () => this.onCanvasSelectionCleared());
    this.canvas.on("object:modified", this.handleAnnotationObjectModified);
    this.canvas.on("mouse:down", this.handleCanvasMouseDown);
    this.canvas.on("mouse:move", this.handleCanvasMouseMove);
    this.canvas.on("mouse:up", this.handleCanvasMouseUp);
    this.scheduleCanvasRelayout({ redrawImage: false, settleFrames: 2 });
    this.initializeFromProps();
  },
  beforeDestroy() {
    this.stopLayoutResizeObserver();
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("mouseup", this.handleGlobalMouseUp);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    if (this.canvas) {
      this.canvas.off("object:modified", this.handleAnnotationObjectModified);
      this.canvas.off("mouse:down", this.handleCanvasMouseDown);
      this.canvas.off("mouse:move", this.handleCanvasMouseMove);
      this.canvas.off("mouse:up", this.handleCanvasMouseUp);
    }
  },
  computed: {
    options() {
      return this.pageConfig.options || [];
    },
    classDictionary() {
      return this.pageConfig.classDictionary || {};
    },
    uploadType() {
      return this.pageConfig.uploadType || "three";
    },
    sortLocale() {
      return this.pageConfig.sortLocale || "ja";
    },
    requiredAnnotationCount() {
      return Number.isInteger(this.pageConfig.requiredAnnotationCount)
        ? this.pageConfig.requiredAnnotationCount
        : null;
    },
    keyboardCategoryShortcutCount() {
      return Number.isInteger(this.pageConfig.keyboardCategoryShortcutCount)
        ? this.pageConfig.keyboardCategoryShortcutCount
        : 0;
    },
    countWarningVisible() {
      return (
        this.requiredAnnotationCount !== null &&
        this.confidenceList.length !== this.requiredAnnotationCount
      );
    },
    countWarningText() {
      return this.pageConfig.countWarningText || "\u30e9\u30d9\u30eb\u6570\u7570\u5e38";
    },
    currentImageTitle() {
      return "\u73fe\u5728\u306e\u753b\u50cf";
    },
    uploadSummaryTitle() {
      return "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u72b6\u6cc1";
    },
    labelSummaryTitle() {
      return "\u30e9\u30d9\u30eb\u72b6\u6cc1";
    },
    toolPanelSubtitle() {
      return this.selectedText
        ? `${this.selectedText}\u3092\u9078\u629e\u4e2d`
        : "\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e";
    },
    annotationListTitle() {
      return "\u30e9\u30d9\u30eb\u4e00\u89a7";
    },
    annotationCountLabel() {
      return "\u30e9\u30d9\u30eb\u6570";
    },
    imageCountTitle() {
      return "\u753b\u50cf";
    },
    labelCountTitle() {
      return "\u30e9\u30d9\u30eb";
    },
    unmatchedLabelTitle() {
      return "\u672a\u30de\u30c3\u30c1\u30e9\u30d9\u30eb";
    },
    unmatchedImageTitle() {
      return "\u672a\u30de\u30c3\u30c1\u753b\u50cf";
    },
    emptyStatusTitle() {
      return "\u30e9\u30d9\u30eb\u306a\u3057";
    },
    aiStatusTitle() {
      return "AI\u8a8d\u8b58";
    },
    modifiedStatusTitle() {
      return "\u7de8\u96c6\u6e08\u307f";
    },
    abnormalStatusTitle() {
      return "\u7570\u5e38";
    },
    displayImageUploadCount() {
      return this.images.length || Number(this.uploadSummary.imageCount) || 0;
    },
    displayLabelUploadCount() {
      return Number(this.uploadSummary.labelCount) || 0;
    },
    displayUnmatchedImageCount() {
      return this.fileNames.filter((fileName, index) => {
        return this.getUploadedAnnotationText(fileName, index) === null;
      }).length;
    },
    displayUnmatchedLabelCount() {
      return this.initialAnnotationFiles.filter((file) => {
        return !this.doesAnnotationFileMatchAnyImage(file);
      }).length;
    },
    displayEmptyStatusCount() {
      return this.fileNames.filter((fileName) => {
        return this.getThumbnailStatusKey(fileName) === "empty";
      }).length;
    },
    displayAiStatusCount() {
      return this.fileNames.filter((fileName) => {
        return this.getThumbnailStatusKey(fileName) === "ai";
      }).length;
    },
    displayModifiedStatusCount() {
      return this.fileNames.filter((fileName) => {
        return this.getThumbnailStatusKey(fileName) === "modified";
      }).length;
    },
    displayAbnormalStatusCount() {
      return this.fileNames.filter((fileName) => {
        return this.getThumbnailStatusKey(fileName) === "abnormal";
      }).length;
    },
    currentImageName() {
      return this.fileNames[this.currentImageIndex] || "";
    },
    thumbnailStatusLabels() {
      return {
        ai: "AI\u8a8d\u8b58",
        modified: "\u7de8\u96c6\u6e08\u307f",
        empty: "\u30e9\u30d9\u30eb\u306a\u3057",
        abnormal: "\u7570\u5e38",
      };
    },
    canvasViewportStyle() {
      if (!this.canvas) {
        return {};
      }
      return {
        width: `${this.canvas.getWidth()}px`,
        height: `${this.canvas.getHeight()}px`,
      };
    },
    scaleStyle() {
      return {
        transform: `translate(${this.panX}px, ${this.panY}px) scale(${this.scaleFactor})`,
        transformOrigin: "0 0",
      };
    },
  },
  methods: {
    unknownClassText(classId) {
      return `\u672a\u77e5\u30af\u30e9\u30b9: ${classId}`;
    },
    handleBeforeUnload(event) {
      if (this.fileNames.length === 0) {
        return;
      }
      const message =
        "\u3053\u306e\u30da\u30fc\u30b8\u3067\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3057\u305f\u30c7\u30fc\u30bf\u306f\u3001\u30d6\u30e9\u30a6\u30b6\u3092\u9589\u3058\u308b\u3068\u5931\u308f\u308c\u307e\u3059\u3002\u7d9a\u884c\u3057\u307e\u3059\u304b\uff1f";
      event.preventDefault();
      event.returnValue = message;
      return message;
    },
    async initializeFromProps() {
      if (this.initialAnnotationFiles.length > 0) {
        await this.prepareInitialAnnotationFiles(this.initialAnnotationFiles);
      }
      if (this.initialImageFiles.length > 0) {
        await this.loadImageFiles(this.initialImageFiles);
      }
      this.scheduleCanvasRelayout({
        redrawImage: this.images.length > 0,
        settleFrames: 2,
      });
    },
    startLayoutResizeObserver() {
      if (
        typeof window === "undefined" ||
        typeof window.ResizeObserver === "undefined"
      ) {
        return;
      }
      this.stopLayoutResizeObserver();
      this.layoutResizeObserver = new window.ResizeObserver(() => {
        this.scheduleCanvasRelayout({
          redrawImage: this.images.length > 0,
          settleFrames: 1,
        });
      });
      [this.$refs.labeler, this.$refs.summaryPanel, this.$refs.canvasStageShell]
        .filter(Boolean)
        .forEach((element) => {
          this.layoutResizeObserver.observe(element);
        });
    },
    stopLayoutResizeObserver() {
      if (this.layoutResizeObserver) {
        this.layoutResizeObserver.disconnect();
        this.layoutResizeObserver = null;
      }
      if (this.canvasRelayoutFrameId) {
        window.cancelAnimationFrame(this.canvasRelayoutFrameId);
        this.canvasRelayoutFrameId = 0;
      }
    },
    scheduleCanvasRelayout({
      redrawImage = this.images.length > 0,
      settleFrames = 1,
    } = {}) {
      if (!this.canvas) {
        return;
      }
      if (this.canvasRelayoutFrameId) {
        window.cancelAnimationFrame(this.canvasRelayoutFrameId);
        this.canvasRelayoutFrameId = 0;
      }
      const runAfterFrames = (remainingFrames) => {
        this.canvasRelayoutFrameId = window.requestAnimationFrame(() => {
          if (remainingFrames > 0) {
            runAfterFrames(remainingFrames - 1);
            return;
          }
          this.canvasRelayoutFrameId = 0;
          this.relayoutCanvas(redrawImage);
        });
      };
      this.$nextTick(() => {
        runAfterFrames(Math.max(0, settleFrames));
      });
    },
    relayoutCanvas(redrawImage = this.images.length > 0) {
      if (!this.canvas) {
        return;
      }
      const previousWidth = this.canvas.getWidth();
      const previousHeight = this.canvas.getHeight();
      this.resizeCanvas();
      const nextWidth = this.canvas.getWidth();
      const nextHeight = this.canvas.getHeight();
      const sizeChanged =
        Math.abs(nextWidth - previousWidth) > 1 ||
        Math.abs(nextHeight - previousHeight) > 1;
      if (redrawImage && sizeChanged && this.images.length > 0) {
        this.displayImage(this.currentImageIndex);
      }
    },
    handleWheel(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    },
    handleKeyUp(event) {
      if (event.code === "Space") {
        this.isSpacePressed = false;
      }
      if (event.key && event.key.toLowerCase() === "h") {
        this.setAnnotationPreviewHidden(false);
      }
    },
    handleWindowBlur() {
      this.isSpacePressed = false;
      this.stopPan();
      this.setAnnotationPreviewHidden(false);
    },
    handleGlobalMouseUp() {
      this.stopPan();
    },
    handleLabelDialogClosed() {
      this.pendingDrawRectData = null;
      this.pendingLabelText = "";
      this.editingAnnotationTarget = null;
    },
    getClassKeyByText(text) {
      return Object.keys(this.classDictionary).find(
        (key) => this.classDictionary[key] === text
      );
    },
    configureAnnotationGroup(group, { editable = true } = {}) {
      if (!group) {
        return group;
      }
      group.set({
        originX: "left",
        originY: "top",
        selectable: true,
        hasControls: editable,
        lockMovementX: !editable,
        lockMovementY: !editable,
        lockRotation: true,
        hasRotatingPoint: false,
        transparentCorners: false,
        cornerStyle: "circle",
        padding: 2,
        hoverCursor: editable ? "move" : "crosshair",
        moveCursor: editable ? "move" : "crosshair",
      });
      if (group.setControlsVisibility) {
        group.setControlsVisibility({ mtr: false });
      }
      return group;
    },
    findAnnotationByGroup(
      group,
      fileName = this.fileNames[this.currentImageIndex]
    ) {
      const annotations = this.annotations[fileName] || [];
      const index = annotations.findIndex(
        (annotation) => annotation.fabricGroup === group
      );
      if (index === -1) {
        return null;
      }
      return {
        fileName,
        index,
        annotation: annotations[index],
      };
    },
    createAnnotationSnapshot(annotation) {
      if (!annotation) {
        return null;
      }
      return {
        text: annotation.text,
        class: annotation.class,
        relative: annotation.relative
          ? {
              left: annotation.relative.left,
              top: annotation.relative.top,
              width: annotation.relative.width,
              height: annotation.relative.height,
            }
          : null,
        fill: annotation.fill,
        conf: annotation.conf,
      };
    },
    areAnnotationSnapshotsEqual(leftSnapshot, rightSnapshot) {
      if (!leftSnapshot || !rightSnapshot) {
        return false;
      }
      return JSON.stringify(leftSnapshot) === JSON.stringify(rightSnapshot);
    },
    getNormalizedRelativeFromGroup(group) {
      if (!group || !this.canvas || !this.canvas.backgroundImage) {
        return null;
      }
      const rect = group.item(0);
      const img = this.canvas.backgroundImage;
      const relativeLeft = (group.left - img.left) / img.getScaledWidth();
      const relativeTop = (group.top - img.top) / img.getScaledHeight();
      const relativeWidth =
        (rect.width * (group.scaleX || 1)) / img.getScaledWidth();
      const relativeHeight =
        (rect.height * (group.scaleY || 1)) / img.getScaledHeight();
      return this.normalizeRelativeBox({
        left: relativeLeft,
        top: relativeTop,
        width: relativeWidth,
        height: relativeHeight,
      });
    },
    applyAnnotationSnapshot(
      fileName,
      annotation,
      snapshot,
      { activate = false } = {}
    ) {
      if (!annotation || !snapshot) {
        return;
      }
      const normalizedRelative = this.normalizeRelativeBox(snapshot.relative);
      if (
        !normalizedRelative ||
        normalizedRelative.width <= 0 ||
        normalizedRelative.height <= 0
      ) {
        return;
      }
      annotation.text = snapshot.text;
      annotation.class = snapshot.class;
      annotation.relative = normalizedRelative;
      annotation.fill = snapshot.fill;
      if (Object.prototype.hasOwnProperty.call(snapshot, "conf")) {
        annotation.conf = snapshot.conf;
      }
      this.$set(this.annotationSources, fileName, "manual");

      const isCurrentFile = this.fileNames[this.currentImageIndex] === fileName;
      if (isCurrentFile && this.canvas && this.canvas.backgroundImage) {
        const previousGroup = annotation.fabricGroup;
        const rebuiltGroup = this.buildFabricAnnotation(
          annotation,
          this.canvas.backgroundImage
        );
        if (previousGroup) {
          this.canvas.remove(previousGroup);
        }
        if (rebuiltGroup) {
          this.configureAnnotationGroup(rebuiltGroup, {
            editable: !this.isDrawing,
          });
          this.canvas.add(rebuiltGroup);
          if (activate && !this.isDrawing) {
            this.canvas.setActiveObject(rebuiltGroup);
          }
        }
      } else {
        annotation.fabricGroup = null;
      }

      this.refreshAnnotationSidebar();
      if (this.canvas) {
        this.canvas.renderAll();
      }
    },
    syncAnnotationFromGroup(group) {
      if (!group || group.type !== "group") {
        return null;
      }
      const found = this.findAnnotationByGroup(group);
      if (!found) {
        return null;
      }
      const normalizedRelative = this.getNormalizedRelativeFromGroup(group);
      if (!normalizedRelative) {
        return null;
      }
      const rect = group.item(0);
      const textObj = group.item(1);
      const nextSnapshot = {
        text: textObj.text,
        class: this.getClassKeyByText(textObj.text) || found.annotation.class,
        relative: normalizedRelative,
        fill: rect.stroke || found.annotation.fill,
        conf: found.annotation.conf,
      };
      this.applyAnnotationSnapshot(found.fileName, found.annotation, nextSnapshot, {
        activate: true,
      });
      return {
        fileName: found.fileName,
        annotation: found.annotation,
        snapshot: nextSnapshot,
      };
    },
    handleAnnotationObjectModified(option) {
      const group = option && option.target;
      if (
        !group ||
        group.type !== "group" ||
        this.isDrawing ||
        this.isApplyingAnnotationHistory
      ) {
        return;
      }
      const found = this.findAnnotationByGroup(group);
      if (!found) {
        return;
      }
      const beforeSnapshot = this.createAnnotationSnapshot(found.annotation);
      const syncResult = this.syncAnnotationFromGroup(group);
      if (!syncResult) {
        return;
      }
      const afterSnapshot = this.createAnnotationSnapshot(syncResult.annotation);
      if (this.areAnnotationSnapshotsEqual(beforeSnapshot, afterSnapshot)) {
        return;
      }
      this.undoStack.push({
        type: "update",
        fileName: syncResult.fileName,
        annotation: syncResult.annotation,
        beforeSnapshot,
        afterSnapshot,
      });
      this.redoStack = [];
    },
    openEditSelectedAnnotationLabelDialog() {
      if (this.isDrawing) {
        this.$message.warning(
          "編集中のラベルを変更する前に、描画モードを終了してください。"
        );
        return;
      }
      const activeObject = this.canvas && this.canvas.getActiveObject();
      if (activeObject && activeObject.type === "activeSelection") {
        this.$message.warning("複数選択したラベルは一括変更できません。");
        return;
      }
      if (!activeObject || activeObject.type !== "group") {
        this.$message.warning("変更するラベルを先に選択してください。");
        return;
      }
      const found = this.findAnnotationByGroup(activeObject);
      if (!found) {
        this.$message.warning("ラベル情報が見つかりません。");
        return;
      }
      this.pendingDrawRectData = null;
      this.pendingLabelText = found.annotation.text || this.options[0] || "";
      this.editingAnnotationTarget = {
        fileName: found.fileName,
        index: found.index,
        annotation: found.annotation,
        group: activeObject,
      };
      this.labelDialogVisible = true;
    },
    buildManualAnnotationGroup(rectData, labelText) {
      if (!rectData || !labelText) {
        return null;
      }
      const strokeColor = this.getColorForText(labelText);
      const rect = new fabric.Rect({
        left: rectData.left,
        top: rectData.top,
        width: rectData.width,
        height: rectData.height,
        fill: "rgba(144,238,144, 0.5)",
        stroke: strokeColor,
        strokeWidth: 5,
        selectable: false,
        evented: false,
      });
      const textObj = new fabric.Text(labelText, {
        left: rectData.left + rectData.width / 20,
        top: rectData.top + rectData.height / 20,
        originX: "left",
        originY: "top",
        fontSize: 20,
        fill: "#000",
        selectable: false,
        evented: false,
      });
      const group = new fabric.Group([rect, textObj], {
        left: rectData.left,
        top: rectData.top,
        originX: "left",
        originY: "top",
      });
      group.visible = !this.isAnnotationPreviewHidden;
      return this.configureAnnotationGroup(group, { editable: !this.isDrawing });
    },
    confirmPendingLabelSelection() {
      const labelText =
        this.pendingLabelText || this.selectedText || this.options[0];
      if (!labelText) {
        this.$message.error("ラベルを選択してください。");
        return;
      }
      if (this.editingAnnotationTarget) {
        const { annotation, fileName } = this.editingAnnotationTarget;
        const beforeSnapshot = this.createAnnotationSnapshot(annotation);
        const strokeColor = this.getColorForText(labelText);
        const afterSnapshot = {
          ...beforeSnapshot,
          text: labelText,
          class: this.getClassKeyByText(labelText) || annotation.class,
          fill: strokeColor,
        };
        this.isApplyingAnnotationHistory = true;
        this.applyAnnotationSnapshot(fileName, annotation, afterSnapshot, {
          activate: true,
        });
        this.isApplyingAnnotationHistory = false;
        if (!this.areAnnotationSnapshotsEqual(beforeSnapshot, afterSnapshot)) {
          this.undoStack.push({
            type: "update",
            fileName,
            annotation,
            beforeSnapshot,
            afterSnapshot,
          });
          this.redoStack = [];
        }
        this.selectedText = labelText;
        this.labelDialogVisible = false;
        return;
      }
      if (!this.pendingDrawRectData) {
        this.labelDialogVisible = false;
        return;
      }

      const group = this.buildManualAnnotationGroup(
        this.pendingDrawRectData,
        labelText
      );
      if (!group) {
        this.labelDialogVisible = false;
        return;
      }

      this.selectedText = labelText;
      this.configureAnnotationGroup(group, { editable: !this.isDrawing });
      this.canvas.add(group);
      this.saveAnnotation(group);

      const currentFileName = this.fileNames[this.currentImageIndex];
      const annotationList = this.annotations[currentFileName] || [];
      const newAnno = annotationList[annotationList.length - 1];
      if (newAnno) {
        this.undoStack.push({
          type: "add",
          fileName: currentFileName,
          annotation: newAnno,
        });
        this.redoStack = [];
      }

      if (!this.isDrawing) {
        this.canvas.setActiveObject(group);
      }
      this.canvas.renderAll();
      this.labelDialogVisible = false;
    },
    stopDrawingRect({ closeDialog = true } = {}) {
      if (closeDialog && this.labelDialogVisible) {
        this.labelDialogVisible = false;
      }
      const cleanup = this.drawingCleanup;
      if (cleanup) {
        this.drawingCleanup = null;
        cleanup();
      }
      this.pendingDrawRectData = null;
      this.pendingLabelText = "";
      this.editingAnnotationTarget = null;
    },
    setAnnotationPreviewHidden(hidden) {
      if (!this.canvas || this.isAnnotationPreviewHidden === hidden) {
        return;
      }
      if (hidden) {
        this.hiddenActiveObject = this.canvas.getActiveObject() || null;
        this.canvas.discardActiveObject();
      }
      this.canvas.forEachObject((obj) => {
        obj.visible = !hidden;
      });
      this.isAnnotationPreviewHidden = hidden;
      if (
        !hidden &&
        this.hiddenActiveObject &&
        this.canvas.getObjects().includes(this.hiddenActiveObject)
      ) {
        this.canvas.setActiveObject(this.hiddenActiveObject);
      }
      if (!hidden) {
        this.hiddenActiveObject = null;
      }
      this.canvas.renderAll();
    },
    isEditableTarget(target) {
      if (!target) {
        return false;
      }
      const tagName = target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) {
        return true;
      }
      if (target.isContentEditable) {
        return true;
      }
      return !!(target.closest && target.closest(".el-input, .el-textarea"));
    },
    getViewportSize() {
      if (!this.canvas) {
        return {
          width: 0,
          height: 0,
        };
      }
      return {
        width: this.canvas.getWidth(),
        height: this.canvas.getHeight(),
      };
    },
    clampPanPosition(nextX, nextY, scale = this.scaleFactor) {
      if (scale <= 1) {
        return {
          x: 0,
          y: 0,
        };
      }
      const { width, height } = this.getViewportSize();
      const minX = width - width * scale;
      const minY = height - height * scale;
      return {
        x: Math.min(0, Math.max(minX, nextX)),
        y: Math.min(0, Math.max(minY, nextY)),
      };
    },
    applyPanConstraints() {
      const clampedPan = this.clampPanPosition(this.panX, this.panY);
      this.panX = clampedPan.x;
      this.panY = clampedPan.y;
    },
    updateScale(nextScale) {
      const clampedScale = Math.min(Math.max(nextScale, 1), 5);
      if (!this.canvas) {
        this.scaleFactor = clampedScale;
        if (clampedScale <= 1) {
          this.panX = 0;
          this.panY = 0;
        }
        return;
      }
      const previousScale = this.scaleFactor;
      const { width, height } = this.getViewportSize();
      if (previousScale <= 0 || clampedScale === previousScale) {
        this.scaleFactor = clampedScale;
        this.applyPanConstraints();
        return;
      }
      const viewportCenterX = width / 2;
      const viewportCenterY = height / 2;
      const contentCenterX = (viewportCenterX - this.panX) / previousScale;
      const contentCenterY = (viewportCenterY - this.panY) / previousScale;
      const nextPanX = viewportCenterX - contentCenterX * clampedScale;
      const nextPanY = viewportCenterY - contentCenterY * clampedScale;
      this.scaleFactor = clampedScale;
      const clampedPan = this.clampPanPosition(nextPanX, nextPanY, clampedScale);
      this.panX = clampedPan.x;
      this.panY = clampedPan.y;
    },
    zoomIn() {
      this.updateScale(this.scaleFactor + 0.1);
    },
    zoomOut() {
      this.updateScale(this.scaleFactor - 0.1);
    },
    resetZoom() {
      this.updateScale(1);
      this.panX = 0;
      this.panY = 0;
    },
    selectCategoryByOffset(offset) {
      if (!this.options.length) {
        return;
      }
      const currentIndex = this.options.indexOf(this.selectedText);
      if (currentIndex === -1) {
        this.selectedText = offset > 0 ? this.options[0] : this.options[this.options.length - 1];
        return;
      }
      const nextIndex =
        (currentIndex + offset + this.options.length) % this.options.length;
      this.selectedText = this.options[nextIndex];
    },
    selectCategoryByShortcut(index) {
      if (index >= 0 && index < this.options.length) {
        this.selectedText = this.options[index];
      }
    },
    isPointerInsideImage(pointer) {
      const img = this.canvas && this.canvas.backgroundImage;
      if (!img) {
        return false;
      }
      const left = img.left;
      const top = img.top;
      const right = img.left + img.getScaledWidth();
      const bottom = img.top + img.getScaledHeight();
      return (
        pointer.x >= left &&
        pointer.x <= right &&
        pointer.y >= top &&
        pointer.y <= bottom
      );
    },
    startPan(clientX, clientY) {
      this.isPanning = true;
      this.panStartClientX = clientX;
      this.panStartClientY = clientY;
      this.panOriginX = this.panX;
      this.panOriginY = this.panY;
    },
    stopPan() {
      this.isPanning = false;
    },
    handleCanvasMouseDown(option) {
      if (
        this.isDrawing ||
        !this.canvas ||
        this.images.length === 0 ||
        this.scaleFactor <= 1
      ) {
        return;
      }
      if (!this.isSpacePressed) {
        return;
      }
      this.startPan(option.e.clientX, option.e.clientY);
      option.e.preventDefault();
      option.e.stopPropagation();
    },
    handleCanvasMouseMove(option) {
      if (!this.isPanning) {
        return;
      }
      const deltaX = option.e.clientX - this.panStartClientX;
      const deltaY = option.e.clientY - this.panStartClientY;
      const clampedPan = this.clampPanPosition(
        this.panOriginX + deltaX,
        this.panOriginY + deltaY
      );
      this.panX = clampedPan.x;
      this.panY = clampedPan.y;
      option.e.preventDefault();
      option.e.stopPropagation();
    },
    handleCanvasMouseUp() {
      this.stopPan();
    },
    handleAnnoRadioChange(newVal) {
      if (newVal === null) {
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
      } else {
        this.selectAnnotation(newVal);
      }
    },
    getThumbnailAsideElement() {
      const asideRef = this.$refs.thumbnailAside;
      return asideRef && asideRef.$el ? asideRef.$el : asideRef;
    },
    syncThumbnailScrollPadding() {
      const asideEl = this.getThumbnailAsideElement();
      const container = this.$refs.thumbnailsContainer;
      const sampleRef =
        this.$refs[`thumb-${this.currentImageIndex}`] ||
        this.$refs["thumb-0"];
      const sampleEl = Array.isArray(sampleRef) ? sampleRef[0] : sampleRef;
      if (!asideEl || !container || !sampleEl) {
        return;
      }
      const asideRect = asideEl.getBoundingClientRect();
      const listRect = container.getBoundingClientRect();
      const visibleTop = Math.max(listRect.top - asideRect.top, 0);
      const visibleHeight = Math.max(asideEl.clientHeight - visibleTop, 0);
      const spacer = Math.max((visibleHeight - sampleEl.offsetHeight) / 2, 16);
      container.style.paddingTop = `${spacer}px`;
      container.style.paddingBottom = `${spacer}px`;
    },
    scrollSelectedThumbToCenter(index) {
      const requestId = ++this.thumbnailCenterRequestId;
      this.$nextTick(() => {
        if (
          requestId !== this.thumbnailCenterRequestId ||
          index !== this.currentImageIndex
        ) {
          return;
        }
        window.requestAnimationFrame(() => {
          if (
            requestId !== this.thumbnailCenterRequestId ||
            index !== this.currentImageIndex
          ) {
            return;
          }
          const asideEl = this.getThumbnailAsideElement();
          const container = this.$refs.thumbnailsContainer;
          const ref = this.$refs[`thumb-${index}`];
          const el = Array.isArray(ref) ? ref[0] : ref;
          if (!asideEl || !container || !el) return;

          this.syncThumbnailScrollPadding();

          window.requestAnimationFrame(() => {
            if (
              requestId !== this.thumbnailCenterRequestId ||
              index !== this.currentImageIndex
            ) {
              return;
            }
            const asideRect = asideEl.getBoundingClientRect();
            const listRect = container.getBoundingClientRect();
            const itemRect = el.getBoundingClientRect();
            const currentScrollTop = asideEl.scrollTop;
            const visibleTop = Math.max(listRect.top - asideRect.top, 0);
            const visibleHeight = Math.max(
              asideEl.clientHeight - visibleTop,
              0
            );
            const currentCenter =
              itemRect.top - asideRect.top + itemRect.height / 2;
            const targetCenter = visibleTop + visibleHeight / 2;
            const rawTargetScrollTop =
              currentScrollTop + (currentCenter - targetCenter);
            const maxScrollTop = Math.max(
              asideEl.scrollHeight - asideEl.clientHeight,
              0
            );
            const targetScrollTop = Math.min(
              Math.max(0, rawTargetScrollTop),
              maxScrollTop
            );

            asideEl.scrollTop = targetScrollTop;
          });
        });
      });
    },
    onCanvasSelection(e) {
      const activeObj = this.canvas && this.canvas.getActiveObject();
      if (!activeObj) {
        this.selectedAnnoRadio = null;
        return;
      }
      if (activeObj.type === "activeSelection") {
        activeObj.set({
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          hasControls: false,
          hasRotatingPoint: false,
        });
        this.canvas.renderAll();
        this.selectedAnnoRadio = null;
        return;
      }
      if (activeObj.type !== "group") return;
      const currentFileName = this.fileNames[this.currentImageIndex];
      const currentAnnotations = this.annotations[currentFileName] || [];
      const foundIndex = currentAnnotations.findIndex(
        (a) => a.fabricGroup === activeObj
      );
      if (foundIndex !== -1) {
        this.selectedAnnoRadio = foundIndex;
      }
    },
    onCanvasSelectionCleared() {
      this.selectedAnnoRadio = null;
    },
    generateConfidenceDisplay() {
      const currentFileName = this.fileNames[this.currentImageIndex];
      const currentAnnotations = this.annotations[currentFileName] || [];
      const str = currentAnnotations
        .map((item) => {
          const classText =
            this.classDictionary[item.class] || this.unknownClassText(item.class);
          const confText =
            item.conf === 0 || item.conf ? item.conf.toFixed(2) : "N/A";
          return `"${classText}": "${confText}"`;
        })
        .join("\n");
      const list = currentAnnotations.map((item, idx) => {
        const classText =
          this.classDictionary[item.class] || this.unknownClassText(item.class);
        const confText =
          item.conf === 0 || item.conf ? item.conf.toFixed(2) : "N/A";
        return {
          index: idx,
          classText: classText,
          confText: confText,
        };
      });
      this.confidenceList = list;
      return str;
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    triggerAnnotationUpload() {
      this.$refs.annotationInput.click();
    },
    initCanvas() {
      this.canvas = new fabric.Canvas("canvas");
      this.resizeCanvas();
      this.canvas.selection = true;
      this.canvas.selectionKey = "shiftKey";
      this.canvas.preserveObjectStacking = true;
      this.canvas.hoverCursor = "pointer";
      this.canvas.backgroundColor = "lightgray";
      this.canvas.renderAll();
    },
    handleWindowResize() {
      if (!this.canvas) {
        return;
      }
      this.scheduleCanvasRelayout({
        redrawImage: this.images.length > 0,
        settleFrames: 1,
      });
    },
    resizeCanvas() {
      const stageShell = this.$refs.canvasStageShell;
      const labeler = this.$refs.labeler;
      const summaryPanel = this.$refs.summaryPanel;
      const stagePadding = 0;
      const targetWidth = stageShell
        ? Math.max(stageShell.clientWidth - stagePadding, 320)
        : Math.max(labeler.clientWidth, 320);
      const labelerHeight = labeler ? labeler.clientHeight : 0;
      const summaryHeight = summaryPanel ? summaryPanel.offsetHeight : 0;
      const canvasHeightFromLayout = labelerHeight
        ? labelerHeight - summaryHeight - 20
        : 0;
      const targetHeight = Math.max(
        Math.min(canvasHeightFromLayout || window.innerHeight * 0.6, window.innerHeight * 0.68),
        280
      );
      this.canvas.setWidth(targetWidth);
      this.canvas.setHeight(targetHeight);
      this.canvas.renderAll();
      this.applyPanConstraints();
    },
    clearCanvasAndData() {
      this.canvas.clear();
      this.scaledImageSize = null;
      this.selectedAnnoRadio = null;
      this.panX = 0;
      this.panY = 0;
      this.stopPan();
    },
    resetStatusJumpPointers() {
      this.statusJumpPointers = {
        empty: -1,
        ai: -1,
        modified: -1,
        abnormal: -1,
      };
    },
    refreshAnnotationSidebar() {
      this.confidenceDisplayText = this.generateConfidenceDisplay();
      if (this.confidenceList.length === 0) {
        this.selectedAnnoRadio = null;
      }
    },
    getAnnotationCount(fileName) {
      const currentAnnotations = this.annotations[fileName];
      return Array.isArray(currentAnnotations) ? currentAnnotations.length : 0;
    },
    hasAbnormalAnnotationCount(fileName) {
      if (this.requiredAnnotationCount === null) {
        return false;
      }
      const annotationCount = this.getAnnotationCount(fileName);
      return (
        annotationCount > 0 &&
        annotationCount !== this.requiredAnnotationCount
      );
    },
    getThumbnailStatusKey(fileName) {
      const annotationCount = this.getAnnotationCount(fileName);
      if (annotationCount === 0) {
        return "empty";
      }
      if (this.hasAbnormalAnnotationCount(fileName)) {
        return "abnormal";
      }
      if (this.annotationSources[fileName] === "server") {
        return "ai";
      }
      return "modified";
    },
    getThumbnailStatusClass(fileName) {
      return `status-${this.getThumbnailStatusKey(fileName)}`;
    },
    getThumbnailStatusLabel(fileName) {
      const statusKey = this.getThumbnailStatusKey(fileName);
      return this.thumbnailStatusLabels[statusKey];
    },
    clampUnitValue(value) {
      return Math.min(1, Math.max(0, Number(value) || 0));
    },
    normalizeRelativeBox(relative) {
      if (!relative) {
        return null;
      }
      const rawLeft = Number(relative.left);
      const rawTop = Number(relative.top);
      const rawWidth = Number(relative.width);
      const rawHeight = Number(relative.height);
      if ([rawLeft, rawTop, rawWidth, rawHeight].some(Number.isNaN)) {
        return null;
      }
      const left = this.clampUnitValue(rawLeft);
      const top = this.clampUnitValue(rawTop);
      const right = this.clampUnitValue(rawLeft + Math.max(0, rawWidth));
      const bottom = this.clampUnitValue(rawTop + Math.max(0, rawHeight));
      return {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };
    },
    getSafeExportMetrics(relative) {
      const normalized = this.normalizeRelativeBox(relative);
      if (!normalized || normalized.width <= 0 || normalized.height <= 0) {
        return null;
      }
      const precision = 1000000;
      const centerX = normalized.left + normalized.width / 2;
      const centerY = normalized.top + normalized.height / 2;
      const centerXInt = Math.min(
        precision,
        Math.max(0, Math.round(centerX * precision))
      );
      const centerYInt = Math.min(
        precision,
        Math.max(0, Math.round(centerY * precision))
      );
      let widthInt = Math.min(
        precision,
        Math.max(0, Math.round(normalized.width * precision))
      );
      let heightInt = Math.min(
        precision,
        Math.max(0, Math.round(normalized.height * precision))
      );
      widthInt = Math.min(
        widthInt,
        2 * Math.min(centerXInt, precision - centerXInt)
      );
      heightInt = Math.min(
        heightInt,
        2 * Math.min(centerYInt, precision - centerYInt)
      );
      return {
        centerX: (centerXInt / precision).toFixed(6),
        centerY: (centerYInt / precision).toFixed(6),
        width: (widthInt / precision).toFixed(6),
        height: (heightInt / precision).toFixed(6),
      };
    },
    getImageIndexesByStatus(statusKey) {
      return this.fileNames.reduce((matchedIndexes, fileName, index) => {
        if (this.getThumbnailStatusKey(fileName) === statusKey) {
          matchedIndexes.push(index);
        }
        return matchedIndexes;
      }, []);
    },
    jumpToNextStatusImage(statusKey) {
      const matchedIndexes = this.getImageIndexesByStatus(statusKey);
      if (matchedIndexes.length === 0) {
        return;
      }
      const currentPointer = Number.isInteger(this.statusJumpPointers[statusKey])
        ? this.statusJumpPointers[statusKey]
        : -1;
      const nextPointer = (currentPointer + 1) % matchedIndexes.length;
      if (this.selectImage(matchedIndexes[nextPointer])) {
        this.$set(this.statusJumpPointers, statusKey, nextPointer);
      }
    },
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    loadFabricImage(data) {
      return new Promise((resolve) => {
        fabric.Image.fromURL(data, (img) => resolve(img));
      });
    },
    async prepareInitialAnnotationFiles(inputFiles) {
      const files = Array.from(inputFiles || [])
        .filter((file) => file.name.toLowerCase().endsWith(".txt"))
        .sort((a, b) =>
          (a.webkitRelativePath || a.name).localeCompare(
            b.webkitRelativePath || b.name,
            this.sortLocale,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );
      if (files.length === 0) {
        this.uploadedAnnotationFiles = {
          exact: {},
          base: {},
        };
        return;
      }
      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve({
                  imageName: this.getFileNameWithoutExt(file.name),
                  relativePath: file.webkitRelativePath || file.name,
                  content: e.target.result || "",
                });
              };
              reader.onerror = () => resolve(null);
              reader.readAsText(file);
            })
        )
      );
      const parsedMap = {
        exact: {},
        base: {},
      };
      results.filter(Boolean).forEach((item) => {
        const exactKey = this.getMatchKeyWithoutExt(item.relativePath);
        const baseKey = this.getMatchKeyWithoutExt(item.imageName);
        parsedMap.exact[exactKey] = item.content;
        if (!Object.prototype.hasOwnProperty.call(parsedMap.base, baseKey)) {
          parsedMap.base[baseKey] = item.content;
        }
      });
      this.uploadedAnnotationFiles = parsedMap;
      this.annotationsLoaded = {};
    },
    async loadImageFiles(inputFiles) {
      this.clearCanvasAndData();
      this.resetStatusJumpPointers();
      this.images = [];
      this.thumbnails = [];
      this.annotations = {};
      this.fileNames = [];
      this.imageRelativePaths = [];
      this.currentImageIndex = 0;
      this.undoStack = [];
      this.redoStack = [];
      this.annotationsLoaded = {};
      this.annotationSources = {};
      this.pendingServerImageName = "";
      this.lastImageSwitchHintAt = 0;
      const files = Array.from(inputFiles || [])
        .filter((file) => file.type.startsWith("image/"))
        .sort((a, b) =>
          (a.webkitRelativePath || a.name).localeCompare(
            b.webkitRelativePath || b.name,
            this.sortLocale,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );
      if (files.length === 0) {
        this.$message.warning("\u5229\u7528\u53ef\u80fd\u306a\u753b\u50cf\u30d5\u30a1\u30a4\u30eb\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002");
        return;
      }
      const loadedImages = await Promise.all(
        files.map(async (file) => {
          const data = await this.readFileAsDataURL(file);
          const [img, thumbnail] = await Promise.all([
            this.loadFabricImage(data),
            this.createThumbnail(data),
          ]);
          return {
            name: file.name,
            relativePath: file.webkitRelativePath || file.name,
            img,
            thumbnail,
          };
        })
      );
      this.images = loadedImages.map((item) => item.img);
      this.thumbnails = loadedImages.map((item) => item.thumbnail);
      this.fileNames = loadedImages.map((item) => item.name);
      this.imageRelativePaths = loadedImages.map((item) => item.relativePath);
      loadedImages.forEach((item, index) => {
        const uploadedAnnotations = this.getUploadedAnnotationsForImage(
          item.name,
          index
        );
        this.$set(this.annotations, item.name, uploadedAnnotations || []);
        if (uploadedAnnotations) {
          this.$set(this.annotationSources, item.name, "local");
          this.annotationsLoaded[item.name] = true;
        }
      });
      this.displayImage(0);
      this.scheduleCanvasRelayout({ redrawImage: true, settleFrames: 2 });
    },
    async uploadImages(event) {
      await this.loadImageFiles(event.target.files || []);
    },
    async loadAnnotationFiles(inputFiles, { showMessage = true } = {}) {
      const files = Array.from(inputFiles || [])
        .filter((file) => file.name.toLowerCase().endsWith(".txt"))
        .sort((a, b) =>
          (a.webkitRelativePath || a.name).localeCompare(
            b.webkitRelativePath || b.name,
            this.sortLocale,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );
      if (files.length === 0) {
        this.uploadedAnnotationFiles = {
          exact: {},
          base: {},
        };
        this.$message.warning("\u5229\u7528\u53ef\u80fd\u306a\u30e9\u30d9\u30eb\u30c6\u30ad\u30b9\u30c8\u30d5\u30a1\u30a4\u30eb\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002");
        return;
      }
      const tasks = files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                imageName: this.getFileNameWithoutExt(file.name),
                relativePath: file.webkitRelativePath || file.name,
                content: e.target.result || "",
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
          })
      );
      Promise.all(tasks).then((results) => {
        const parsedMap = {
          exact: {},
          base: {},
        };
        results.filter(Boolean).forEach((item) => {
          const exactKey = this.getMatchKeyWithoutExt(item.relativePath);
          const baseKey = this.getMatchKeyWithoutExt(item.imageName);
          parsedMap.exact[exactKey] = item.content;
          if (!Object.prototype.hasOwnProperty.call(parsedMap.base, baseKey)) {
            parsedMap.base[baseKey] = item.content;
          }
        });
        this.uploadedAnnotationFiles = parsedMap;
        this.annotationsLoaded = {};
        this.rebuildAnnotationsFromUploads();
        const imageCount = this.fileNames.length;
        const matchedCount = this.fileNames.filter((fileName, index) =>
          this.getUploadedAnnotationsForImage(fileName, index) !== null
        ).length;
        this.$message.success(
          `\u30e9\u30d9\u30eb\u30d5\u30a1\u30a4\u30eb ${Object.keys(parsedMap.exact).length} \u4ef6\u3001\u753b\u50cf ${imageCount} \u679a\u3001\u30de\u30c3\u30c1 ${matchedCount} \u679a`
        );
      });
    },
    async uploadAnnotations(event) {
      await this.loadAnnotationFiles(event.target.files || []);
    },
    getFileNameWithoutExt(fileName) {
      const lastDotIndex = fileName.lastIndexOf(".");
      return lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex);
    },
    getMatchKeyWithoutExt(filePath) {
      const normalizedPath = String(filePath || "").replace(/\\/g, "/");
      return this.getFileNameWithoutExt(normalizedPath).toLowerCase();
    },
    doesAnnotationFileMatchAnyImage(file) {
      const annotationExactKey = this.getMatchKeyWithoutExt(
        file.webkitRelativePath || file.name
      );
      const annotationBaseKey = this.getMatchKeyWithoutExt(
        this.getFileNameWithoutExt(file.name)
      );
      return this.fileNames.some((fileName, index) => {
        const imageRelativePath = this.imageRelativePaths[index] || fileName;
        const imageExactKey = this.getMatchKeyWithoutExt(imageRelativePath);
        const imageBaseKey = this.getMatchKeyWithoutExt(fileName);
        return (
          imageExactKey === annotationExactKey ||
          imageBaseKey === annotationBaseKey
        );
      });
    },
    rebuildAnnotationsFromUploads() {
      this.fileNames.forEach((fileName, index) => {
        const parsedAnnotations = this.getUploadedAnnotationsForImage(
          fileName,
          index
        );
        if (parsedAnnotations) {
          this.$set(this.annotations, fileName, parsedAnnotations);
          this.$set(this.annotationSources, fileName, "local");
          this.annotationsLoaded[fileName] = true;
        } else if (this.annotationSources[fileName] === "local") {
          this.$set(this.annotations, fileName, []);
          this.$delete(this.annotationSources, fileName);
          this.annotationsLoaded[fileName] = false;
        }
      });
      if (this.images.length > 0) {
        this.displayImage(this.currentImageIndex || 0);
      }
    },
    lockImageSwitchForServerRequest(fileName) {
      this.pendingServerImageName = fileName;
    },
    releaseImageSwitchForServerRequest(fileName) {
      if (this.pendingServerImageName === fileName) {
        this.pendingServerImageName = "";
      }
    },
    getUploadedAnnotationText(fileName, imageIndex = this.currentImageIndex) {
      const relativePath = this.imageRelativePaths[imageIndex] || fileName;
      const exactKey = this.getMatchKeyWithoutExt(relativePath);
      const baseKey = this.getMatchKeyWithoutExt(fileName);
      if (
        Object.prototype.hasOwnProperty.call(
          this.uploadedAnnotationFiles.exact,
          exactKey
        )
      ) {
        return this.uploadedAnnotationFiles.exact[exactKey];
      }
      if (
        Object.prototype.hasOwnProperty.call(
          this.uploadedAnnotationFiles.base,
          baseKey
        )
      ) {
        return this.uploadedAnnotationFiles.base[baseKey];
      }
      return null;
    },
    getUploadedAnnotationsForImage(
      fileName,
      imageIndex = this.currentImageIndex
    ) {
      const annotationText = this.getUploadedAnnotationText(fileName, imageIndex);
      if (annotationText === null || annotationText === undefined) {
        return null;
      }
      return this.parseAnnotationText(annotationText);
    },
    parseAnnotationText(content) {
      const lines = (content || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return lines
        .map((line) => this.parseAnnotationLine(line))
        .filter(Boolean);
    },
    parseAnnotationLine(line) {
      const parts = line.split(/\s+/);
      if (parts.length < 5) {
        return null;
      }
      const classId = parts[0];
      const centerX = parseFloat(parts[1]);
      const centerY = parseFloat(parts[2]);
      const width = parseFloat(parts[3]);
      const height = parseFloat(parts[4]);
      if (
        [centerX, centerY, width, height].some((value) => Number.isNaN(value))
      ) {
        return null;
      }
      const left = centerX - width / 2;
      const top = centerY - height / 2;
      const text = this.classDictionary[classId] || this.unknownClassText(classId);
      const normalizedRelative = this.normalizeRelativeBox({
        left,
        top,
        width,
        height,
      });
      if (
        !normalizedRelative ||
        normalizedRelative.width <= 0 ||
        normalizedRelative.height <= 0
      ) {
        return null;
      }
      return {
        text,
        class: classId,
        relative: normalizedRelative,
        fill: this.getColorForText(text),
      };
    },
    createThumbnail(data) {
      return new Promise((resolve) => {
        const thumbnail = new Image();
        thumbnail.src = data;
        thumbnail.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(thumbnail, 0, 0, 100, 100);
          resolve(canvas.toDataURL());
        };
      });
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
      this.applyPanConstraints();
      this.currentImageIndex = index;
      this.refreshAnnotationSidebar();
      this.scrollSelectedThumbToCenter(index);
      this.restoreAnnotations();
    },
    selectImage(index) {
      if (index !== this.currentImageIndex && this.pendingServerImageName) {
        const now = Date.now();
        if (now - this.lastImageSwitchHintAt >= 1000) {
          this.lastImageSwitchHintAt = now;
          this.$message.info(
            "\u73fe\u5728\u306e\u753b\u50cf\u306e AI \u8a8d\u8b58\u7d50\u679c\u3092\u53d6\u5f97\u4e2d\u3067\u3059\u3002\u5fdc\u7b54\u304c\u8fd4\u3063\u3066\u304b\u3089\u6b21\u306e\u753b\u50cf\u3078\u5207\u308a\u66ff\u3048\u3066\u304f\u3060\u3055\u3044\u3002"
          );
        }
        return false;
      }
      this.undoStack = [];
      this.redoStack = [];
      this.displayImage(index);
      return true;
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
    clampPointerToImage(pointer) {
      const img = this.canvas.backgroundImage;
      if (!img) return pointer;
      const left = img.left;
      const top = img.top;
      const right = img.left + img.getScaledWidth();
      const bottom = img.top + img.getScaledHeight();
      return {
        x: Math.min(Math.max(pointer.x, left), right),
        y: Math.min(Math.max(pointer.y, top), bottom),
      };
    },
    startDrawingRect() {
      if (this.isDrawing) {
        this.$message.error(
          "\u63cf\u753b\u4e2d\u3067\u3059\u3002\u73fe\u5728\u306e\u63cf\u753b\u304c\u5b8c\u4e86\u3057\u3066\u304b\u3089\u65b0\u3057\u3044\u30e9\u30d9\u30eb\u3092\u958b\u59cb\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
        );
        return;
      }
      if (this.labelDialogVisible) {
        this.$message.error(
          "\u30e9\u30d9\u30eb\u9078\u629e\u30c0\u30a4\u30a2\u30ed\u30b0\u3092\u5148\u306b\u9589\u3058\u3066\u304f\u3060\u3055\u3044\u3002"
        );
        return;
      }
      if (!this.options.length) {
        this.$message.error(
          "\u5229\u7528\u3067\u304d\u308b\u30e9\u30d9\u30eb\u304c\u3042\u308a\u307e\u305b\u3093\u3002"
        );
        return;
      }
      if (!this.canvas || !this.canvas.backgroundImage) {
        this.$message.error(
          "\u5148\u306b\u753b\u50cf\u307e\u305f\u306f PDF \u30da\u30fc\u30b8\u3092\u8868\u793a\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
        );
        return;
      }

      this.isDrawing = true;

      this.canvas.selection = false;
      this.canvas.discardActiveObject();
      this.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.hasControls = false;
        obj.hoverCursor = "crosshair";
        obj.moveCursor = "crosshair";
      });
      this.canvas.defaultCursor = "crosshair";
      this.canvas.renderAll();

      let rect = null;
      let origX = 0;
      let origY = 0;

      const strokeColor = this.selectedText
        ? this.getColorForText(this.selectedText)
        : "rgba(109, 132, 247, 0.9)";
      const fillColor = "rgba(144,238,144, 0.5)";

      const cleanupDrawingMode = () => {
        if (rect) {
          this.canvas.remove(rect);
          rect = null;
        }
        this.isDrawing = false;
        this.canvas.defaultCursor = "default";
        this.canvas.selection = true;
        if (this.drawingCleanup === cleanupDrawingMode) {
          this.drawingCleanup = null;
        }

        this.canvas.forEachObject((obj) => {
          obj.selectable = true;
          if (obj.type === "group") {
            this.configureAnnotationGroup(obj, { editable: true });
          } else {
            obj.hasControls = false;
            obj.hoverCursor = "move";
            obj.moveCursor = "move";
          }
        });

        this.canvas.off("mouse:down", onMouseDown);
        this.canvas.off("mouse:move", onMouseMove);
        this.canvas.off("mouse:up", onMouseUp);

        this.canvas.renderAll();
      };
      this.drawingCleanup = cleanupDrawingMode;

      const onMouseDown = (o) => {
        let pointer = this.canvas.getPointer(o.e);
        pointer = this.clampPointerToImage(pointer);

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
          stroke: strokeColor,
          strokeWidth: 5,
          selectable: false,
          evented: false,
        });

        this.canvas.add(rect);
      };

      const onMouseMove = (o) => {
        if (!rect) return;

        let pointer = this.canvas.getPointer(o.e);
        pointer = this.clampPointerToImage(pointer);

        const x1 = origX;
        const y1 = origY;
        const x2 = pointer.x;
        const y2 = pointer.y;

        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        rect.set({ left, top, width, height });
        this.canvas.renderAll();
      };

      const onMouseUp = () => {
        if (!rect) {
          return;
        }

        const img = this.canvas.backgroundImage;
        if (img) {
          const minL = img.left;
          const minT = img.top;
          const maxR = img.left + img.getScaledWidth();
          const maxB = img.top + img.getScaledHeight();

          const r = rect.left + rect.width;
          const b = rect.top + rect.height;

          const newL = Math.min(Math.max(rect.left, minL), maxR);
          const newT = Math.min(Math.max(rect.top, minT), maxB);
          const newR = Math.min(Math.max(r, minL), maxR);
          const newB = Math.min(Math.max(b, minT), maxB);

          rect.set({
            left: newL,
            top: newT,
            width: Math.max(0, newR - newL),
            height: Math.max(0, newB - newT),
          });
        }

        if (rect.width < 5 || rect.height < 5) {
          this.canvas.remove(rect);
          rect = null;
          this.$message.info(
            "\u30e9\u30d9\u30eb\u304c\u5c0f\u3055\u3059\u304e\u308b\u305f\u3081\u30ad\u30e3\u30f3\u30bb\u30eb\u3057\u307e\u3057\u305f\u3002"
          );
          this.canvas.renderAll();
          return;
        }

        const pendingRectData = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        this.canvas.remove(rect);
        rect = null;
        this.pendingDrawRectData = pendingRectData;
        this.pendingLabelText = this.selectedText || this.options[0] || "";
        this.labelDialogVisible = true;
      };

      this.canvas.on("mouse:down", onMouseDown);
      this.canvas.on("mouse:move", onMouseMove);
      this.canvas.on("mouse:up", onMouseUp);
    },
    deleteSelectedRect() {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject && activeObject.type === "activeSelection") {
        const currentFileName = this.fileNames[this.currentImageIndex];
        const deleteTargets = activeObject
          .getObjects()
          .filter((obj) => obj.type === "group")
          .map((group) => {
            const found = this.findAnnotationByGroup(group, currentFileName);
            return found
              ? {
                  fileName: currentFileName,
                  annotation: found.annotation,
                }
              : null;
          })
          .filter(Boolean);
        if (deleteTargets.length === 0) {
          this.$message.warning(
            "\u9078\u629e\u3055\u308c\u305f\u30e9\u30d9\u30eb\u304c\u3042\u308a\u307e\u305b\u3093\u3002"
          );
          return;
        }
        this.undoStack.push({
          type: "delete-multiple",
          items: deleteTargets,
        });
        this.redoStack = [];
        deleteTargets.forEach(({ fileName, annotation }) => {
          const annoArr = this.annotations[fileName];
          if (annoArr) {
            const idx = annoArr.indexOf(annotation);
            if (idx !== -1) {
              annoArr.splice(idx, 1);
            }
          }
          this.$set(this.annotationSources, fileName, "manual");
          if (annotation.fabricGroup) {
            this.canvas.remove(annotation.fabricGroup);
          }
        });
        this.canvas.discardActiveObject();
        this.$message.success(
          "\u9078\u629e\u3055\u308c\u305f\u30e9\u30d9\u30eb\u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002"
        );
      } else if (activeObject && activeObject.type === "group") {
        const currentFileName = this.fileNames[this.currentImageIndex];
        const found = this.findAnnotationByGroup(activeObject, currentFileName);
        const annotationIndex = found ? found.index : -1;
        if (annotationIndex !== -1) {
          const removed = this.annotations[currentFileName][annotationIndex];
          this.undoStack.push({
            type: "delete",
            fileName: currentFileName,
            annotation: removed,
          });
          this.redoStack = [];
          this.annotations[currentFileName].splice(annotationIndex, 1);
          this.$set(this.annotationSources, currentFileName, "manual");
          this.canvas.remove(activeObject);
          this.$message.success(
            "\u9078\u629e\u3055\u308c\u305f\u30e9\u30d9\u30eb\u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002"
          );
        }
      } else {
        this.$message.warning(
          "\u9078\u629e\u3055\u308c\u305f\u30e9\u30d9\u30eb\u304c\u3042\u308a\u307e\u305b\u3093\u3002"
        );
      }
      this.refreshAnnotationSidebar();
    },
    undo() {
      if (this.undoStack.length === 0) {
        this.$message.info(
          "\u3053\u308c\u4ee5\u4e0a\u3001\u53d6\u308a\u6d88\u3059\u64cd\u4f5c\u306f\u3042\u308a\u307e\u305b\u3093\u3002"
        );
        return;
      }
      const lastAction = this.undoStack.pop();
      this.redoStack.push(lastAction);
      if (lastAction.type === "add") {
        const { fileName, annotation } = lastAction;
        const annoArr = this.annotations[fileName];
        if (annoArr) {
          const idx = annoArr.indexOf(annotation);
          if (idx !== -1) {
            annoArr.splice(idx, 1);
            this.$set(this.annotationSources, fileName, "manual");
            if (annotation.fabricGroup) {
              this.canvas.remove(annotation.fabricGroup);
            }
          }
        }
      } else if (lastAction.type === "delete-multiple") {
        lastAction.items.forEach(({ fileName, annotation }) => {
          if (!this.annotations[fileName]) {
            this.annotations[fileName] = [];
          }
          this.annotations[fileName].push(annotation);
          this.$set(this.annotationSources, fileName, "manual");
          if (annotation.fabricGroup) {
            this.configureAnnotationGroup(annotation.fabricGroup, {
              editable: !this.isDrawing,
            });
            this.canvas.add(annotation.fabricGroup);
          }
        });
      } else if (lastAction.type === "delete") {
        const { fileName, annotation } = lastAction;
        if (!this.annotations[fileName]) {
          this.annotations[fileName] = [];
        }
        this.annotations[fileName].push(annotation);
        this.$set(this.annotationSources, fileName, "manual");
        if (annotation.fabricGroup) {
          this.configureAnnotationGroup(annotation.fabricGroup, {
            editable: !this.isDrawing,
          });
          this.canvas.add(annotation.fabricGroup);
        }
      } else if (lastAction.type === "update") {
        const { fileName, annotation, beforeSnapshot } = lastAction;
        this.isApplyingAnnotationHistory = true;
        this.applyAnnotationSnapshot(fileName, annotation, beforeSnapshot, {
          activate: true,
        });
        this.isApplyingAnnotationHistory = false;
      }
      this.canvas.renderAll();
      this.refreshAnnotationSidebar();
    },
    redo() {
      if (this.redoStack.length === 0) {
        this.$message.info(
          "\u3053\u308c\u4ee5\u4e0a\u3001\u3084\u308a\u76f4\u3059\u64cd\u4f5c\u306f\u3042\u308a\u307e\u305b\u3093\u3002"
        );
        return;
      }
      const action = this.redoStack.pop();
      this.undoStack.push(action);
      if (action.type === "add") {
        const { fileName, annotation } = action;
        if (!this.annotations[fileName]) {
          this.annotations[fileName] = [];
        }
        this.annotations[fileName].push(annotation);
        this.$set(this.annotationSources, fileName, "manual");
        if (annotation.fabricGroup) {
          this.configureAnnotationGroup(annotation.fabricGroup, {
            editable: !this.isDrawing,
          });
          this.canvas.add(annotation.fabricGroup);
        }
      } else if (action.type === "delete-multiple") {
        action.items.forEach(({ fileName, annotation }) => {
          const annoArr = this.annotations[fileName];
          if (annoArr) {
            const idx = annoArr.indexOf(annotation);
            if (idx !== -1) {
              annoArr.splice(idx, 1);
            }
          }
          this.$set(this.annotationSources, fileName, "manual");
          if (annotation.fabricGroup) {
            this.canvas.remove(annotation.fabricGroup);
          }
        });
      } else if (action.type === "delete") {
        const { fileName, annotation } = action;
        const annoArr = this.annotations[fileName];
        if (annoArr) {
          const idx = annoArr.indexOf(annotation);
          if (idx !== -1) {
            annoArr.splice(idx, 1);
            this.$set(this.annotationSources, fileName, "manual");
            if (annotation.fabricGroup) {
              this.canvas.remove(annotation.fabricGroup);
            }
          }
        }
      } else if (action.type === "update") {
        const { fileName, annotation, afterSnapshot } = action;
        this.isApplyingAnnotationHistory = true;
        this.applyAnnotationSnapshot(fileName, annotation, afterSnapshot, {
          activate: true,
        });
        this.isApplyingAnnotationHistory = false;
      }
      this.canvas.renderAll();
      this.refreshAnnotationSidebar();
    },
    saveAnnotation(group) {
      const text = group.item(1).text;
      const rect = group.item(0);
      const normalizedRelative = this.getNormalizedRelativeFromGroup(group);
      if (
        !normalizedRelative ||
        normalizedRelative.width <= 0 ||
        normalizedRelative.height <= 0
      ) {
        return;
      }
      const classKey = this.getClassKeyByText(text);
      const annotationData = {
        text: group.item(1).text,
        class: classKey || null,
        relative: normalizedRelative,
        fill: rect.stroke || rect.fill,
        fabricGroup: group,
      };
      group.visible = !this.isAnnotationPreviewHidden;
      const currentFileName = this.fileNames[this.currentImageIndex];
      if (!this.annotations[currentFileName]) {
        this.annotations[currentFileName] = [];
      }
      this.annotations[currentFileName].push(annotationData);
      this.$set(this.annotationSources, currentFileName, "manual");
      this.refreshAnnotationSidebar();
    },
    buildFabricAnnotation(annotation, img) {
      const normalizedRelative = this.normalizeRelativeBox(annotation.relative);
      if (
        !normalizedRelative ||
        normalizedRelative.width <= 0 ||
        normalizedRelative.height <= 0
      ) {
        return null;
      }
      annotation.relative = normalizedRelative;
      const scaledWidth = img.getScaledWidth();
      const scaledHeight = img.getScaledHeight();
      const imgLeft = img.left || 0;
      const imgTop = img.top || 0;
      const left = normalizedRelative.left * scaledWidth + imgLeft;
      const top = normalizedRelative.top * scaledHeight + imgTop;
      const width = normalizedRelative.width * scaledWidth;
      const height = normalizedRelative.height * scaledHeight;
      if (width <= 0 || height <= 0) {
        return null;
      }
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
        originX: "left",
        originY: "top",
      });
      group.visible = !this.isAnnotationPreviewHidden;
      annotation.fabricGroup = group;
      return this.configureAnnotationGroup(group, { editable: !this.isDrawing });
    },
    restoreAnnotations() {
      const currentFileName = this.fileNames[this.currentImageIndex];
      const uploadedAnnotations = this.getUploadedAnnotationsForImage(
        currentFileName
      );
      if (uploadedAnnotations) {
        this.$set(this.annotations, currentFileName, uploadedAnnotations);
        this.$set(this.annotationSources, currentFileName, "local");
      }
      const currentAnnotationData = this.annotations[currentFileName];
      const alreadyLoaded = this.annotationsLoaded[currentFileName];
      if (
        alreadyLoaded &&
        (!currentAnnotationData || currentAnnotationData.length === 0)
      ) {
        this.refreshAnnotationSidebar();
        return;
      }
      if (!alreadyLoaded) {
        this.annotationsLoaded[currentFileName] = true;
      }
      if (currentAnnotationData && currentAnnotationData.length > 0) {
        const img = this.canvas.backgroundImage;
        const drawableAnnotations = currentAnnotationData.filter((annotation) => {
          const group = this.buildFabricAnnotation(annotation, img);
          if (!group) {
            return false;
          }
          this.canvas.add(group);
          return true;
        });
        if (drawableAnnotations.length !== currentAnnotationData.length) {
          this.$set(this.annotations, currentFileName, drawableAnnotations);
        }
        this.refreshAnnotationSidebar();
        this.canvas.renderAll();
        return;
      }
      const requestImg = this.canvas.backgroundImage;
      const requestScaledWidth = requestImg ? requestImg.getScaledWidth() : 0;
      const requestScaledHeight = requestImg ? requestImg.getScaledHeight() : 0;
      this.lockImageSwitchForServerRequest(currentFileName);
      this.sendImageToServer(this.currentImageIndex)
        .then((response) => {
          const result = response?.result;
          if (Array.isArray(result) && result.length > 0) {
            const img = this.canvas.backgroundImage;
            const normalizationWidth =
              requestScaledWidth || (img ? img.getScaledWidth() : 0);
            const normalizationHeight =
              requestScaledHeight || (img ? img.getScaledHeight() : 0);
            if (!normalizationWidth || !normalizationHeight) {
              this.$set(this.annotations, currentFileName, []);
              this.refreshAnnotationSidebar();
              this.releaseImageSwitchForServerRequest(currentFileName);
              return;
            }
            const newAnnotations = result
              .map((item) => {
                const normalizedRelative = this.normalizeRelativeBox({
                  left: item.x0 / normalizationWidth,
                  top: item.y0 / normalizationHeight,
                  width: (item.x1 - item.x0) / normalizationWidth,
                  height: (item.y1 - item.y0) / normalizationHeight,
                });
                if (
                  !normalizedRelative ||
                  normalizedRelative.width <= 0 ||
                  normalizedRelative.height <= 0
                ) {
                  return null;
                }
                const convertedText =
                  this.classDictionary[item.class] ||
                  this.unknownClassText(item.class);
                const fillColor = this.getColorForText(convertedText);
                return {
                  conf: item.conf,
                  class: item.class,
                  text: convertedText,
                  relative: normalizedRelative,
                  fill: fillColor,
                };
              })
              .filter(Boolean);
            this.$set(this.annotations, currentFileName, newAnnotations);
            this.$set(this.annotationSources, currentFileName, "server");
            newAnnotations.forEach((annotation) => {
              const group = this.buildFabricAnnotation(annotation, img);
              if (group) {
                this.canvas.add(group);
              }
            });
            this.refreshAnnotationSidebar();
            this.canvas.renderAll();
          } else {
            this.$set(this.annotations, currentFileName, []);
            this.refreshAnnotationSidebar();
          }
          this.releaseImageSwitchForServerRequest(currentFileName);
        })
        .catch((error) => {
          console.error(
            "バックエンドからラベルの読み込み中に失敗しました:",
            error
          );
          this.releaseImageSwitchForServerRequest(currentFileName);
          this.refreshAnnotationSidebar();
        });
    },
    handleKeyDown(event) {
      if (this.isEditableTarget(event.target)) {
        return;
      }
      if (event.key === "Escape" && this.isDrawing) {
        event.preventDefault();
        this.stopDrawingRect();
        this.$message.info(
          "\u63cf\u753b\u3092\u30ad\u30e3\u30f3\u30bb\u30eb\u3057\u307e\u3057\u305f\u3002"
        );
        return;
      }
      if (this.labelDialogVisible) {
        return;
      }
      const normalizedKey = event.key.toLowerCase();
      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (event.code === "Space") {
        this.isSpacePressed = true;
        event.preventDefault();
        return;
      }

      if (isModifierPressed && normalizedKey === "z") {
        event.preventDefault();
        this.undo();
        return;
      }

      if (isModifierPressed && normalizedKey === "y") {
        event.preventDefault();
        this.redo();
        return;
      }

      if (
        isModifierPressed &&
        (event.key === "+" || event.key === "=" || event.code === "NumpadAdd")
      ) {
        event.preventDefault();
        this.zoomIn();
        return;
      }

      if (
        isModifierPressed &&
        (event.key === "-" || event.code === "NumpadSubtract")
      ) {
        event.preventDefault();
        this.zoomOut();
        return;
      }

      if (isModifierPressed && normalizedKey === "0") {
        event.preventDefault();
        this.resetZoom();
        return;
      }

      if (!isModifierPressed && normalizedKey === "h") {
        event.preventDefault();
        this.setAnnotationPreviewHidden(true);
        return;
      }

      if (!isModifierPressed && normalizedKey === "w") {
        event.preventDefault();
        this.startDrawingRect();
        return;
      }

      if (!isModifierPressed && normalizedKey === "r") {
        event.preventDefault();
        this.openEditSelectedAnnotationLabelDialog();
        return;
      }

      if (!isModifierPressed && normalizedKey === "q") {
        event.preventDefault();
        this.selectCategoryByOffset(-1);
        return;
      }

      if (!isModifierPressed && normalizedKey === "e") {
        event.preventDefault();
        this.selectCategoryByOffset(1);
        return;
      }

      if (
        !isModifierPressed &&
        /^[1-9]$/.test(event.key) &&
        Number(event.key) <= this.keyboardCategoryShortcutCount
      ) {
        event.preventDefault();
        const shortcutIndex = Number(event.key) - 1;
        this.selectCategoryByShortcut(shortcutIndex);
        return;
      }

      if (event.key === "Delete") {
        this.deleteSelectedRect();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (this.currentImageIndex < this.images.length - 1) {
          this.selectImage(this.currentImageIndex + 1);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (this.currentImageIndex > 0) {
          this.selectImage(this.currentImageIndex - 1);
        }
      }
    },
    exportRectData() {
      const zip = new JSZip();
      Object.entries(this.annotations).forEach(([fileName, annotations]) => {
        const processedAnnotations = annotations
          .map((annotation) => {
            const metrics = this.getSafeExportMetrics(annotation.relative);
            if (!metrics) {
              return null;
            }
            return `${annotation.class} ${metrics.centerX} ${metrics.centerY} ${metrics.width} ${metrics.height}\n`;
          })
          .filter(Boolean);
        const txtFileName = `${fileName.split(".")[0]}.txt`;
        const txtContent = processedAnnotations.join("");
        zip.file(txtFileName, txtContent);
      });
      zip.generateAsync({ type: "blob" }).then((blob) => {
        const today = new Date();
        const zipName = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today
          .getDate()
          .toString()
          .padStart(2, "0")}.zip`;
        saveAs(blob, zipName);
        this.$message.success("\u30e9\u30d9\u30eb\u3092 ZIP \u30d5\u30a1\u30a4\u30eb\u306b\u51fa\u529b\u3057\u307e\u3057\u305f\u3002");
      });
    },
    async sendImageToServer(index) {
      const img = this.images[index];
      const dataURL = img.toDataURL({
        format: "png",
        quality: 1,
      });
      const formData = new FormData();
      const blob = this.dataURLtoBlob(dataURL);
      formData.append("image", blob, this.fileNames[index]);
      formData.append("type", this.uploadType);
      try {
        const response = await axios.post(
          "http://172.16.1.75:6001/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("\u753b\u50cf\u306e\u9001\u4fe1\u4e2d\u306b\u5931\u6557\u3057\u307e\u3057\u305f:", error);
      }
    },
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
        this.$message.warning("\u30e9\u30d9\u30eb\u30aa\u30d6\u30b8\u30a7\u30af\u30c8\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002");
        return;
      }
      this.canvas.setActiveObject(targetAnno.fabricGroup);
      this.canvas.renderAll();
    },
  },
};
</script>

<style scoped>
#canvas {
  display: block;
}

.label-workspace {
  height: 90vh;
  padding: 0 20px;
  gap: 20px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #eef3f9 0%, #f7f9fc 42%, #f3f6fb 100%);
  overflow: hidden;
}

.workspace-aside,
.main {
  padding: 20px 0;
  min-width: 0;
  min-height: 0;
}

.workspace-aside {
  overflow: hidden;
}

.workspace-aside-left {
  overflow-y: auto;
  overflow-x: hidden;
}

.workspace-panel,
.workspace-main-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 1px solid #dfe7f3;
  border-radius: 28px;
  background: #ffffff;
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.06),
    0 4px 10px rgba(15, 23, 42, 0.03);
  box-sizing: border-box;
  overflow: hidden;
}

.workspace-panel {
  padding: 26px 18px 20px;
}

.workspace-panel-library {
  display: block;
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.workspace-main-shell {
  padding: 26px 22px 24px;
  overflow: hidden;
}

.workspace-panel-header {
  position: relative;
  z-index: 1;
  margin-bottom: 18px;
  padding: 2px 4px 14px;
  border-bottom: 1px solid #e8edf6;
}

.workspace-panel-title {
  color: #10253f;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.labeler {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

input[type="file"] {
  margin-top: 10px;
}
.summary-panel {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  margin-bottom: 20px;
  padding: 24px;
  border: 1px solid #e1e8f4;
  border-radius: 26px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  box-shadow:
    0 16px 30px rgba(15, 23, 42, 0.05),
    0 4px 10px rgba(15, 23, 42, 0.03);
  box-sizing: border-box;
  overflow: hidden;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 16px 18px;
  border: 1px solid #dde6f3;
  border-radius: 18px;
  background: linear-gradient(135deg, #f5f8ff 0%, #ffffff 100%);
}
.summary-caption {
  flex: 0 0 auto;
  margin-bottom: 0;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(45, 99, 239, 0.09);
  color: #2d63ef;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-align: center;
}
.current-image-name {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0;
  color: #142844;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.4;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
.summary-group {
  margin-top: 18px;
}
.summary-panel > .summary-group:first-of-type {
  margin-top: 0;
}
.summary-group-title {
  margin-bottom: 12px;
  color: #5d6f88;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.summary-divider {
  height: 1px;
  margin: 18px 0 4px;
  background: linear-gradient(
    90deg,
    rgba(111, 132, 247, 0),
    rgba(111, 132, 247, 0.26),
    rgba(143, 112, 218, 0.1),
    rgba(111, 132, 247, 0)
  );
}
.upload-tag-container {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  margin-bottom: 0;
}
.upload-stat-tag {
  flex: 1 1 calc(25% - 8px);
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  white-space: normal;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}
.status-tag-container {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  margin-bottom: 0;
}
.status-stat-tag {
  flex: 1 1 calc(33.333% - 8px);
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  white-space: normal;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}
.status-stat-tag.is-clickable {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.status-stat-tag.is-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 22px rgba(31, 45, 61, 0.14);
}
.status-tag-container.has-abnormal .status-stat-tag {
  flex-basis: calc(25% - 8px);
}

::v-deep .upload-stat-tag.el-tag,
::v-deep .status-stat-tag.el-tag {
  border-width: 1px;
}

::v-deep .upload-stat-tag.el-tag--plain.el-tag--primary,
::v-deep .status-stat-tag.el-tag--plain.el-tag--primary {
  border-color: rgba(45, 99, 239, 0.22);
  background: #eef4ff;
  color: #2d63ef;
}

::v-deep .upload-stat-tag.el-tag--plain.el-tag--success,
::v-deep .status-stat-tag.el-tag--plain.el-tag--success {
  border-color: rgba(28, 154, 101, 0.2);
  background: #effaf4;
  color: #128252;
}

::v-deep .upload-stat-tag.el-tag--plain.el-tag--info,
::v-deep .status-stat-tag.el-tag--plain.el-tag--info {
  border-color: rgba(104, 116, 136, 0.2);
  background: #f4f7fb;
  color: #556880;
}

::v-deep .upload-stat-tag.el-tag--plain.el-tag--warning,
::v-deep .status-stat-tag.el-tag--plain.el-tag--warning {
  border-color: rgba(230, 147, 45, 0.24);
  background: #fff7eb;
  color: #c57a1a;
}

::v-deep .upload-stat-tag.el-tag--plain.el-tag--danger,
::v-deep .status-stat-tag.el-tag--plain.el-tag--danger {
  border-color: rgba(220, 84, 84, 0.22);
  background: #fff1f1;
  color: #d75050;
}
.thumbnails-container {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.workspace-panel-library .thumbnails-container {
  flex: none;
  min-height: auto;
  overflow: visible;
  padding-top: 0;
  padding-bottom: 0;
  padding-right: 0;
}
.thumbnail {
  position: relative;
  cursor: pointer;
  padding: 8px;
  border: 1px solid #dce6f3;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}
.thumbnail-img {
  width: 100%;
  height: 124px;
  object-fit: cover;
  display: block;
  border-radius: 14px;
}
.thumbnail:hover {
  transform: translateY(-2px);
  border-color: #7d90ff;
  box-shadow: 0 18px 30px rgba(45, 99, 239, 0.14);
}
.thumbnail-status {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
  color: #fff;
  background: rgba(144, 147, 153, 0.95);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
}
.thumbnail-status.status-ai {
  background: rgba(64, 158, 255, 0.95);
}
.thumbnail-status.status-modified {
  background: rgba(103, 194, 58, 0.95);
}
.thumbnail-status.status-empty {
  background: rgba(144, 147, 153, 0.95);
}
.thumbnail-status.status-abnormal {
  background: rgba(245, 108, 108, 0.95);
}
.canvas-stage-shell {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  box-sizing: border-box;
}
.canvas-viewport {
  position: relative;
  overflow: hidden;
  margin-top: 0;
  border: 1px solid #d7e3f4;
  border-radius: 24px;
  background: linear-gradient(180deg, #fdfefe 0%, #f4f7fb 100%);
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.canvas-scale-container {
  display: inline-block;
}

.canvas-viewport.is-pan-ready {
  cursor: grab;
}

.canvas-viewport.is-panning {
  cursor: grabbing;
}
.thumbnail.active {
  border-width: 4px;
  border-color: #3f67ff;
  box-shadow:
    0 0 0 6px rgba(77, 111, 255, 0.14),
    0 20px 36px rgba(77, 111, 255, 0.28);
}
.thumb-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 14px;
  padding: 9px 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, #2f67ee 0%, #7a68e7 100%);
  color: #ffffff;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 22px rgba(77, 111, 255, 0.22);
}
.thumb-header-current {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.thumb-header-divider,
.thumb-header-total {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.88;
}
.tool-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  margin-top: 6px;
  min-height: 0;
}
.label-dialog-select {
  width: 100%;
}
::v-deep .tool-form .el-form-item {
  margin-bottom: 14px;
}
::v-deep .tool-form .el-form-item__content {
  width: 100%;
}
.annotation-list-item {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
::v-deep .annotation-list-item .el-form-item__content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
::v-deep .tool-select .el-input__inner {
  height: 46px;
  border-radius: 14px;
  border-color: #dce4f2;
  background: #f9fbff;
  color: #19304f;
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
}
::v-deep .tool-select .el-input__inner:focus,
::v-deep .tool-select .el-input.is-focus .el-input__inner {
  border-color: #6d84f7;
  box-shadow: 0 0 0 3px rgba(109, 132, 247, 0.12);
}
::v-deep .tool-button.el-button {
  width: 100%;
  height: 46px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
}
::v-deep .tool-button.el-button--primary {
  border-color: transparent;
  background: linear-gradient(135deg, #2f67ee 0%, #4e80f6 100%);
  box-shadow: 0 14px 24px rgba(47, 103, 238, 0.22);
}
::v-deep .tool-button.el-button--danger {
  border-color: #f2cece;
  background: linear-gradient(180deg, #fff8f8 0%, #fff1f1 100%);
  color: #df5b5b;
}
::v-deep .tool-button.el-button--success {
  border-color: #cadbfd;
  background: linear-gradient(180deg, #f7faff 0%, #eef4ff 100%);
  color: #2d63ef;
}
.tool-inline-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
::v-deep .tool-icon-button.el-button {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  border-color: #d9e2f1;
  background: #f7faff;
  color: #315bc4;
  font-size: 16px;
}
.annotation-radio-group {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
  overflow-y: auto;
  min-height: 0;
  padding: 8px;
  border: 1px solid #e3e9f4;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfcff 0%, #f7f9fc 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94);
}
::v-deep .annotation-radio-group .el-radio {
  display: flex;
  align-items: center;
  margin-right: 0;
  margin-bottom: 10px;
  padding: 11px 12px;
  border: 1px solid #e5ebf5;
  border-radius: 14px;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
::v-deep .annotation-radio-group .el-radio:last-child {
  margin-bottom: 0;
}
::v-deep .annotation-radio-group .el-radio.is-checked {
  border-color: #96a9ff;
  background: #f5f7ff;
  box-shadow: 0 8px 18px rgba(77, 111, 255, 0.1);
}
::v-deep .annotation-radio-group .el-radio__label {
  white-space: normal;
  line-height: 1.45;
  color: #1d2f48;
  font-weight: 600;
}
::v-deep .annotation-radio-group .el-radio__input.is-checked + .el-radio__label {
  color: #2048b3;
}
::v-deep .tool-form .el-alert {
  border-radius: 16px;
}
.annotation-count-text {
  display: block;
  padding: 12px 14px;
  border: 1px solid #e3e9f4;
  border-radius: 16px;
  background: #f9fbff;
  color: #1e3048;
  font-weight: 700;
  text-align: center;
}
@media (max-width: 1440px) {
  .label-workspace {
    padding: 0 16px;
    gap: 16px;
  }

  .summary-panel,
  .canvas-stage-shell {
    width: 100%;
  }
}

@media (max-width: 1080px) {
  .label-workspace {
    flex-direction: column;
    height: auto;
    padding: 16px;
  }

  .workspace-aside,
  .main {
    width: 100% !important;
    padding: 0;
  }

  .workspace-panel,
  .workspace-main-shell {
    min-height: auto;
  }

  .workspace-main-shell {
    overflow: hidden;
  }

  .labeler {
    align-items: stretch;
  }
}

@media (max-width: 900px) {
  .summary-panel {
    width: 100%;
  }

  .canvas-stage-shell {
    width: 100%;
  }

  .upload-stat-tag {
    flex-basis: calc(50% - 8px);
  }

  .status-stat-tag,
  .status-tag-container.has-abnormal .status-stat-tag {
    flex-basis: calc(50% - 8px);
  }
}
</style>
