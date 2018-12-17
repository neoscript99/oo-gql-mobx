import {observable, action, decorate} from "mobx";

class MessageStore {
  message = {}

  constructor(messageHandlerMap) {
    //可以传入不同类型的消息处理函数，如：{taroAtMessage:Taro.atMessage}
    this.handlerPromise = Promise.resolve(messageHandlerMap);
  }

  /**
   * 原格式：“Error: GraphQL error: Exception while fetching data (/reserveCreate) : 空余席位不足，请减少席位重试”
   * @param {message,errorCode,locations,errorType,path,extensions} graphqlError
   */
    //如果加了@action无法捕获异常
  newGraphqlError = (graphqlError) => {
    const text = graphqlError.message
      .split(':').filter(str =>
        !(str === 'GraphQL error' || str.indexOf('Exception while fetching data') > -1))
      .join(':')
    this.newError(text)
    throw graphqlError
  }

  @action
  newError(text) {
    this.newMessage({text, duration: 2000, type: 'error'})
  }

  @action
  newSuccess(text) {
    this.newMessage({text, type: 'success'})
  }

  /**
   * 默认用Taro.atMessage处理
   * @param text
   * @param duration
   * @param type
   * @param isOpened
   *
   * @see https://taro-ui.aotu.io/#/docs/message
   */
  @action
  newMessage({text, duration = 1000, type = 'info'}) {
    this.message = {text, duration, isOpened: true, type, status: type, createdTime: new Date()}
    this.handlerPromise.then(({taroAtMessage}) =>
      taroAtMessage && taroAtMessage({
        message: text, type, duration
      }))
  }

  @action
  closeMessage() {
    this.message = {...this.message, isOpened: false}
  }
}

decorate(MessageStore, {
  message: observable
})

export default MessageStore;
