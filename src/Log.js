class Log {
  constructor(level) {
    this.level = level ? level : 'info';
    this.error = console.error.bind(undefined, "[ERROR] - ");
    this.warn = console.warn.bind(undefined, "[WARN] - ");
    if (level === 'info' || level === 'debug')
      this.info = console.info.bind(undefined, "[INFO] - ");
    if (level === 'debug')
      this.debug = console.debug.bind(undefined, "[DEBUG] - ");

  }

  info() {
  };

  debug() {
  };

  warn() {
  };

  error() {
  };

  /**
   * 执行时间记录 decorator
   * @param {*} target - class that the property is a part of
   * @param {*} propertyKey -  the name of the property the decorator is modifying
   * @param {*} descriptor - property descriptor. Think: object passed to Object.defineProperty
   */
  logTime(target, propertyKey, descriptor) {
    //debug时计时
    if (this.level !== 'debug') {
      this.warn(`非debug模式，logTime ${target.constructor.name}.${propertyKey}不执行`);
      return;
    }
    let originalMethod = descriptor.value;
    this.debug(`logTime ${target.constructor.name}.${propertyKey}`);
    descriptor.value = function (...args) {
      let fname = `${target.constructor.name}.${propertyKey}`;
      let d1 = Date.now();
      //console.time(fname);
      let result = originalMethod.call(this, ...args);
      let ms = Date.now() - d1;
      this.debug(`${fname} 执行时间： ${ms > 10000 ? ms / 1000 : ms}${ms > 10000 ? 's' : 'ms'}`);
      //console.timeEnd(fname);
      return result;
    };
    return descriptor;
  }
}

export default Log;
