const isObject = (val) => val !== null && typeof val === "object";

const toReactive = (target) => (isObject(target) ? reactive(target) : target);

const hasOwn = (target, key) => Reflect.hasOwnProperty.call(target, key);
const isRef = (target) => !!target.__v_isRef;

const proxyMap = new WeakMap();
/**
 * 将对象变为响应式对象
 * @param {*} target
 * @returns
 */
export function reactive(target) {
  if (!isObject(target)) return target;

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const handler = {
    get(target, key, receiver) {
      console.log("get", key);
      // 收集依赖
      track(target, key);
      // 如果第三个参数不传递receiver，那么在对象内部使用this时，不会指向代理对象，可能会出现问题
      const result = Reflect.get(target, key, receiver);
      return reactive(result);
    },
    set(target, key, value, receiver) {
      console.log("set", key, value);
      const oldValue = Reflect.get(target, key, receiver);
      let result = true;
      if (oldValue !== value) {
        result = Reflect.set(target, key, value, receiver);
        // 触发更新
        trigger(target, key);
      }
      return result;
    },
    // Proxy 的 has 拦截器可以拦截 key in target 的操作，我们需要对该操作做依赖收集（调用 track）
    has(target, key) {
      console.log("has", key);
      const res = Reflect.has(target, key);
      // 依赖收集
      track(target, key);
      return res;
    },
    deleteProperty(target, key) {
      console.log("delete", key);
      const hasKey = hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (hasKey && result) {
        // 触发更新
        trigger(target, key);
      }
      return result;
    },
  };
  const proxy = new Proxy(target, handler);
  proxyMap.set(target, proxy);
  return proxy;
}

let activeEffect = null;

/**
 * 副作用函数
 */
export function effect(callback) {
  const effectFn = () => {
    // 执行副作用之前先调用 cleanup 函数完成清除工作
    cleanup(effectFn); // 新增
    // 当 effectFn 执行时，将其设置为当前激活的副作用函数
    activeEffect = effectFn;
    callback();
    // 支持嵌套effect调用
    activeEffect = null;
  };
  // activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = [];
  effectFn(); // 访问响应式对象属性，去收集依赖
}

function cleanup(effectFn) {
  // 遍历 effectFn.deps 数组
  for (let i = 0; i < effectFn.deps.length; i++) {
    // deps 是依赖集合
    const deps = effectFn.deps[i];
    // 将 effectFn 从依赖集合Set中移除
    deps.delete(effectFn);
  }
  // 最后需要重置 effectFn.deps 数组
  effectFn.deps.length = 0;
}

let targetMap = new WeakMap();

/**
 * 收集依赖(收集effect)
 */
export function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  // deps 就是一个与当前副作用函数存在联系的依赖集合
  // 将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps);
}

/**
 * 响应依赖(执行effect)
 */
export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  const effectsToRun = new Set(deps);
  effectsToRun.forEach((effect) => effect());
}

/**
 * 将普通类型数据变为响应式
 * @param {*} raw
 * @returns
 */
export function ref(raw) {
  // 判断raw是否是ref创建的对象，如果是的话直接返回
  if (isObject(raw) && raw.__v_isRef) return;
  let value = toReactive(raw);
  const r = {
    __v_isRef: true,
    get value() {
      track(r, "value");
      return value;
    },
    set value(newValue) {
      if (newValue !== value) {
        raw = newValue;
        value = toReactive(raw);
        trigger(r, "value");
      }
    },
  };
  return r;
}

/**
 * 将对象所有属性值都变为响应式
 * @param {*} proxy
 * @returns
 */
export function toRefs(proxy) {
  const ret = Array.isArray(proxy) ? new Array(proxy.length) : {};
  for (const key in proxy) {
    ret[key] = toRef(proxy, key);
  }
  return ret;
}

/**
 * 将对象的某个属性变为响应式Ref对象
 * @param {*} proxy
 * @param {*} key
 * @returns
 */
function toRef(proxy, key) {
  const value = proxy[key];
  if (isRef(value)) return value;
  return {
    __v_isRef: true,
    get value() {
      return proxy[key];
    },
    set value(newValue) {
      proxy[key] = newValue;
    },
  };
}

/**
 * 计算属性
 * @param {*} getter
 * @returns
 */
export function computed(getter) {
  const result = ref();
  effect(() => {
    // 调用getter函数，会触发依赖收集，此时该箭头函数会被当做依赖收集
    result.value = getter();
  });
  return result;
}
