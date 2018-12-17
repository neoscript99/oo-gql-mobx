/**
 * 转换为gorm的分页模式
 *
 * @param criteria
 * @param currentPage
 * @param pageSize
 * @see org.grails.datastore.gorm.query.criteria.AbstractDetachedCriteria
 */
export function processCriteriaPage({criteria, currentPage, pageSize}) {
  //AbstractDetachedCriteria中的分页函数为max和offset
  criteria.max = pageSize
  criteria.offset = (currentPage - 1) * pageSize
}

/**
 * 将字符串嵌套排序字段转化为gorm可处理的格式
 * @param param 传入是为了在原参数上做增量修改，如:
 *  processOrderParam({user:{eq:[['name','admin']]}},[['user.age','desc']])=>{user:{eq:[['name','admin']],order:[['age','desc']]}}
 * @param orders
 */
export function processCriteriaOrder(criteria, orders) {
  var notNestOrders = [];
  criteria.order = notNestOrders

  //嵌套字段的排序criteria
  orders.forEach(order => {
    if (order[0].indexOf('.') == -1)
      notNestOrders.push(order);
    else {
      //['user.age','desc']=>['user','age']
      var nestFields = order[0].split('.');
      //order = ['age','desc']
      order[0] = nestFields[nestFields.length - 1];

      var parentParam = criteria;
      nestFields.slice(0, -1).forEach(field => {
        if (!parentParam[field])
          parentParam[field] = {}
        parentParam = parentParam[field];
      })

      if (parentParam.order)
        parentParam.order.push(order);
      else
        parentParam.order = [order];
    }
  })
}

/**
 * apollo-client默认支持fetch api，但各类小程序、react native不支持fetch
 * 本方法目前支持，后续可加入新的支持：
 *     Taro.request，等同于wx.request
 */
export function toFetch({taroRequest, defaultOptions}) {
  if (taroRequest)
    return (url, {body: data, ...fetchOptions}) => {
      //Taro.request默认会对res做JSON.parse，但apollo-http-link需要text，也要做一次JSON.parse
      //所以要让微信返回text,需做如下配置：dataType: 'txt', responseType: 'text'
      //dataType	String	否	json	如果设为json，会尝试对返回的数据做一次 JSON.parse
      //responseType	String	否	text	设置响应的数据类型。合法值：text、arraybuffer
      return taroRequest({url, data, ...defaultOptions, ...fetchOptions, dataType: 'txt', responseType: 'text'})
        .then((res) => {
          res.text = () => Promise.resolve(res.data)
          return res
        })
    }
}
