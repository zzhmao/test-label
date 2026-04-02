<template>
  <div class="label-entry-page">
    <div v-if="!isEditorVisible" class="mode-selector">
      <div class="selector-shell">
        <div class="mode-grid">
          <div
            class="mode-panel mode-panel-three"
            role="button"
            tabindex="0"
            @click="selectMode('three')"
            @keyup.enter="selectMode('three')"
            @keyup.space.prevent="selectMode('three')"
          >
            <div class="panel-content">
              <img class="panel-icon" src="/svg/car.svg" alt="three icon" />
              <div class="panel-heading">three</div>
            </div>
          </div>
          <div
            class="mode-panel mode-panel-char"
            role="button"
            tabindex="0"
            @click="selectMode('char')"
            @keyup.enter="selectMode('char')"
            @keyup.space.prevent="selectMode('char')"
          >
            <div class="panel-content">
              <img class="panel-icon" src="/svg/plate.svg" alt="char icon" />
              <div class="panel-heading">char</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <label-page
      v-else
      :key="`${currentMode}-${editorSessionKey}`"
      :page-config="activePageConfig"
      :initial-image-files="sessionImageFiles"
      :initial-annotation-files="sessionAnnotationFiles"
      :upload-summary="editorUploadSummary"
    />

    <el-dialog
      title="ファイルを選択"
      :visible.sync="isUploadDialogVisible"
      width="560px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="upload-dialog-body">
        <div class="upload-field">
          <div class="upload-field-label">画像</div>
          <div class="upload-field-value">
            <el-button type="primary" plain @click="triggerImageUpload">
              画像フォルダを選択
            </el-button>
            <span class="upload-count" :class="{ ready: pendingImageFiles.length > 0 }">
              {{ pendingImageFiles.length }} 件
            </span>
          </div>
        </div>

        <div class="upload-field">
          <div class="upload-field-label">
            ラベル
            <span class="upload-optional">任意</span>
          </div>
          <div class="upload-field-value">
            <el-button plain @click="triggerAnnotationUpload">
              ラベルフォルダを選択
            </el-button>
            <span class="upload-count" :class="{ ready: pendingAnnotationFiles.length > 0 }">
              {{ pendingAnnotationFiles.length }} 件
            </span>
          </div>
        </div>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelUploadFlow">キャンセル</el-button>
        <el-button
          type="primary"
          :disabled="pendingImageFiles.length === 0"
          @click="proceedToEditor"
        >
          次へ
        </el-button>
      </span>
    </el-dialog>

    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      multiple
      webkitdirectory
      style="display: none"
      @change="handleImageFileChange"
    />
    <input
      ref="annotationInput"
      type="file"
      accept=".txt"
      multiple
      webkitdirectory
      style="display: none"
      @change="handleAnnotationFileChange"
    />
  </div>
</template>

<script>
import LabelPage from "../common/LabelPage.vue";
import {
  THREE_LABEL_PAGE_CONFIG,
  CHAR_LABEL_PAGE_CONFIG,
} from "../common/labelPageConfigs.js";

const PAGE_CONFIG_MAP = {
  three: THREE_LABEL_PAGE_CONFIG,
  char: CHAR_LABEL_PAGE_CONFIG,
};

export default {
  name: "LabelEntryPage",
  components: {
    LabelPage,
  },
  data() {
    return {
      isUploadDialogVisible: false,
      pendingImageFiles: [],
      pendingAnnotationFiles: [],
      sessionMode: "",
      sessionImageFiles: [],
      sessionAnnotationFiles: [],
      editorSessionKey: 0,
    };
  },
  computed: {
    currentMode() {
      const mode = this.$route.query.mode;
      return PAGE_CONFIG_MAP[mode] ? mode : "";
    },
    activePageConfig() {
      return this.currentMode ? PAGE_CONFIG_MAP[this.currentMode] : null;
    },
    isEditorVisible() {
      return (
        !!this.currentMode &&
        this.sessionMode === this.currentMode &&
        this.sessionImageFiles.length > 0
      );
    },
    editorUploadSummary() {
      return {
        imageCount: this.sessionImageFiles.length,
        labelCount: this.sessionAnnotationFiles.length,
      };
    },
  },
  watch: {
    currentMode: {
      immediate: true,
      handler(newMode, oldMode) {
        if (!newMode) {
          this.isUploadDialogVisible = false;
          return;
        }
        if (newMode !== oldMode && !this.isEditorVisible) {
          this.resetPendingUploads();
        }
        if (!this.isEditorVisible) {
          this.isUploadDialogVisible = true;
        }
      },
    },
  },
  methods: {
    selectMode(mode) {
      if (!PAGE_CONFIG_MAP[mode]) {
        return;
      }
      this.resetPendingUploads();
      this.$router.replace({
        path: "/label/index",
        query: {
          mode,
        },
      });
    },
    triggerImageUpload() {
      this.$refs.imageInput.click();
    },
    triggerAnnotationUpload() {
      this.$refs.annotationInput.click();
    },
    handleImageFileChange(event) {
      this.pendingImageFiles = Array.from(event.target.files || []).filter(
        (file) => file.type.startsWith("image/")
      );
      event.target.value = "";
    },
    handleAnnotationFileChange(event) {
      this.pendingAnnotationFiles = Array.from(event.target.files || []).filter(
        (file) => file.name.toLowerCase().endsWith(".txt")
      );
      event.target.value = "";
    },
    cancelUploadFlow() {
      this.resetPendingUploads();
      this.resetEditorSession();
      this.isUploadDialogVisible = false;
      this.$router.replace({
        path: "/label/index",
      });
    },
    proceedToEditor() {
      if (this.pendingImageFiles.length === 0) {
        return;
      }
      this.sessionMode = this.currentMode;
      this.sessionImageFiles = this.pendingImageFiles.slice();
      this.sessionAnnotationFiles = this.pendingAnnotationFiles.slice();
      this.editorSessionKey += 1;
      this.isUploadDialogVisible = false;
    },
    resetPendingUploads() {
      this.pendingImageFiles = [];
      this.pendingAnnotationFiles = [];
    },
    resetEditorSession() {
      this.sessionMode = "";
      this.sessionImageFiles = [];
      this.sessionAnnotationFiles = [];
    },
  },
};
</script>

<style scoped>
.label-entry-page {
  min-height: calc(100vh - 84px);
}

.mode-selector {
  min-height: calc(100vh - 84px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background:
    radial-gradient(circle at top left, rgba(64, 158, 255, 0.16), transparent 36%),
    radial-gradient(circle at top right, rgba(103, 194, 58, 0.14), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
}

.selector-shell {
  width: min(980px, 100%);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.mode-panel {
  min-height: 280px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  color: #fff;
  cursor: pointer;
  outline: none;
  box-shadow: 0 22px 52px rgba(15, 23, 42, 0.16);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;
}

.panel-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.panel-icon {
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.mode-panel:hover,
.mode-panel:focus {
  transform: translateY(-6px);
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.2);
  filter: saturate(1.05);
}

.mode-panel-three {
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
    linear-gradient(135deg, #1f6bff 0%, #2eb1ff 100%);
}

.mode-panel-char {
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
    linear-gradient(135deg, #0f9d58 0%, #5bc97a 100%);
}

.panel-heading {
  font-size: 44px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-align: center;
}

.upload-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.upload-field {
  padding: 18px 20px;
  border: 1px solid #e5e9f2;
  border-radius: 14px;
  background: #f8fbff;
}

.upload-field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.upload-optional {
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.upload-field-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-count {
  min-width: 54px;
  font-size: 13px;
  font-weight: 600;
  color: #909399;
  text-align: right;
}

.upload-count.ready {
  color: #409eff;
}

@media (max-width: 900px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }

  .mode-panel {
    min-height: 220px;
  }

  .panel-heading {
    font-size: 38px;
  }

  .upload-field-value {
    flex-direction: column;
    align-items: flex-start;
  }

  .upload-count {
    text-align: left;
  }
}
</style>
