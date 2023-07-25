// const template = `
//   <div>
// <h1 v-if="ok">Vue Template</h1>
//   </div>
// `;
// const templateAST = parse(template);
// const jsAST = transform(templateAST);
// const code = generate(jsAST);

import { logObj } from "./utils.mjs";
import { parse } from "./parset.mjs";
import { transform } from "./transform.mjs";
import { generate } from "./generate.mjs";

// const ast = parse(`<div><p>Vue</p><p>Template</p></div>`);
// dump(ast);
// transform(ast);

const template = "<div><p>Vue</p><p>Template</p></div>";

function compile(template) {
  // 模板 AST
  const templateAst = parse(template);
  logObj("template ast", templateAst);
  // 将模板 AST 转换为 JavaScript AST
  transform(templateAst);
  logObj("javascript ast", templateAst.jsNode);
  // 代码生成
  const code = generate(templateAst.jsNode);
  logObj("after generate", code);
  return code;
}

compile(template);
