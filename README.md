# mobx在taro中的限制
- 只有在react控件的render中将store对应的属性保存到本地变量，该属性修改时，mobx才会通知observer控件
- 以上的原理是：render中的本地变量，taro会处理到state
- 下面代码中：目前的taro-mobx只会监控currentItem, message，不会监控这些属性下级的变化
  ```javascript
  const {manager: {currentItem, message}} = this.props;
  ```
  - 无监控：`message.text='xxx'`
  - 有监控：`message={...}`

- 下面代码中：没有设置currentItem本地变量，mobx不会更新视图
  ```html
  <View>{this.props.reserve.currentItem.name}</View>
  ```
        
