// 一个辅助函数，用于判断是否是字母
export function isAlpha(char) {
  return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}

export function logInfo(str) {
  console.log("\x1B[36m%s\x1B[0m", str);
}

export function logObj(name, obj) {
  logInfo(`${name}========>start`);
  console.dir(obj, { depth: 10 });
  logInfo(`${name}========>end`);
}
