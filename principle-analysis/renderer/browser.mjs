export function createElement(tag) {
  return document.createElement(tag);
}
export function createTextNode(text) {
  return document.createTextNode(text);
}
export function createCommentNode(comment) {
  return document.createComment(comment);
}
export function setElementText(el, text) {
  el.textContent = text;
}
export function setText(el, text) {
  el.nodeValue = text;
}
export function setComment(el, text) {
  el.nodeValue = text;
}
export function insert(el, parent, anchor = null) {
  parent.insertBefore(el, anchor);
}
export function unmount(vnode) {
  // 获取el的父元素
  const parent = vnode.el.parentNode;
  if (vnode.type === "Fragment") {
    vnode.children.forEach((child) => unmount(child));
  }
  if (parent) {
    // 调用 removeChild 移除元素
    parent.removeChild(vnode.el);
  }
}
// 将属性设置相关操作封装到 patchProps 函数中，并作为渲染器选项传递
export function patchProps(el, key, prevValue, nextValue) {
  function shouldSetAsProps(el, key, value) {
    // 特殊处理
    // 针对<input form="form1" /> 由于 el.form 是只读的，因此我们只能够通过 setAttribute 函数来设置它
    if (key === "form" && el.tagName === "INPUT") return false;
    // 兜底
    return key in el;
  }
  if (/^on/.test(key)) {
    // 匹配以 on 开头的属性，视其为事件
    // 定义 el._vei 为一个对象，存在事件名称到事件处理函数的映射
    let invokers = el._vei || (el._vei = {});
    //根据事件名称获取 invoker
    let invoker = invokers[key];
    // 根据属性名称得到对应的事件名称，例如 onClick ---> click
    const name = key.slice(2).toLowerCase();
    if (nextValue) {
      if (!invoker) {
        // 如果没有 invoker，则将一个伪造的 invoker 缓存到 el._vei 中
        // vei 是 vue event invoker 的首字母缩写
        invoker = el._vei[key] = (e) => {
          // e.timeStamp 是事件发生的时间
          // 如果事件发生的时间早于事件处理函数绑定的时间，则不执行事件处理函数
          if (e.timeStamp < invoker.attached) return;
          // 如果 invoker.value 是数组，则遍历它并逐个调用事件处理函数
          if (Array.isArray(invoker.value)) {
            invoker.value.forEach((fn) => fn(e));
          } else {
            // 否则直接作为函数调用
            invoker.value(e);
          }
        };
        // 将真正的事件处理函数赋值给 invoker.value
        invoker.value = nextValue;
        // 添加 invoker.attached 属性，存储事件处理函数被绑定的时间
        invoker.attached = performance.now();
        // 绑定 invoker 作为事件处理函数
        el.addEventListener(name, invoker);
      } else {
        // 如果 invoker 存在，意味着更新，并且只需要更新 invoker.value 的值即可
        invoker.value = nextValue;
      }
    } else if (invoker) {
      // 新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
      el.removeEventListener(name, invoker);
    }
  } else if (key === "class") {
    el.className = nextValue || "";
  } else if (shouldSetAsProps(el, key, nextValue)) {
    // 使用 shouldSetAsProps 函数判断是否应该作为 DOM Properties 设置
    // 获取该 DOM Properties 的类型
    const type = typeof el[key];
    if (type === "boolean" && nextValue === "") {
      // 如果是布尔类型，并且 value 是空字符串，则将值矫正为 true
      el[key] = true;
    } else {
      el[key] = nextValue;
    }
  } else {
    // 如果要设置的属性没有对应的 DOM Properties，则使用 setAttribute 函数设置属性
    el.setAttribute(key, nextValue);
  }
}
