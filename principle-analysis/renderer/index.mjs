// 从本章开始，我们将使用 @vue/reactivity 包提供的响应式 API 进行讲解
// 1、最简单的渲染器;

// import { effect, ref } from "../../node_modules/vue/dist/vue.esm-browser.js";
import {
  effect,
  ref,
} from "../../node_modules/@vue/reactivity/dist/reactivity.esm-browser.js";
import * as options from "./browser.mjs";

const Text = Symbol("text");
const Comment = Symbol("comment");
const Fragment = Symbol("fragment");

// *********************简单的渲染器实现开始*********************

// /**
//  * 渲染器
//  * @param {*} domString
//  * @param {*} container
//  */
// function renderer(domString, container) {
//   container.innerHTML = domString;
// }

// =================渲染带变量的字符串===================

// let name = "Tom";
// renderer(`<h1>Hello ${name}</h1>`, document.getElementById("app"));

// =================渲染响应式数据===================

// let nameRef = ref("Tom");
// effect(() => {
//   renderer(`<h1>Hello ${nameRef.value}</h1>`, document.getElementById("app"));
// });

// setTimeout(() => {
//   nameRef.value = "Jerry";
// }, 2000);

// *********************简单的渲染器实现结束*********************

// *********************编写创建渲染器函数*********************

function createRenderer(options) {
  const {
    createElement,
    createTextNode,
    setElementText,
    setText,
    insert,
    patchProps,
    unmount,
  } = options;
  function mounteElement(vnode, container) {
    // 创建 DOM 元素
    const el = (vnode.el = createElement(vnode.type));
    // 处理子节点，如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === "string") {
      // 因此只需要设置元素的 textContent 属性即可
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      // 如果 children 是数组，则遍历每一个子节点，并调用 patch 函数挂载它们
      vnode.children.forEach((child) => {
        patch(null, child, el);
      });
    }
    if (vnode.props) {
      for (const key in vnode.props) {
        // 调用 patchProps 函数即可
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    // 将元素添加到容器中
    insert(el, container);
  }
  function patch(oldVnode, newVnode, container) {
    if (oldVnode && oldVnode.type !== newVnode.type) {
      // 如果新旧vnode的类型不同，则直接将旧vnode卸载
      unmount(oldVnode);
      oldVnode = null;
    }
    // 代码运行到这里，证明 oldVnode 和 newVnode 所描述的内容相同，或者oldVnode不存在
    const { type } = newVnode;
    if (typeof type === "string") {
      if (!oldVnode) {
        mounteElement(newVnode, container);
      } else {
        // 新旧都存在，则更新
        patchElement(oldVnode, newVnode);
      }
    } else if (type === Text) {
      // 如果新 vnode 的类型是 Text，则说明该 vnode 描述的是文本节点
      // 如果没有旧节点，则进行挂载
      if (!oldVnode) {
        const el = (newVnode.el = createTextNode(newVnode.children));
        // 将文本节点插入到容器中
        insert(el, container);
      } else {
        // 如果旧 vnode 存在，只需要使用新文本节点的文本内容更新旧文本节点即可
        const el = (newVnode.el = oldVnode.el);
        if (newVnode.children !== oldVnode.children) {
          setText(el, newVnode.children);
        }
      }
    } else if (type === Comment) {
      // 如果新 vnode 的类型是 Comment，则说明该 vnode 描述的是注释节点
      // 如果没有旧节点，则进行挂载
      if (!oldVnode) {
        const el = (newVnode.el = createCommentNode(newVnode.children));
        // 将文本节点插入到容器中
        insert(el, container);
      } else {
        // 如果旧 vnode 存在，只需要使用新注释节点的注释内容更新旧注释节点即可
        const el = (newVnode.el = oldVnode.el);
        if (newVnode.children !== oldVnode.children) {
          setComment(el, newVnode.children);
        }
      }
    } else if (type === Fragment) {
      // 处理Fragment类型的vnode
      if (!oldVnode) {
        // 如果旧节点不存在，则只需将Fragment的children逐个挂载即可
        newVnode.children.forEach((child) => patch(null, child, container));
      } else {
        // 如果旧 vnode 存在，则只需要更新 Fragment 的 children 即可
        patchChildren(oldVnode, newVnode, container);
      }
    } else if (typeof type === "object") {
      // 如果类型为对象，则描述的是组件
    } else if (type === "xxx") {
      // 处理其他类型的 vnode
    }
  }
  function patchElement(oldVnode, newVnode) {
    const el = (newVnode.el = oldVnode.el);
    const oldProps = oldVnode.props;
    const newProps = newVnode.props;
    // 第一步：更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }
    // 第二步：更新children
    patchChildren(oldVnode, newVnode, el);
  }
  function patchChildren(oldVnode, newVnode, container) {
    // 判断新子节点的类型是否是文本节点
    if (typeof newVnode.children === "string") {
      // 旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
      // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
      if (Array.isArray(oldVnode.children)) {
        oldVnode.children.forEach((c) => unmount(c));
      }
      // 最后将新的文本节点内容设置给容器元素
      setElementText(container, newVnode.children);
    } else if (Array.isArray(newVnode.children)) {
      // 说明新子节点是一组子节点
      if (Array.isArray(oldVnode.children)) {
        // 代码运行到这里，则说明新旧子节点都是一组子节点，这里涉及核心的 Diff 算法
        // 将旧的一组子节点全部卸载
        oldVnode.children.forEach((child) => unmount(child));
        // 再将新的一组子节点全部挂载到容器中
        newVnode.children.forEach((child) => patch(null, child, container));
      } else {
        // 旧子节点要么是文本子节点，要么不存在
        // 但无论哪种情况，我们都只需要将容器清空，然后将新的一组子节点逐个挂载
        setElementText(container, "");
        n2.children.forEach((child) => patch(null, child, container));
      }
    } else {
      // 新子节点不存在
      if (Array.isArray(oldVnode.children)) {
        oldVnode.children.forEach((child) => unmount(child));
      } else if (typeof n1.children === "string") {
        // 旧子节点是文本子节点，清空内容即可
        setElementText(container, "");
      }
      // 如果也没有旧子节点，那么什么都不需要做
    }
  }
  function render(vnode, container) {
    if (vnode) {
      // 新vnode存在，需要与旧vnode进行比较
      patch(container._vnode, vnode, container);
    } else {
      if (container._vnode) {
        // 旧 vnode 存在，且新 vnode 不存在，说明是卸载（unmount）操作
        unmount(container._vnode);
      }
    }
    // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
    container._vnode = vnode;
  }
  return { render };
}

const { render } = createRenderer(options);

// // 连续三次调用渲染
// // 首次渲染
// // render(vnode1, document.querySelector("#app"));
// // // 第二次渲染
// // render(vnode2, document.querySelector("#app"));
// // // 第三次渲染
// // render(null, document.querySelector("#app"));

// // =================子节点为纯文本类型===================
// const vnode = {
//   type: "h1",
//   children: "hello",
// };
// render(vnode, document.querySelector("#app"));

// // =================子节点为数组类型===================
// const vnode = {
//   type: "h1",
//   children: [
//     {
//       type: "p",
//       children: "hello",
//     },
//   ],
// };
// render(vnode, document.querySelector("#app"));

// // =================带属性的节点===================
// const vnode = {
//   type: "h1",
//   // 使用 props 描述一个元素的属性
//   props: {
//     id: "foo",
//   },
//   children: [
//     {
//       type: "p",
//       children: "hello",
//     },
//   ],
// };
// render(vnode, document.querySelector("#app"));

// // =================渲染禁用按钮===================
// const vnode = {
//   type: "button",
//   // 使用 props 描述一个元素的属性
//   props: {
//     disabled: false,
//     onClick: [
//       () => {
//         console.log("clicked1");
//       },
//       () => {
//         console.log("clicked2");
//       },
//     ],
//   },
//   children: "我没有被禁用",
// };
// render(vnode, document.querySelector("#app"));

// // =================更新节点===================
// const vnode1 = {
//   type: "button",
//   // 使用 props 描述一个元素的属性
//   props: {
//     disabled: false,
//   },
//   children: "我没有被禁用",
// };
// const vnode2 = {
//   type: "button",
//   // 使用 props 描述一个元素的属性
//   props: {
//     disabled: true,
//   },
//   children: "我被禁用了",
// };
// render(vnode1, document.querySelector("#app"));
// setTimeout(() => {
//   render(vnode2, document.querySelector("#app"));
// }, 1000);

// // =================渲染带事件按钮===================
// const vnode = {
//   type: "button",
//   // 使用 props 描述一个元素的属性
//   props: {
//     onClick: [
//       () => {
//         console.log("clicked1");
//       },
//       () => {
//         console.log("clicked2");
//       },
//     ],
//   },
//   children: "事件按钮",
// };
// render(vnode, document.querySelector("#app"));

// // =================渲染带事件按钮===================

// =================处理事件冒泡与更新时机结合导致的问题===================
const bol = ref(false);

effect(() => {
  // 创建 vnode
  const vnode = {
    type: "div",
    props: bol.value
      ? {
          onClick: () => {
            console.log("父元素 clicked");
          },
        }
      : {},
    children: [
      {
        type: "p",
        props: {
          onClick: () => {
            bol.value = true;
            console.log("子元素 clicked");
          },
        },
        children: "text",
      },
    ],
  };
  // 渲染 vnode
  render(vnode, document.querySelector("#app"));
});

// // =================渲染Fragment片段===================

// const vnode = {
//   type: "ul",
//   children: [
//     {
//       type: Fragment,
//       children: [
//         { type: "li", children: "1" },
//         { type: "li", children: "2" },
//         { type: "li", children: "3" },
//       ],
//     },
//   ],
// };

// render(vnode, document.querySelector("#app"));
