<template>
  <div class="full-page-container" stretch>
    <el-tabs v-model="activeName" class="my-custom-tabs">
      <el-tab-pane label="図面読込" name="load-draw" >
        <span slot="label">
          <i class="el-icon-first-on" v-if="activeName === 'load-draw'"></i>
          <i class="el-icon-first-off" v-else></i>
          図面読込</span
        >
        <el-row :gutter="20">
          <el-col :span="24" style="margin-bottom: 20px">
            <el-steps :space="200">
              <el-step title="図面読込" status="finish"></el-step>
              <el-step title="駐車場情報設定" status="wait"></el-step>
              <el-step title="結果確認" status="wait"></el-step>
              <el-step title="結果出力" status="wait"></el-step>
            </el-steps>
          </el-col>
          <el-col :span="24">
            <div class="grid-content" style="margin-bottom: 20px">
              <el-button type="primary" plain @click="setLineColor('blue')"
                ><i class="el-icon-edit" style="margin-right: 8px"></i
                >敷地設定</el-button
              >
              <el-button type="danger" plain @click="enableEraser"
                ><i class="el-icon-delete" style="margin-right: 8px"></i
                >削除</el-button
              >
              <!-- <el-button type="info" @click="drawDoubleArrow"
                >寸法追加</el-button
              >
              <el-input
                v-model="arrowText"
                placeholder="長さを入力してください"
                style="width: 200px"
              ></el-input
              ><span>mm</span> -->
            </div>
          </el-col>
          <el-col :span="24">
            <div class="grid-content">
              <!-- <el-button type="danger" plain @click="enableEraser"
                ><i class="el-icon-delete" style="margin-right: 8px"></i
                >削除</el-button
              > -->
              <el-button type="primary" @click="debouncedSendDataToBackend"
                >次へ<i class="el-icon-right" style="margin-left: 8px"></i
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
            style="display: none"
            @change="loadImage"
            accept="image/*, .pdf"
          />
          <div
            class="canvas-container"
            style="overflow: scroll; width: 860px; height: 614px"
          >
            <canvas ref="canvas" :width="840" :height="594"></canvas>
          </div>
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
      </el-tab-pane>
      <el-tab-pane
        label="駐車場情報設定"
        name="parking-lot"

      >
        <span slot="label">
          <i class="el-icon-second-on" v-if="activeName === 'parking-lot'"></i>
          <i class="el-icon-second-off" v-else></i> 駐車場情報設定</span
        >
        <el-row :gutter="20">
          <el-col :span="24" style="margin-bottom: 20px">
            <el-steps :space="200">
              <el-step title="図面読込" status="success"></el-step>
              <el-step title="駐車場情報設定" status="finish"></el-step>
              <el-step title="結果確認" status="wait"></el-step>
              <el-step title="結果出力" status="wait"></el-step>
            </el-steps>
          </el-col>
          <el-col :span="24">
            <div class="grid-content" style="margin-bottom: 20px">
              <el-button type="primary" plain @click="setParkingSpaceSvg"
                ><i class="el-icon-truck" style="margin-right: 8px"></i
                >車室追加</el-button
              >
              <el-button
                type="success"
                plain
                @click="setLineColorParking('green')"
                ><i class="el-icon-place" style="margin-right: 8px"></i
                >設置エリア追加</el-button
              >
              <el-button type="warning" plain @click="startBezierDrawing"
                ><i class="el-icon-edit" style="margin-right: 8px"></i
                >ルート</el-button
              >
              <el-button type="danger" plain @click="prakingLotenableEraser"
                ><i class="el-icon-delete" style="margin-right: 8px"></i
                >削除</el-button
              >
            </div>
          </el-col>
          <el-col :span="24">
            <div class="grid-content">
              <el-select v-model="certificationOption" style="width: 180px">
                <el-option
                  label="ハイブリッド"
                  value="ハイブリッド"
                ></el-option>
                <el-option label="車室認証" value="車室認証"></el-option>
                <el-option label="ゲート式" value="ゲート式"></el-option>
              </el-select>
              <el-button type="primary" @click="goToCamera"
                >シミュレーション開始</el-button
              >
              <el-button type="info" @click="backInPut"
                ><i class="el-icon-back" style="margin-right: 8px"></i
                >戻る</el-button
              >
            </div>
          </el-col>
        </el-row>
        <div
          class="canvas-container"
          style="overflow: scroll; width: 860px; height: 614px"
        >
          <canvas ref="parking-lot" :width="840" :height="594"></canvas>
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
      </el-tab-pane>
      <el-tab-pane label="結果確認" name="camera" >
        <span slot="label">
          <i class="el-icon-third-on" v-if="activeName === 'camera'"></i>
          <i class="el-icon-third-off" v-else></i> 結果確認</span
        >
        <el-container>
          <el-main style="padding: 0">
            <el-row :gutter="20" style="max-width: 80%">
              <el-col :span="24" style="margin-bottom: 20px">
                <el-steps :space="200">
                  <el-step title="図面読込" status="success"></el-step>
                  <el-step title="駐車場情報設定" status="success"></el-step>
                  <el-step title="結果確認" status="finish"></el-step>
                  <el-step title="結果出力" status="wait"></el-step>
                </el-steps>
              </el-col>
              <el-col :span="20">
                <div class="grid-content" style="margin-bottom: 20px">
                  <el-button type="primary" plain @click="addSector"
                    ><i class="el-icon-camera" style="margin-right: 8px"></i
                    >カメラ追加</el-button
                  >
                  <el-button type="danger" plain @click="cameraenableEraser"
                    ><i class="el-icon-delete" style="margin-right: 8px"></i
                    >カメラ削除</el-button
                  >
                </div>
              </el-col>
              <el-col :span="20">
                <div class="grid-content">
                  <el-button type="primary" @click="goToOutPut"
                    >結果出力<i
                      class="el-icon-right"
                      style="margin-left: 8px"
                    ></i
                  ></el-button>
                  <el-button type="info" @click="backToParkingLot"
                    ><i class="el-icon-back" style="margin-right: 8px"></i
                    >戻る</el-button
                  >
                </div>
              </el-col>
            </el-row>
            <div
              class="canvas-container"
              style="overflow: scroll; width: 860px; height: 614px"
            >
              <canvas ref="camera" :width="840" :height="594"></canvas>
            </div>
          </el-main>
          <el-aside width="200px" v-show="isSelected">
            <label for="cameraSelect" style="display: block">焦点距離：</label>
            <el-select
              v-model="selectedAngle"
              placeholder="カメラを選択してください"
              style="margin-bottom: 20px"
            >
              <el-option label="4mm" value="79"></el-option>
              <el-option label="6mm" value="50.8"></el-option>
              <el-option label="8mm" value="37.7"></el-option>
              <el-option label="12mm" value="24"></el-option>
            </el-select>
            <label for="cameraSelect" style="display: block">高さ：</label>
            <el-input
              v-model="cameraHeight"
              type="number"
              placeholder="高さ"
              style="width: 100px; margin-right: 10px; margin-bottom: 20px"
            ></el-input>
            <span>m</span>
            <label for="cameraSelect" style="display: block">φ：</label>
            <el-input
              v-model="cameraAngle"
              type="number"
              placeholder="φ"
              style="width: 100px; margin-right: 10px; margin-bottom: 20px"
            ></el-input>
            <span>度</span>
            <label for="cameraSelect" style="display: block">半径：</label>
            <el-input
              v-model="cameraRadius"
              type="number"
              placeholder="半径"
              style="width: 100px; margin-right: 10px; margin-bottom: 20px"
              @input="radiusModifiedByUser = true"
            ></el-input>
            <span>m</span>
            <el-button
              type="primary"
              @click="updateSector"
              style="margin-bottom: 20px"
              >更新</el-button
            >
            <canvas
              id="previewCanvas"
              width="150"
              height="250"
              style="border: 1px solid #000"
            ></canvas>
          </el-aside>
        </el-container>
      </el-tab-pane>
      <el-tab-pane label="結果出力" name="output" >
        <span slot="label">
          <i class="el-icon-fourth-on" v-if="activeName === 'output'"></i>
          <i class="el-icon-fourth-off" v-else></i> 結果確認</span
        >
        <el-steps :space="200" style="margin-bottom: 10px">
          <el-step title="図面読込" status="success"></el-step>
          <el-step title="駐車場情報設定" status="success"></el-step>
          <el-step title="結果確認" status="success"></el-step>
          <el-step title="結果出力" status="finish"></el-step>
        </el-steps>
        <el-container>
          <el-main style="padding: 0">
            <iframe
              v-if="activeName === 'output'"
              :src="unityIframeSrc"
              width="980"
              height="650px"
            ></iframe>
          </el-main>
          <el-aside width="200px">
            <el-button
              type="info"
              style="width: 150px; margin-bottom: 20px; margin-left: 0px"
              @click="backToCamera"
              ><i class="el-icon-back" style="margin-right: 8px"></i
              >戻る</el-button
            >
            <!-- <el-input
              v-model="webpageUrl"
              placeholder="url"
              style="width: 150px; margin-bottom: 20px"
            ></el-input>
            <el-button
              type="primary"
              @click="copyUrl"
              style="width: 150px; margin-bottom: 20px"
              >URLコピー</el-button
            > -->
            <el-button
              type="success"
              style="width: 150px; margin-bottom: 20px; margin-left: 0px"
              @click="openPdfEditor"
              ><i class="el-icon-download" style="margin-right: 8px"></i
              >ダウンロード</el-button
            >
            <!-- <el-button
              type="success"
              style="width: 150px; margin-bottom: 20px; margin-left: 0px"
              >動画ダウンロード</el-button
            > -->
          </el-aside>
        </el-container>
        <el-dialog :visible.sync="pdfEditorVisible" width="80%">
          <div style="text-align: center; margin-bottom: 20px">
            <el-input
              v-model="inputText"
              placeholder="テキストを入力してください"
              style="width: 250px; margin-right: 10px"
            ></el-input>
            <el-button @click="addTextToCanvas">テキスト追加</el-button>
            <el-button type="primary" @click="generatePdf">PDF作成</el-button>
          </div>
          <div
            style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100%;
            "
          >
            <canvas ref="pdfCanvas" width="840" height="1188"></canvas>
            <div
              id="dynamicCanvasContainer"
              style="display: flex; flex-direction: column; align-items: center"
            ></div>
          </div>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script src="./index.js"></script>
<style lang="scss" src="./index.scss" scoped></style>