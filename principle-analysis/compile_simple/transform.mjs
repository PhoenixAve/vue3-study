import { logInfo } from "./utils.mjs";

// 函数声明语句结构
const FunctionDeclNode = {
  type: "FunctionDecl", // 代表该节点是函数声明
  // 函数的名称是一个标识符，标识符本身也是一个节点
  id: {
    type: "Identifier",
    name: "render", // name 用来存储标识符的名称，在这里它就是渲染函数的名称 render
  },
  params: [], // 参数，目前渲染函数还不需要参数，所以这里是一个空数组
  // 渲染函数的函数体只有一个语句，即 return 语句
  body: [
    {
      type: "ReturnStatement",
      // 最外层的 h 函数调用
      return: {
        type: "CallExpression",
        callee: { type: "Identifier", name: "h" },
        arguments: [
          // 第一个参数是字符串字面量 'div'
          {
            type: "StringLiteral",
            value: "div",
          },
          // 第二个参数是一个数组
          {
            type: "ArrayExpression",
            elements: [
              // 数组的第一个元素是 h 函数的调用
              {
                type: "CallExpression",
                callee: { type: "Identifier", name: "h" },
                arguments: [
                  // 该 h 函数调用的第一个参数是字符串字面量
                  { type: "StringLiteral", value: "p" },
                  // 第二个参数也是一个字符串字面量
                  { type: "StringLiteral", value: "Vue" },
                ],
              },
              // 数组的第二个元素也是 h 函数的调用
              {
                type: "CallExpression",
                callee: { type: "Identifier", name: "h" },
                arguments: [
                  // 该 h 函数调用的第一个参数是字符串字面量
                  { type: "StringLiteral", value: "p" },
                  // 第二个参数也是一个字符串字面量
                  { type: "StringLiteral", value: "Template" },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

// 函数调用语句类型
const CallExp = {
  type: "CallExpression",
  // 被调用函数的名称，它是一个标识符
  callee: {
    type: "Identifier",
    name: "h",
  },
  // 参数
  arguments: [],
};

// 用来创建 StringLiteral 节点
function createStringLiteral(value) {
  return {
    type: "StringLiteral",
    value,
  };
}
// 用来创建 Identifier 节点
export function createIdentifier(name) {
  return {
    type: "Identifier",
    name,
  };
}
// 用来创建 ArrayExpression 节点
export function createArrayExpression(elements) {
  return {
    type: "ArrayExpression",
    elements,
  };
}
// 用来创建 CallExpression 节点
export function createCallExpression(callee, args) {
  return {
    type: "CallExpression",
    callee: createIdentifier(callee),
    arguments: args,
  };
}

// 转换文本节点
export function transformText(node) {
  // 如果不是文本节点，则什么都不做
  if (node.type !== "Text") {
    return;
  }
  // 文本节点对应的 JavaScript AST 节点其实就是一个字符串字面量，
  // 因此只需要使用 node.content 创建一个 StringLiteral 类型的节点即可
  // 最后将文本节点对应的 JavaScript AST 节点添加到 node.jsNode 属性下
  node.jsNode = createStringLiteral(node.content);
}

// 转换标签节点
export function transformElement(node) {
  // 将转换代码编写在退出阶段的回调函数中，
  // 这样可以保证该标签节点的子节点全部被处理完毕
  return () => {
    // 如果被转换的节点不是元素节点，则什么都不做
    if (node.type !== "Element") {
      return;
    }

    // 1. 创建 h 函数调用语句,
    // h 函数调用的第一个参数是标签名称，因此我们以 node.tag 来创建一个字符串字面量节点
    // 作为第一个参数
    const callExp = createCallExpression("h", [createStringLiteral(node.tag)]);
    // 2. 处理 h 函数调用的参数
    node.children.length === 1
      ? // 如果当前标签节点只有一个子节点，则直接使用子节点的 jsNode 作为参数
        callExp.arguments.push(node.children[0].jsNode)
      : // 如果当前标签节点有多个子节点，则创建一个 ArrayExpression 节点作为参数
        callExp.arguments.push(
          // 数组的每个元素都是子节点的 jsNode
          createArrayExpression(node.children.map((c) => c.jsNode))
        );
    // 3. 将当前标签节点对应的 JavaScript AST 添加到 jsNode 属性下
    node.jsNode = callExp;
  };
}

// 转换 Root 根节点
export function transformRoot(node) {
  // 将逻辑编写在退出阶段的回调函数中，保证子节点全部被处理完毕
  return () => {
    // 如果不是根节点，则什么都不做
    if (node.type !== "Root") {
      return;
    }
    // node 是根节点，根节点的第一个子节点就是模板的根节点，
    // 当然，这里我们暂时不考虑模板存在多个根节点的情况
    const vnodeJSAST = node.children[0].jsNode;
    // 创建 render 函数的声明语句节点，将 vnodeJSAST 作为 render 函数体的返回语句
    node.jsNode = {
      type: "FunctionDecl",
      id: { type: "Identifier", name: "render" },
      params: [],
      body: [
        {
          type: "ReturnStatement",
          return: vnodeJSAST,
        },
      ],
    };
  };
}

function traverseNode(ast, context) {
  // 当前节点，ast 本身就是 Root 节点
  context.currentNode = ast;
  // 1. 增加退出阶段的回调函数数组
  const exitFns = [];
  // context.nodeTransforms 是一个数组，其中每一个元素都是一个函数
  const transforms = context.nodeTransforms;
  for (let i = 0; i < transforms.length; i++) {
    // 2. 转换函数可以返回另外一个函数，该函数即作为退出阶段的回调函数
    const onExit = transforms[i](context.currentNode, context);
    if (onExit) {
      // 将退出阶段的回调函数添加到 exitFns 数组中
      exitFns.push(onExit);
    }
    // 由于任何转换函数都可能移除当前节点，因此每个转换函数执行完毕后，
    // 都应该检查当前节点是否已经被移除，如果被移除了，直接返回即可
    if (!context.currentNode) return;
  }

  // 如果有子节点，则递归地调用 traverseNode 函数进行遍历
  const children = context.currentNode.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      // 递归地调用 traverseNode 转换子节点之前，将当前节点设置为父节
      context.parent = context.currentNode;
      // 设置位置索引
      context.childIndex = i;
      // 递归地调用时，将 context 透传
      traverseNode(children[i], context);
    }
  }
  // 在节点处理的最后阶段执行缓存到 exitFns 中的回调函数
  // 注意，这里我们要反序执行
  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
  }
}

function dump(node, indent = 0) {
  // 节点的类型
  const type = node.type;
  // 节点的描述，如果是根节点，则没有描述
  // 如果是 Element 类型的节点，则使用 node.tag 作为节点的描述
  // 如果是 Text 类型的节点，则使用 node.content 作为节点的描述
  const desc =
    node.type === "Root"
      ? ""
      : node.type === "Element"
      ? node.tag
      : node.content;
  // 打印节点的类型和描述信息
  console.log(`${"-".repeat(indent)}${type}: ${desc}`);
  // 递归地打印子节点
  if (node.children) {
    node.children.forEach((n) => dump(n, indent + 2));
  }
}

// 封装 transform 函数，用来对 AST 进行转换
export function transform(ast) {
  // 在 transform 函数内创建 context 对象
  const context = {
    // 增加 currentNode，用来存储当前正在转换的节点
    currentNode: null,
    // 增加 childIndex，用来存储当前节点在父节点的 children 中的位置索引
    childIndex: 0,
    // 增加 parent，用来存储当前转换节点的父节点
    parent: null,
    replaceNode(node) {
      // 为了替换节点，我们需要修改 AST
      // 找到当前节点在父节点的 children 中的位置：context.childIndex
      // 然后使用新节点替换即可
      context.parent.children[context.childIndex] = node;
      // 由于当前节点已经被新节点替换掉了，因此我们需要将 currentNode 更新为新节点
      context.currentNode = node;
    },
    // 用于删除当前节点。
    removeNode() {
      if (context.parent) {
        // 调用数组的 splice 方法，根据当前节点的索引删除当前节点
        context.parent.children.splice(context.childIndex, 1);
        // 将 context.currentNode 置空
        context.currentNode = null;
      }
    },
    // 注册 nodeTransforms 数组
    nodeTransforms: [
      // transformElement 函数用来转换标签节点
      transformElement,
      // transformText 函数用来转换文本节点
      transformText,
      // transformRoot 函数用来转换根节点
      transformRoot,
    ],
  };
  // 调用 traverseNode 完成转换
  traverseNode(ast, context);
  // 打印 AST 信息
  logInfo(`dump=======>start`);
  dump(ast);
  logInfo(`dump=======>end`);
}
