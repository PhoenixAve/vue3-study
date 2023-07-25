import { effect, reactive } from "./index.mjs";

const obj = reactive({
  text: "",
  ok: true,
});
effect(
  // 匿名副作用函数
  () => {
    console.log("effect run");
    console.log(obj.ok ? obj.text : "not");
  }
);
// setTimeout(() => {
// 副作用函数中并没有读取 notExist 属性的值
obj.ok = false;
// }, 1000);

obj.text = "12";
