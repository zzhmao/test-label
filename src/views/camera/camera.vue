<template>
  <div>
    <el-row>
      <el-col :span="24">
        <div class="grid-content bg-purple-dark align-right">
          <span class="label-white-bold" style="margin-right: 16px;">駐車場：</span>
          <el-select 
              v-model="parkingValue" 
              filterable 
              placeholder="お選びください" 
              style="width: 300px; margin-right: 20px;"> 
              <el-option
                v-for="item in parkingOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
          </el-select>
        </div>
      </el-col>
    </el-row>
    <div class="video-wrapper">
      <video class="video-item" width="320" height="240" controls>
        <source src="path_to_your_first_video.mp4" type="video/mp4">
      </video>

      <video class="video-item" width="320" height="240" controls>
        <source src="path_to_your_second_video.mp4" type="video/mp4">
      </video>
      
    </div>
    
  </div>
</template>

<script>

import { generateParkingOptions } from '../../../mock/Parking-lot-name';

export default {
  data() {
    return {
      ...PARKING_OPTIONS,
    };
  },
};

const PARKING_OPTIONS = {
  parkingOptions: generateParkingOptions(),
  parkingValue: ''
};

</script>

<style lang="scss" scoped>
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
    background: #0A385B;
    padding: 10px;
  }
  .align-right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
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

  .video-item {
  padding: 10px;  // 内部间距
}

.label-white-bold {
  color: white;       // 文本颜色为白色
  font-weight: bold;  // 文本加粗
}
</style>