<template>
<div>
  <div class="content-box">
    <el-page-header @back="goBack" content="新規オーダー作成"></el-page-header>
  </div>

  <!-- 表单 -->
  <el-form :model="ruleForm" :rules="rules" ref="ruleForm" label-width="120px" class="demo-ruleForm">
    <el-row :gutter="20">
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="Tel:" prop="tel">
        <el-input v-model="ruleForm.tel"></el-input>
      </el-form-item>
    </div></el-col>
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="Mail:" prop="mail">
        <el-input v-model="ruleForm.mail"></el-input>
      </el-form-item>
    </div></el-col>
    </el-row>
    <el-row :gutter="20">
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="名前:" prop="name">
        <el-input v-model="ruleForm.name"></el-input>
      </el-form-item>
    </div></el-col>
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="住所:" prop="address">
        <el-input v-model="ruleForm.address"></el-input>
      </el-form-item>
    </div></el-col>
    </el-row>
    
    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="オーダー番号:" prop="order">
          <el-input v-model="ruleForm.order"></el-input>
        </el-form-item>
      </div></el-col>
    </el-row>

    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="駐車場:" prop="parkinglot">
          <el-select v-model="ruleForm.parkinglot" placeholder="お選びください">
            <el-option
                v-for="item in parkingOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </div></el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12"><div class="grid-content bg-purple-dark">
        <el-form-item label="車室番号:" prop="lotnumber">
          <el-input v-model="ruleForm.lotnumber"></el-input>
        </el-form-item>
      </div></el-col>

      <el-col :span="12"><div class="grid-content bg-purple-dark">
        <el-form-item label="車両番号:" prop="carnumber">
          <el-input v-model="ruleForm.carnumber"></el-input>
        </el-form-item>
      </div></el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12"><div class="grid-content bg-purple-dark">
        <el-form-item label="入庫日付:" required>
          <el-col :span="11">
            <el-form-item prop="intime1">
              <el-date-picker type="date" placeholder="日付を選択してください" v-model="ruleForm.intime1" style="width: 100%;"></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col class="line padded-line" :span="2">~</el-col>
          <el-col :span="11">
            <el-form-item prop="intime2">
              <el-time-picker placeholder="時間を選択してください" v-model="ruleForm.intime2" style="width: 100%;"></el-time-picker>
            </el-form-item>
          </el-col>
        </el-form-item>
      </div></el-col>

      <el-col :span="12"><div class="grid-content bg-purple-dark">
        <el-form-item label="出庫日付:" required>
          <el-col :span="11">
            <el-form-item prop="outtime1">
              <el-date-picker type="date" placeholder="日付を選択してください" v-model="ruleForm.outtime1" style="width: 100%;"></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col class="line padded-line" :span="2">~</el-col>
          <el-col :span="11">
            <el-form-item prop="outtime2">
              <el-time-picker placeholder="時間を選択してください" v-model="ruleForm.outtime2" style="width: 100%;"></el-time-picker>
            </el-form-item>
          </el-col>
        </el-form-item>
      </div></el-col>
    </el-row>
    <el-row :gutter="20">
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="利用料金:" prop="rank">
        <el-input v-model="ruleForm.rank">
          <template #append>円</template>
        </el-input>
      </el-form-item>
    </div></el-col>
    <el-col :span="12"><div class="grid-content bg-purple">
      <el-form-item label="支払料金:" prop="payment">
        <el-input v-model="ruleForm.payment">
          <template #append>円</template>
        </el-input>
      </el-form-item>
    </div></el-col>
    </el-row>
    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="ステータス:" prop="status">
          <el-select v-model="ruleForm.status" placeholder="お選びください">
            <el-option
              v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </div></el-col>
    </el-row>
    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="入庫写真:" prop="inphoto">
          <el-upload
            class="upload-demo"
            drag
            action="https://jsonplaceholder.typicode.com/posts/"
            multiple>
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">ここにファイルをドラッグ＆ドロップ<br>または <em>ファイルを選択する</em></div>
            <!-- <div class="el-upload__tip" slot="tip">jpg/png files with a size less than 500kb</div> -->
          </el-upload>
        </el-form-item>
      </div></el-col>
    </el-row>
    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="出庫写真:" prop="outphoto">
          <el-upload
            class="upload-demo"
            drag
            action="https://jsonplaceholder.typicode.com/posts/"
            multiple>
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">ここにファイルをドラッグ＆ドロップ<br>または <em>ファイルを選択する</em></div>
            <!-- <div class="el-upload__tip" slot="tip">jpg/png files with a size less than 500kb</div> -->
          </el-upload>
        </el-form-item>
      </div></el-col>
    </el-row>
    <el-row>
      <el-col :span="24"><div class="grid-content bg-purple-dark">
        <el-form-item label="対応記録:" prop="desc">
          <el-input type="textarea" ></el-input>
        </el-form-item>
      </div></el-col>
    </el-row>
    <el-form-item>
    <el-button type="primary" @click="submitForm('ruleForm')">新規オーダー作成</el-button>
    <el-button @click="resetForm('ruleForm')">リセット</el-button>
  </el-form-item>
  </el-form>  
</div> 


</template>

<script>

import { generateParkingOptions } from '../../../mock/Parking-lot-name';

export default {
  data() {
      return {
        ...PARKING_OPTIONS,
        ...STATUS_OPTIONS,
        ruleForm: {
          name: '',
          tel: '',
          mail: '',
          address: '',
          order: '',
          parkinglot: '',
          lotnumber: '',
          carnumber: '',
          intime1: '',
          intime2: '',
          outtime1: '',
          outtime2: '',
          rank: '',
          payment: '',
          status: '',
        },
        rules: {
          name: [
            { required: true, message: '名前を入力してください', trigger: 'blur' },
            { min: 1, max: 50, message: '名前は1から50文字の間で入力してください', trigger: 'blur' }
          ],
          tel: [
            { required: true, message: '電話番号を入力してください', trigger: 'blur' },
            { pattern: /^\d{10,15}$/, message: '電話番号は10から15桁の数字で入力してください', trigger: 'blur' }
          ],
          mail: [
            { required: true, message: 'メールアドレスを入力してください', trigger: 'blur' },
            { pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, message: '有効なメールアドレスを入力してください', trigger: 'blur' }
          ],
          address: [
            { required: true, message: '住所を入力してください', trigger: 'blur' },
            { min: 5, max: 200, message: '住所は5から200文字の間で入力してください', trigger: 'blur' }
          ],
          order: [
            { required: true, message: 'オーダー番号を入力してください', trigger: 'blur' },
          ],
          parkinglot: [
            { required: true, message: '駐車場を選択してください', trigger: 'change' }
          ],
          lotnumber: [
            { required: true, message: '車室番号を入力してください', trigger: 'blur' },
          ],
          carnumber: [
            { required: true, message: '車両番号を入力してください', trigger: 'blur' },
          ],
          intime1: [
            { type: 'date', required: true, message: '日付を選択してください', trigger: 'change' }
          ],
          intime2: [
            { type: 'date', required: true, message: '時間を選択してください', trigger: 'change' }
          ],
          outtime1: [
            { type: 'date', required: true, message: '日付を選択してください', trigger: 'change' }
          ],
          outtime2: [
            { type: 'date', required: true, message: '時間を選択してください', trigger: 'change' }
          ],
          rank: [
            { required: true, message: '利用料金を入力してください', trigger: 'blur' },
          ],
          payment: [
            { required: true, message: '支払料金を入力してください', trigger: 'blur' },
          ],
          status: [
            { required: true, message: 'ステータスを選択してください', trigger: 'change' }
          ],
        }
      };
    },

  methods: {
    submitForm(formName) {
        this.$refs[formName].validate((valid) => {
          if (valid) {
            alert('submit!');
          } else {
            console.log('error submit!!');
            return false;
          }
        });
      },
      resetForm(formName) {
        this.$refs[formName].resetFields();
      },

    goBack() {
      
      this.$router.go(-1);
    }
  }

};

const PARKING_OPTIONS = {
  parkingOptions: generateParkingOptions(),
  parkingValue: ''
};
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

</script>

<style lang="scss" scoped>
  .content-box {
    padding: 20px; 
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
    background: transparent;
  }
  .bg-purple {
    background: transparent;
  }
  .bg-purple-light {
    background: transparent;
  }
  .grid-content {
    border-radius: 4px;
    min-height: 36px;
  }
  .row-bg {
    padding: 10px 0;
    background-color: transparent;  // 这里也将背景设为透明
  }
  .grid-content {
    padding-right: 40px; // 可以根据需要调整这个值
    // 其他现有样式...
}
.padded-line {
  text-align: center;   // This will center the '~' symbol.
  padding-left: 10px;   // Add 10px gap to the left.
  padding-right: 10px;  // Add 10px gap to the right.
}

</style>
