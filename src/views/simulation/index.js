import Canvas from "./input";
import parkinglot from "./parkinglot";
import camera from "./camera";
import output from "./output";
export default {
  name: "DrawingBoard",
  created() {
    fabric.Line.prototype.perPixelTargetFind = true;
    fabric.Line.prototype.targetFindTolerance = 10;
    this.debouncedSendDataToBackend = this.debounce(
      this.sendDataToBackend,
      1000
    );
    const tab = this.$route.query.tab;
    if (tab) {
      this.activeName = tab;
    }
  },
  mixins: [Canvas, parkinglot, camera, output],
  data() {
    return {
      ID: '',
      scalingFactor: null,
      Scale: null,
      activeName: "load-draw",
      canvas: null,
      parkingLotCanvas: null,
      cameraCanvas: null,
      isDrawingLine: false,
      isDrawingDoubleArrow: false,
      points: [],
      currentLineColor: "blue",
      arrowText: "", // 箭头线上的文字
      showModal: false,
      modalMessage: "",
      progressPercentage: 0,
      isCtrlPressed: false,
      isContinuousDrawing: false, // 連續畫線模式
      lastLineEndPoint: null, // 存儲最後一條線的終點坐標
      certificationOption: '', // 認證選擇器
      selectedAngle: null, // 用户选中的攝像機角度
      focalToValueMap: {
        "4mm": "79-88",
        "6mm": "50.8-54.1",
        "8mm": "35.7-39.7",
        "12mm": "23-25",
      },
      cameraHeight: 3, // 相機高度
      cameraAngle: 45, // 相機角度
      cameraRadius: 3, // 相機半徑
      isSelected: false,
      cameraData: '',
      pdfEditorVisible: false,  // 控制PDF编辑器弹窗的显示
      inputText: '', // 用于绑定输入框的值
      isTabDisabled: true,
      radiusModifiedByUser: false,
      // unityIframeSrc: '/unity/index.html',
      // csvFileUrl: 'https://simulation-csv.s3.ap-northeast-1.amazonaws.com/result.csv',
      // imageUrl: 'https://simulation-images.s3.ap-northeast-1.amazonaws.com/originalcanvas.png',
      isBezierDrawingMode: false,
      bezierPoints: [],
      controlPoints: [], // 存储控制点对象
    };
  },
  computed: {
    csvFileUrl() {
      return `https://simulation-csv.s3.ap-northeast-1.amazonaws.com/${this.ID}/result.csv/`;
    },
    imageUrl() {
      return `https://simulation-csv.s3.ap-northeast-1.amazonaws.com/${this.ID}/originalcanvas.png/`;
    },
    unityIframeSrc() {
      if (this.activeName !== 'output') {
        return ''; // 如果不是在“output”标签下，不需要设置iframe源
      }
      const queryParams = new URLSearchParams({
        csvUrl: this.csvFileUrl,
        imageUrl: this.imageUrl
      }).toString();
      return `/unity/index.html?${queryParams}`;
    }
  },
  mounted() {
    this.canvas = new fabric.Canvas(this.$refs.canvas, {
      selection: false,
    });
    this.parkingLotCanvas = new fabric.Canvas(this.$refs['parking-lot'], {
      selection: false,
    });
    this.cameraCanvas = new fabric.Canvas(this.$refs.camera, {
      selection: true,
    });
    this.canvas.on("mouse:down", (options) => this.onCanvasClick(options));
    this.parkingLotCanvas.on("mouse:down", (options) => this.onCanvasClickParking(options));
    // this.cameraCanvas.on("mouse:down", (options) => this.onCanvasClickCamera(options));
    this.initMouseEvents();
    this.initMouseEventsParking();
    this.initMouseEventsCamera();
    // 添加键盘事件监听
    this.handleKeyDown = (event) => {
      if (event.key === "Control") {
        this.isCtrlPressed = true;
      }
      if (event.key === "Delete") {
        this.enableEraser();
      }
      if (event.key === "Delete") {
        this.prakingLotenableEraser();
      }
      if (event.key === "Escape") {
        this.exitDrawingMode();
      }
      if (event.key === "Escape") {
        this.exitDrawingModeParking();
      }
    };
    this.handleKeyUp = (event) => {
      if (event.key === "Control") {
        this.isCtrlPressed = false;
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    this.addCanvasScalingAndPanning(this.canvas);
    this.addCanvasScalingAndPanning(this.parkingLotCanvas);
    this.addCanvasScalingAndPanning(this.cameraCanvas);
    // 初始化完毕后，检查是否有图像数据需要渲染
    const layoutData = this.$store.state.canvas.layoutData;
    if (!layoutData) {
      console.error("layoutData is not defined.");
      return; // 如果layoutData未定义，则直接返回
    }
    if (layoutData) {
      fabric.Image.fromURL(layoutData, (img) => {
        // 计算缩放比例以适应canvas尺寸
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
        img.set({
          left: (this.canvas.width / 2) - (img.width / 2) * scale,
          top: (this.canvas.height / 2) - (img.height / 2) * scale,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });
        this.canvas.add(img); // 将图像添加到fabric canvas
        this.canvas.renderAll(); // 重新渲染canvas
      });
    }
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  },
};