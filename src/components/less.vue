<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script>
import axios from "../../lib/axios";
const url =
  "http://140.143.35.182:3000/api/getDiscList?g_tk=1928093487&inCharset=utf-8&outCharset=utf-8&notice=0&format=json&platform=yqq&hostUin=0&sin=0&ein=29&sortId=5&needNewCode=0&categoryId=10000000&rnd=0.021085597623901053";
export default {
  name: "HelloWorld",
  data() {
    return {
      msg: "Welcome to Your Vue.js App"
    };
  },
  mounted() {
    this.calcelTokenAxios();
    // this.axiosMethod();
  },
  methods: {
    axiosMethod() {
      axios({
        method: "get",
        url: url
      }).then(res => {
        console.log(res);
      });
    },
    axiosGet() {
      /**
       *   1 设置延时
       *   2 axios可以捕捉到延时的报错信息
       */
      axios.defaults.timeout = 10;

      axios
        .get(url, {
          params: "花好动漫"
        })
        .then(res => {
          console.log(res);
        })
        .catch(err => {
          console.log("error");
          console.log(err);
        });
    },
    calcelTokenAxios() {
      let cancelToken = axios.CancelToken;
      let source = cancelToken.source();
      axios({
        method: "get",
        url: url,
        cancelToken: source.token
      })
        .then(res => {
          console.log(res);
        })
        .catch(err => {
          if (axios.isCancel(err)) {
            console.log("取消请求传递的消息", err.message);
          } else {
            console.log(err);
          }
        });

      source.cancel("取消请求的这条消息");
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

.text {
  color: red;
}
</style>
