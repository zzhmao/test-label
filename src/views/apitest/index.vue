<template>
  <div class="api-tester">
    <h2>API 测试工具</h2>
    
    <label>请求地址：</label>
    <input v-model="apiUrl" placeholder="输入 API 地址（省略 https://dev-api.park4d.com/）" class="input" />
    
    <label>请求方法：</label>
    <select v-model="method" class="select">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="DELETE">DELETE</option>
    </select>
    
    <label>请求 Headers（JSON 格式）：</label>
    <textarea v-model="headers" class="textarea" placeholder='{"Authorization": "Bearer token"}'></textarea>
    
    <label v-if="method !== 'GET'">请求 Body（JSON 格式）：</label>
    <textarea v-if="method !== 'GET'" v-model="body" class="textarea" placeholder='{"key": "value"}'></textarea>
    
    <button @click="sendRequest" class="button">发送请求</button>
    
    <h3>响应结果：</h3>
    <pre class="response">{{ response }}</pre>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      apiUrl: '',
      method: 'GET',
      headers: '{"Content-Type": "application/json"}',
      body: '',
      response: ''
    };
  },
  methods: {
    async sendRequest() {
      try {
        const parsedHeaders = this.headers ? JSON.parse(this.headers) : {};
        const parsedBody = this.body ? JSON.parse(this.body) : {};

        const baseUrl = '/dev-api';
        const fullUrl = `${baseUrl}${this.apiUrl.startsWith('/') ? this.apiUrl : '/' + this.apiUrl}`;

        const options = {
          method: this.method,
          url: fullUrl,
          headers: parsedHeaders,
          data: this.method !== 'GET' ? parsedBody : null,
        };

        const res = await axios(options);
        this.response = JSON.stringify(res.data, null, 2);
      } catch (error) {
        this.response = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
      }
    }
  }
};
</script>

<style>
.api-tester {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f9f9f9;
}
.input, .select, .textarea {
  width: 100%;
  margin: 5px 0 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.button {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.button:hover {
  background: #0056b3;
}
.response {
  background: #fff;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>
