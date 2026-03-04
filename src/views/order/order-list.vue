<template>
  <div class="oder-list">

    <!-- 搜索栏 -->
    <el-row :gutter="20"> 
      <el-col :span="12">
        <div class="grid-content bg-purple">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>キーワード検索:</span>
            <el-input v-model="input" placeholder="オーダー番号、車両ナンバー" style="flex: 1; margin-left: 8px;"></el-input>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
          <div class="grid-content bg-purple">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>駐車場:</span>
                  <!-- 使用带有filterable属性的el-select组件 -->
                  <el-select v-model="parkingValue" filterable placeholder="お選びください" style="flex: 1; margin-left: 8px;">
                      <el-option
                          v-for="item in parkingOptions"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value">
                      </el-option>
                  </el-select>
              </div>
          </div>
      </el-col>
    </el-row>
    <el-row :gutter="20"> 
      <el-col :span="12">
        <div class="grid-content bg-purple">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>ステータス:</span>
            <!-- 使用statusValue和statusOptions来绑定数据 -->
            <el-select v-model="statusValue" placeholder="お選びください" style="flex: 1; margin-left: 8px;">
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="grid-content bg-purple">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="flex: 0 0 auto;">日時:</span>
                <el-select v-model="timeValue" placeholder="お選びください" style="flex: 1; margin-left: 8px; margin-right: 8px;">
                    <el-option
                        v-for="item in timeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value">
                    </el-option>
                </el-select>
                <el-date-picker
                    v-model="value1"
                    type="datetimerange"
                    range-separator="~"
                    start-placeholder="開始日付"
                    end-placeholder="終了日付"
                    style="flex: 1; margin-right: 8px;">
                </el-date-picker>
            </div>
        </div>
      </el-col>
    </el-row>

    <!-- 按钮 -->
    <div style="display: flex; justify-content: flex-end;">
        <el-button type="primary" icon="el-icon-search" @click="handleSearch">検索</el-button>
        <el-button type="info" @click="handleReset">リセット</el-button>
        <el-button type="primary" icon="el-icon-plus" @click="navigateToOrder">新規オーダー作成</el-button>
    </div>

    <!-- 表格 -->
    <div>
      <el-table
        :data="tableData"
        style="width: 100%"
        :default-sort="{prop: 'date', order: 'descending'}">

        <el-table-column
          prop="orderNumber"
          label="オーダー番号"
          sortable>
        </el-table-column>

        <el-table-column
          prop="parkingManagementNumber"
          label="駐車場管理番号"
          sortable>
        </el-table-column>

        <el-table-column
          prop="parkingLot"
          label="駐車場"
          sortable>
        </el-table-column>

        <el-table-column
          prop="cabin"
          label="車室"
          sortable>
        </el-table-column>

        <el-table-column
          prop="carnumber"
          label="車番"
          sortable>
        </el-table-column>

        <el-table-column
          prop="Stockingtime"
          label="入庫時間"
          sortable>
        </el-table-column>

        <el-table-column
          prop="paymenttime"
          label="支払時間"
          sortable>
        </el-table-column>

        <el-table-column
          prop="Deliverytime"
          label="出庫時間"
          sortable>
        </el-table-column>

        <el-table-column
          prop="paymentfee"
          label="支払料金"
          sortable>
        </el-table-column>

        <el-table-column
          prop="tag"
          label="ステータス"
          :filters="[
            { text: '駐車中', value: '駐車中' },
            { text: '決済失敗', value: '決済失敗' },
            { text: '決済完了未出庫', value: '決済完了未出庫' },
            { text: '決済完了出庫済み', value: '決済完了出庫済み' },
            { text: '決済完了出庫再課金', value: '決済完了出庫再課金' },
            { text: '返金済み', value: '返金済み' },
            { text: '後決済済み', value: '後決済済み' }
          ]"
          :filter-method="filterTag"
          filter-placement="bottom-end">        
          <template slot-scope="scope">
            <el-tag :style="getTagColor(scope.row.tag) " disable-transitions>{{scope.row.tag}}</el-tag>
          </template>
        </el-table-column>

        <el-table-column
          fixed="right"
          label="操作"
          width="100">
          <template slot-scope="scope">
            <el-button @click="handleClick(scope.row)" type="text" size="small">詳細</el-button>
          </template>
        </el-table-column>

      </el-table>
      <div class="block">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage4"
          :page-sizes="[10, 20, 30, 40]"
          :page-size="100"
          layout="total, sizes, prev, pager, next, jumper"
          :total="100">
        </el-pagination>
      </div>
    </div>


  </div>
</template>


<script>


import { generateParkingOptions } from '../../../mock/Parking-lot-name';
import { createMockData } from '../../../mock/order'

export default {
  data() {
    return {
      input: '',
      tableData: [], // 现在先初始化为空，稍后在mounted中加载数据
      ...PARKING_OPTIONS,
      ...STATUS_OPTIONS,
      ...TIME_OPTIONS,
      currentPage4: 1, // 默认第一页
      pageSize: 10, // 默认每页10条
      totalRecords: 0 // 总记录数，现在先初始化为0
    };
  },
  methods: {
    handleSearch() {
      this.mypagination.current = 1
      this.getList()
    },
  
    handleReset() {
    // 在这里执行重置相关的逻辑，例如清空输入框和下拉选择的值
    this.input = '';
    this.parkingValue = null;
    this.statusValue = null;
    this.timeValue = null;
    this.value1 = null;
  },
    navigateToOrder() {
      this.$router.push('/add-order/add-order');
    },
    getTagColor(tag) {
      switch (tag) {
        case '駐車中':
          return { borderColor: 'green', color: 'green' };
        case '決済失敗':
          return { borderColor: 'red', color: 'red' };
        case '決済完了未出庫':
          return { borderColor: 'orange', color: 'orange' };
        case '決済完了出庫済み':
          return { borderColor: 'blue', color: 'blue' };
        case '決済完了出庫再課金':
          return { borderColor: 'yellow', color: 'yellow' };
        case '返金済み':
          return { borderColor: 'purple', color: 'purple' };
        case '後決済済み':
          return { borderColor: 'pink', color: 'pink' };
        default:
          return { borderColor: 'grey', color: 'grey' }; // 默认颜色
      }
    },
    fetchTableData() {
      // 由于您使用的是模拟数据，我们将这样做：
      let data = createMockData(100);
      this.totalRecords = data.length; // 更新总记录数
      let start = (this.currentPage4 - 1) * this.pageSize;
      let end = this.currentPage4 * this.pageSize;
      this.tableData = data.slice(start, end);
    },
    filterTag(value, row) {
      return row.tag === value;
    },
    getTagType(tag) {
      // 根据tag值返回不同的样式类型
      // 例如：
      // if (tag === "駐車中") return "success";
      // if (tag === "決済失敗") return "danger";
      // return "info"; // 默认类型
    },
    deleteRow(index, rows) {
      rows.splice(index, 1);
    },
    handleSizeChange(newSize) {
      this.pageSize = newSize;
      this.fetchTableData(); // 更新表格数据
    },
    handleCurrentChange(newPage) {
      this.currentPage4 = newPage;
      this.fetchTableData(); // 更新表格数据
    },
    
  },
  mounted() {
    this.fetchTableData(); // 在组件加载时获取表格数据
  }
};

// 关键字搜素


// 停车场名字
const PARKING_OPTIONS = {
  parkingOptions: generateParkingOptions(),
  parkingValue: ''
};


// 订单状态
const STATUS_OPTIONS = {
  statusOptions: [{
    value: 'option1',
    label: '駐車中'
  }, {
    value: 'option2',
    label: '決済失敗'
  }, {
    value: 'options3',
    label: '決済完了未出庫'
  }, {
    value: 'options4',
    label: '決済完了出庫済み'
  }, {
    value: 'options5',
    label: '決済完了出庫再課金'
  }, {
    value: 'options6',
    label: '返金済み'
  }, {
    value: 'options7',
    label: '後決済済み'
  }],
  statusValue: ''
};

const TIME_OPTIONS = {
  timeOptions: [{
    value: 'option1',
    label: '入庫時間'
  }, {
    value: 'option2',
    label: '出庫時間'
  }, {
    value: 'options3',
    label: '支払時間'
  }],
  timeValue: ''
};
</script>

<style lang="scss" scoped>
.oder-list {
  margin: 20px; /* 或使用 padding: 20px; 根据您的需求 */
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
    background: #ffffff;
  }
  .bg-purple {
    background: #ffffff;
  }
  .bg-purple-light {
    background: #ffffff;
  }
  .grid-content {
    border-radius: 4px;
    min-height: 36px;
  }
  .row-bg {
    padding: 10px 0;
    background-color: #ffffff;
  }
</style>