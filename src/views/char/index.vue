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
      options: [
        "札幌",
        "函館",
        "旭川",
        "室蘭",
        "釧路",
        "帯広",
        "北見",
        "知床",
        "苫小牧",
        "青森",
        "八戸",
        "弘前",
        "岩手",
        "盛岡",
        "平泉",
        "宮城",
        "仙台",
        "秋田",
        "庄内",
        "福島",
        "いわき",
        "会津",
        "郡山",
        "白河",
        "水戸",
        "土浦",
        "つくば",
        "宇都宮",
        "とちぎ",
        "那須",
        "群馬",
        "前橋",
        "高崎",
        "渡良瀬",
        "大宮",
        "所沢",
        "熊谷",
        "春日部",
        "川口",
        "川越",
        "越谷",
        "千葉",
        "習志野",
        "袖ヶ浦",
        "野田",
        "成田",
        "柏",
        "市川",
        "松戸",
        "佐倉",
        "市原",
        "品川",
        "練馬",
        "足立",
        "八王子",
        "多摩",
        "世田谷",
        "杉並",
        "葛飾",
        "江東",
        "板橋",
        "町田",
        "横浜",
        "川崎",
        "湘南",
        "相模",
        "山梨",
        "富士山",
        "新潟",
        "長岡",
        "上越",
        "雪国魚沼",
        "長野",
        "松本",
        "諏訪",
        "富山",
        "石川",
        "金沢",
        "福井",
        "岐阜",
        "飛騨",
        "東美濃",
        "静岡",
        "浜松",
        "沼津",
        "伊豆",
        "山形",
        "名古屋",
        "豊橋",
        "三河",
        "尾張小牧",
        "岡崎",
        "豊田",
        "一宮",
        "春日井",
        "三重",
        "鈴鹿",
        "四日市",
        "伊勢志摩",
        "滋賀",
        "京都",
        "大阪",
        "なにわ",
        "和泉",
        "堺",
        "奈良",
        "和歌山",
        "神戸",
        "姫路",
        "鳥取",
        "鳥根",
        "出雲",
        "岡山",
        "倉敷",
        "広島",
        "福山",
        "山口",
        "下関",
        "徳島",
        "香川",
        "高松",
        "愛媛",
        "高知",
        "福岡",
        "北九州",
        "久留米",
        "筑豊",
        "佐賀",
        "長崎",
        "佐世保",
        "熊本",
        "大分",
        "宮崎",
        "鹿児島",
        "奄美",
        "沖縄",
        "飛鳥",
        "船橋",
        "dot",
        ...Array(10).keys().map(String),
        ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      ],
      classDictionary: {
        0: "0",
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "あ",
        11: "い",
        12: "う",
        13: "え",
        14: "か",
        15: "き",
        16: "く",
        17: "け",
        18: "こ",
        19: "さ",
        20: "す",
        21: "せ",
        22: "そ",
        23: "た",
        24: "ち",
        25: "つ",
        26: "て",
        27: "と",
        28: "な",
        29: "に",
        30: "ぬ",
        31: "ね",
        32: "の",
        33: "は",
        34: "ひ",
        35: "ふ",
        36: "ほ",
        37: "ま",
        38: "み",
        39: "む",
        40: "め",
        41: "も",
        42: "や",
        43: "ゆ",
        44: "よ",
        45: "ら",
        46: "り",
        47: "る",
        48: "れ",
        49: "ろ",
        50: "わ",
        51: "を",
        52: "札幌",
        53: "函館",
        54: "旭川",
        55: "室蘭",
        56: "釧路",
        57: "帯広",
        58: "北見",
        59: "知床",
        60: "苫小牧",
        61: "青森",
        62: "八戸",
        63: "弘前",
        64: "岩手",
        65: "盛岡",
        66: "平泉",
        67: "宮城",
        68: "仙台",
        69: "秋田",
        70: "庄内",
        71: "福島",
        72: "いわき",
        73: "会津",
        74: "郡山",
        75: "白河",
        76: "水戸",
        77: "土浦",
        78: "つくば",
        79: "宇都宮",
        80: "とちぎ",
        81: "那須",
        82: "群馬",
        83: "前橋",
        84: "高崎",
        85: "渡良瀬",
        86: "大宮",
        87: "所沢",
        88: "熊谷",
        89: "春日部",
        90: "川口",
        91: "川越",
        92: "越谷",
        93: "千葉",
        94: "習志野",
        95: "袖ヶ浦",
        96: "野田",
        97: "成田",
        98: "柏",
        99: "市川",
        100: "松戸",
        101: "佐倉",
        102: "市原",
        103: "品川",
        104: "練馬",
        105: "足立",
        106: "八王子",
        107: "多摩",
        108: "世田谷",
        109: "杉並",
        110: "葛飾",
        111: "江東",
        112: "板橋",
        113: "町田",
        114: "横浜",
        115: "川崎",
        116: "湘南",
        117: "相模",
        118: "山梨",
        119: "富士山",
        120: "新潟",
        121: "長岡",
        122: "上越",
        123: "雪国魚沼",
        124: "長野",
        125: "松本",
        126: "諏訪",
        127: "富山",
        128: "石川",
        129: "金沢",
        130: "福井",
        131: "岐阜",
        132: "飛騨",
        133: "東美濃",
        134: "静岡",
        135: "浜松",
        136: "沼津",
        137: "伊豆",
        138: "山形",
        139: "名古屋",
        140: "豊橋",
        141: "三河",
        142: "尾張小牧",
        143: "岡崎",
        144: "豊田",
        145: "一宮",
        146: "春日井",
        147: "三重",
        148: "鈴鹿",
        149: "四日市",
        150: "伊勢志摩",
        151: "滋賀",
        152: "京都",
        153: "大阪",
        154: "なにわ",
        155: "和泉",
        156: "堺",
        157: "奈良",
        158: "和歌山",
        159: "神戸",
        160: "姫路",
        161: "鳥取",
        162: "鳥根",
        163: "出雲",
        164: "岡山",
        165: "倉敷",
        166: "広島",
        167: "福山",
        168: "山口",
        169: "下関",
        170: "徳島",
        171: "香川",
        172: "高松",
        173: "愛媛",
        174: "高知",
        175: "福岡",
        176: "北九州",
        177: "久留米",
        178: "筑豊",
        179: "佐賀",
        180: "長崎",
        181: "佐世保",
        182: "熊本",
        183: "大分",
        184: "宮崎",
        185: "鹿児島",
        186: "奄美",
        187: "沖縄",
        188: "dot",
        189: "A",
        190: "C",
        191: "F",
        192: "H",
        193: "K",
        194: "L",
        195: "M",
        196: "P",
        197: "X",
        198: "Y",
        199: "飛鳥",
        200: "船橋",
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
      // newVal 就是选中的 annotation 下标
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
          "描画中ですので、現在の描画が完了してから新しい描画を開始してください。"
        );
        return;
      }
      if (!this.selectedText) {
        this.$message.error("まずテキストを選択してください。");
        return;
      }
      if (!this.canvas || !this.canvas.backgroundImage) {
        this.$message.error("先に画像/PDFページを表示してください。");
        return;
      }

      this.isDrawing = true;

      // 进入绘制模式：禁止选择、禁用对象交互
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

      const strokeColor = this.getColorForText(this.selectedText); // 边框色：按类别固定
      const fillColor = "rgba(144,238,144, 0.5)"; // 填充：固定浅绿色

      const cleanupDrawingMode = () => {
        this.isDrawing = false;
        this.canvas.defaultCursor = "default";
        this.canvas.selection = true;

        this.canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.hasControls = false;
          obj.hoverCursor = "move";
          obj.moveCursor = "move";
        });

        // 解绑事件（只解绑这次绑定的）
        this.canvas.off("mouse:down", onMouseDown);
        this.canvas.off("mouse:move", onMouseMove);
        this.canvas.off("mouse:up", onMouseUp);

        this.canvas.renderAll();
      };

      const onMouseDown = (o) => {
        // 起点也必须限制在图片边界内
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
          selectable: false, // 绘制中的临时 rect 不可选
          evented: false,
        });

        this.canvas.add(rect);
      };

      const onMouseMove = (o) => {
        if (!rect) return;

        // 终点限制在图片边界内
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
          cleanupDrawingMode();
          return;
        }

        // 最终再修正一次：确保 rect 在背景图范围内
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

        // 太小的框直接取消（防止误点）
        if (rect.width < 5 || rect.height < 5) {
          this.canvas.remove(rect);
          rect = null;
          this.$message.info("注釈が小さすぎるためキャンセルしました。");
          cleanupDrawingMode();
          return;
        }

        // 生成文字
        const textObj = new fabric.Text(this.selectedText, {
          left: rect.left + rect.width / 20,
          top: rect.top + rect.height / 20,
          originX: "left",
          originY: "top",
          fontSize: 20,
          fill: "#000",
          selectable: false,
          evented: false,
        });

        // 用 group 替换临时 rect
        this.canvas.remove(rect);

        const group = new fabric.Group([rect, textObj], {
          left: rect.left,
          top: rect.top,
          selectable: true,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
        });

        this.canvas.add(group);

        // 保存注释（内部会写 relative + fabricGroup）
        this.saveAnnotation(group);

        // 记录 undoStack：add
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

        cleanupDrawingMode();
      };

      // 绑定事件：一次绘制周期
      this.canvas.on("mouse:down", onMouseDown);
      this.canvas.on("mouse:move", onMouseMove);
      this.canvas.on("mouse:up", onMouseUp);
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
      const currentFileName = this.fileNames[this.currentImageIndex]; // 获取当前文件名称
      const annotationData = this.annotations[currentFileName];
      // 检查注释数据是否存在
      if (annotationData && annotationData.length > 0) {
        console.log(
          `当前图片 (${currentFileName}) 的注释数据：`,
          JSON.stringify(annotationData, null, 2)
        );
      } else {
        console.log(
          `当前图片 (${currentFileName}) 没有任何注释数据，尝试从后端加载。`
        );
        // 如果没有注释数据，从后端获取
        this.sendImageToServer(this.currentImageIndex)
          .then((response) => {
            console.log("服务器响应：", response); // 调试日志，确保查看返回结构
            const result = response?.result;
            // 确认 result 是否为数组并且有数据
            if (Array.isArray(result) && result.length > 0) {
              console.log("后端返回的注释数据：", result);
              const img = this.canvas.backgroundImage;
              const scaledWidth = img.getScaledWidth();
              const scaledHeight = img.getScaledHeight();
              const imgLeft = img.left || 0;
              const imgTop = img.top || 0;
              // 转换后端返回的注释数据为前端格式
              const newAnnotations = result.map((item) => {
                const relativeLeft = item.x0 / scaledWidth;
                const relativeTop = item.y0 / scaledHeight;
                const relativeWidth = (item.x1 - item.x0) / scaledWidth;
                const relativeHeight = (item.y1 - item.y0) / scaledHeight;
                // 根据 class 转换为对应文字
                const convertedText =
                  this.classDictionary[item.class] || `未知类: ${item.class}`;
                // 随机生成颜色
                const generateColor = () => {
                  let r, g, b;
                  do {
                    r = Math.floor(Math.random() * 256);
                    g = Math.floor(Math.random() * 256);
                    b = Math.floor(Math.random() * 256);
                  } while (r < 30 && g < 30 && b < 30); // 确保颜色不是接近黑色
                  return `rgba(${r}, ${g}, ${b}, 0.5)`; // 半透明颜色
                };
                const fillColor = this.getColorForText(convertedText);
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
                  fill: fillColor,
                };
              });
              // 更新当前图片的注释数据
              this.$set(this.annotations, currentFileName, newAnnotations);
              // 渲染注释到画布
              newAnnotations.forEach((annotation) => {
                const left = annotation.relative.left * scaledWidth + imgLeft;
                const top = annotation.relative.top * scaledHeight + imgTop;
                const width = annotation.relative.width * scaledWidth;
                const height = annotation.relative.height * scaledHeight;
                const rect = new fabric.Rect({
                  left: left,
                  top: top,
                  width: width,
                  height: height,
                  fill: "rgba(144,238,144, 0.5)", // 固定绿色
                  stroke: annotation.fill, // 用之前保存的颜色作为边框色
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
                  left: left,
                  top: top,
                  selectable: true,
                  hasControls: false,
                  lockMovementX: true,
                  lockMovementY: true,
                });
                this.canvas.add(group);
              });
              this.canvas.renderAll();
              this.displayImage(this.currentImageIndex);
            } else {
              console.log("后端未返回任何有效的注释数据。");
            }
          })
          .catch((error) => {
            console.error("从后端加载注释数据失败：", error);
          });
        return;
      }
      // 如果有注释数据，渲染到画布
      const img = this.canvas.backgroundImage;
      this.annotations[currentFileName].forEach((annotation) => {
        const left = annotation.relative.left * img.getScaledWidth() + img.left;
        const top = annotation.relative.top * img.getScaledHeight() + img.top;
        const width = annotation.relative.width * img.getScaledWidth();
        const height = annotation.relative.height * img.getScaledHeight();
        const rect = new fabric.Rect({
          left: left,
          top: top,
          width: width,
          height: height,
          fill: "rgba(144,238,144, 0.5)", // 固定绿色
          stroke: annotation.fill, // 用之前保存的颜色作为边框色
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
          left: left,
          top: top,
          selectable: true,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        // 将 group 存回 annotation 里
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
      formData.append("type", "char");
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
