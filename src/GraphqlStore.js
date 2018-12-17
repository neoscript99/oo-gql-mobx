import {observable, action, decorate} from "mobx";
import MessageStore from './MessageStore'
import GraphqlClient from './GraphqlClient'
import {processCriteriaOrder, processCriteriaPage} from "./ooGrahpqlMobxUtils";

class GraphqlStore extends MessageStore {
  currentItem = {id: ''};
  allList = [];
  pageList = [];
  pageInfo = {currentPage: 1, pageSize: 10, totalCount: -1, isLastPage: false};

  /**
   *
   * @param domain
   * @param graphqlClient
   * @param dependStoreMap 依赖的其它store，格式如下：{aaStore:aa,bbStore:bb}
   */
  constructor({domain, graphqlClient, dependMap = {}, messageHandlerMap, pageSize}) {
    super(messageHandlerMap);
    this.domain = domain;
    const client = graphqlClient ? graphqlClient : new GraphqlClient({uri: '/graphql'});
    this.log = client.log;
    //client不能作为类成员变量，导致 mobx runReaction Converting circular structure to JSON
    //原因应该是mobx会对store做toJson操作，而apollo client中有嵌套依赖内容
    this.graphqlPromise = client.getFields(domain).then((fields) => ({client, fields}));
    //dependMap 也不做成员变量，防止嵌套依赖，序列化toJson的时候死循环
    this.dependPromise = Promise.resolve(dependMap);
    if (pageSize)
      this.pageInfo.pageSize = pageSize;
  }

  /**
   * 如果是单向依赖，可直接用构造函数
   * 如果是互相依赖，可先各自初始化再调用 addDependStore
   * @param dependMap
   */
  addDependStore(dependMap) {
    this.dependPromise = this.dependPromise.then(map => ({...map, ...dependMap}))
  }

  @action
  listAll(criteria) {
    this.list({criteria})
  }

  @action
  list({criteria = {}, listHandler, pageInfo, orders = this.defaultOrders}) {
    if (pageInfo)
      processCriteriaPage({criteria, ...pageInfo})
    if (orders && orders.length > 0)
      processCriteriaOrder(criteria, orders)
    //list需等待graphqlPromise执行完成
    this.graphqlPromise
      .then(({client, fields}) =>
        client.list(this.domain, fields, criteria)
      )
      .then(data =>
        listHandler ? listHandler(data) : (this.allList = data.results)
      )
      .catch(this.newGraphqlError)
  }

  /**
   * 如需默认排序，重载本方法
   * @returns {null}
   */
  get defaultOrders() {
    return null;
  }

  @action
  listPage({listHandler, isAppend = false, ...rest}) {
    //查询第一页的时候，清空allList
    if (this.pageInfo.currentPage === 1)
      this.allList = [];
    if (!listHandler)
      listHandler = ({results, totalCount}) => {
        this.pageList = results;
        this.pageInfo.totalCount = totalCount;
        this.pageInfo.isLastPage = (results.length < this.pageInfo.pageSize || this.pageInfo.pageSize * this.pageInfo.currentPage >= totalCount)
        if (isAppend === true)
          this.allList = this.allList.concat(results)
        else
          this.allList = results;
      }
    this.list({listHandler, pageInfo: this.pageInfo, ...rest})
  }

  @action
  listNextPage(param) {
    if (this.pageInfo.isLastPage)
      this.newMessage({text: '已经到底了'})
    else {
      this.pageInfo.currentPage++;
      this.listPage(param);
    }
  }

  @action
  listFirstPage(param) {
    this.pageInfo.currentPage = 1;
    this.listPage(param);
  }

  @action
  clearList() {
    this.pageList.clear();
    this.allList.clear();
  }

  @action
  changeCurrentItem(currentItem) {
    this.currentItem = currentItem;
  }

  @action
  create(newItem) {
    this.graphqlPromise
      .then(({client, fields}) => client.create(this.domain, fields, newItem))
      .then(data => {
        this.newSuccess('保存成功');
        this.currentItem = data;
      })
      .catch(this.newGraphqlError)
  }

  @action
  update(id, updateItem) {
    this.graphqlPromise
      .then(({client, fields}) => client.update(this.domain, fields, id, updateItem))
      .then(data => {
        this.newSuccess('更新成功');
        this.currentItem = data;
      })
      .catch(this.newGraphqlError)
  }

  @action
  get(id) {
    this.graphqlPromise
      .then(({client, fields}) => client.get(this.domain, fields, id))
      .then(data => this.changeCurrentItem(data))
      .catch(this.newGraphqlError)
  }
}

decorate(GraphqlStore, {
  currentItem: observable,
  allList: observable,
  pageList: observable,
  pageInfo: observable
})
export default GraphqlStore;
