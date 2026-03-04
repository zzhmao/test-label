<template>
  <div class="full-page-container">
    <el-container>
      <!-- 頂部導航欄 -->
      <el-header>
        <!-- 您可以在這裡添加導航欄內容 -->
        <!-- 替换为步骤条 -->
        <el-steps :space="200">
          <el-step title="完了しました" status="success"></el-step>
          <el-step title="図面生成" status="finish"></el-step>
        </el-steps>
      </el-header>
      <!-- 主要內容區 -->
      <el-container>
        <!-- 工具欄 -->
        <el-aside width="200px" style="padding-top: 10px">
          <el-row :gutter="10">
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('signboardSvg')"
                ><span class="signboard"></span>看板</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('fullSkylight')"
                ><span class="fullSkylight"></span>満空灯</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('telephonePole')"
                ><span class="telephonePole"></span>電柱</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('cameraPole')"
                ><span class="cameraPole"></span>カメラポール</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('paymentMachine')"
                ><span class="paymentMachine"></span>精算機/精算看板</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('iBarrierCar')"
                ><span class="iBarrierCar"></span>Iバリカー</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('uBarrierCar')"
                ><span class="uBarrierCar"></span>Uバリカー</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('lighting')"
              >
                <span class="lighting"></span>照明</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('controlBox')"
                ><span class="controlBox"></span>制御ボックス</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="addSvgToCanvas('parkingSpace')"
                >車室</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="startDrawingLine"
                >ライン追加</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="startDrawingDimensionLine"
                >寸法追加</el-button
              >
            </el-col>
            <!-- <el-col :span="24">
              <el-button
                type="primary"
                class="full-width-button"
                @click="startDrawingAnnotationLine"
                >添加标注线</el-button
              >
            </el-col>
            <el-col :span="24">
              <el-input
                v-model="annotationText"
                placeholder="请输入标注内容"
              ></el-input>
            </el-col> -->
          </el-row>
        </el-aside>
        <el-main class="main">
          <div class="input-group" style="width: 840px">
            <el-row :gutter="20">
              <el-col :span="24">
                <el-button
                  icon="el-icon-refresh-left"
                  @click="undo"
                  :disabled="stateIndex <= 0"
                  class="my-custom-button-class"
                ></el-button>
                <el-button
                  icon="el-icon-refresh-right"
                  @click="redo"
                  :disabled="stateIndex >= canvasState.length - 1"
                  class="my-custom-button-class"
                ></el-button>
                <el-switch
                  v-model="road"
                  style="float: right"
                  active-text="車道を非表示"
                  inactive-text="車道を表示"
                >
                </el-switch>
              </el-col>
              <el-col :span="24">
                <el-button @click="copySelectedObject"
                  ><i
                    class="el-icon-document-copy"
                    style="margin-right: 8px"
                  ></i
                  >コピー</el-button
                >
                <el-input
                  v-model="textInput"
                  placeholder="テキストを入力してください"
                  style="width: 300px; margin-left: 10px"
                >
                  <el-button
                    slot="prepend"
                    icon="el-icon-edit"
                    @click="addTextToCanvas"
                  ></el-button
                ></el-input>
                <el-button
                  type="danger"
                  @click="removeSelectedObject"
                  style="margin-left: 10px"
                  ><i class="el-icon-delete" style="margin-right: 8px"></i
                  >削除</el-button
                >
                <el-button type="primary" @click="exportAsPDF"
                  ><span class="pdf"></span>PDF作成</el-button
                >
                <el-button
                  type="success"
                  @click="goToSimulation"
                  style="margin-left: 10px"
                  >シミュレーション<i
                    class="el-icon-right"
                    style="margin-left: 8px"
                  ></i
                ></el-button>
                <el-button
                  @click="isCollapsed = !isCollapsed"
                  style="float: right"
                >
                  {{ isCollapsed ? "属性バーを表示" : "属性バーを隠す" }}
                </el-button>
              </el-col>
            </el-row>
          </div>
          <div class="canvas-container" style="position: relative">
            <div
              class="canvas-container"
              style="overflow: scroll; width: 900px; height: 650px"
            >
              <canvas
                id="new-canvas"
                :width="2100"
                :height="1485"
                class="canvas-area"
              ></canvas>
            </div>
          </div>
        </el-main>
        <!-- 屬性面板 -->
        <el-aside v-if="!isCollapsed" width="200px" style="padding-top: 20px">
          <div v-if="selectedText">
            <el-input
              v-model="editText"
              placeholder="テキストを入力してください"
              style="margin-bottom: 10px"
              @change="updateText"
            ></el-input>
            <el-input
              v-model="fontSizeInput"
              type="number"
              class="custom-font-size-input"
              placeholder="フォントサイズを入力してください"
              style="margin-bottom: 10px"
              @change="updateFontSize"
              ><template slot="prepend">サイズ</template></el-input
            >
          </div>
          <!-- 如果选中了线条，显示线条相关的选择 -->
          <div v-if="selectedLine">
            <!-- 线宽选择 -->
            <el-select
              v-model="lineWidth"
              placeholder="厚さ"
              style="margin-bottom: 10px"
            >
              <el-option label="0.5mm" value="1"></el-option>
              <el-option label="1mm" value="2"></el-option>
              <el-option label="1.5mm" value="3"></el-option>
            </el-select>
            <!-- 线条样式选择 -->
            <el-select
              v-model="lineStyle"
              placeholder="スタイル"
              style="margin-bottom: 10px"
            >
              <el-option label="実線" value="dashedShort"></el-option>
              <el-option label="点線" value="dashed"></el-option>
              <el-option label="点破線" value="dotDashed"></el-option>
            </el-select>
          </div>
          <!-- 如果选中了尺寸线，显示尺寸线相关的输入和按钮 -->
          <div v-if="selectedDimensionLine">
            <el-input
              v-model="dimensionText"
              placeholder="寸法を入力してください"
            ></el-input>
            <el-button
              type="primary"
              @click="updateDimensionText"
              style="margin-right: 10px; width: 152px; margin-bottom: 10px"
              >更新寸法</el-button
            >
          </div>
          <div v-if="shouldShowDiv">
            <!-- 下拉选择框 -->
            <el-select
              v-model="selectedImageUrl"
              :placeholder="uiTexts.placeholder"
            >
              <el-option
                v-for="item in imageOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
            <!-- 图像尺寸输入框 -->
            <div style="display: flex; flex-direction: column">
              <el-button
                type="primary"
                @click="updateImage"
                style="margin-right: 10px; width: 152px; margin-bottom: 10px"
              >
                画像を更新する
              </el-button>
              <!-- 第一行 -->
              <div
                style="display: flex; margin-bottom: 10px; align-items: center"
              >
                <span>幅</span>
                <!-- 长度 -->
                <el-input
                  v-model="imageWidth"
                  type="number"
                  placeholder="幅"
                  style="width: 200px; margin-left: 10px; margin-right: 10px"
                ></el-input>
                <span>mm</span>
              </div>
              <!-- 第二行 -->
              <div style="display: flex; align-items: center">
                <span>高</span>
                <!-- 宽度 -->
                <el-input
                  v-model="imageHeight"
                  type="number"
                  placeholder="高さ"
                  style="width: 200px; margin-left: 10px; margin-right: 10px"
                ></el-input>
                <span>mm</span>
              </div>
            </div>
            <!-- 更新图像的按钮 -->
            <el-button
              type="primary"
              @click="resizeImage"
              style="margin-right: 10px; width: 152px; margin-bottom: 10px"
            >
              寸法更新
            </el-button>
          </div>
        </el-aside>
      </el-container>
    </el-container>
  </div>
</template>
<script src="./output.js"></script>
<style lang="scss" src="./output.scss" scoped></style>
