// eslint-disable-next-line import/no-named-as-default
import ApolloClient from 'apollo-client';
import {BatchHttpLink} from 'apollo-link-batch-http';
import {InMemoryCache} from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import upperFirst from 'lodash/upperFirst'

import Log from './Log'


class GraphqlClient {
  defaultVariables = {}

  constructor({uri, fetch, defaultVariables, log}) {
    //WEB环境用浏览器原生fetch
    const link = new BatchHttpLink(fetch ? {uri, fetch} : {uri});
    this.client = new ApolloClient({link, cache: new InMemoryCache()});
    this.defaultVariables = defaultVariables;
    this.log = log ? log : new Log();
  }

  query(query, variables, fetchPolicy = 'no-cache') {
    this.log.debug('Graphql.query', query, variables, fetchPolicy);
    return this.client.query({query, variables: {...this.defaultVariables, ...variables}, fetchPolicy});
  }

  mutation(mutation, variables, fetchPolicy = 'no-cache') {
    this.log.debug('Graphql.mutation', mutation, variables, fetchPolicy);
    return this.client.mutate({mutation, variables: {...this.defaultVariables, ...variables}, fetchPolicy});
  }

  //fetchPolicy
  //@see https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-config-options-fetchPolicy
  list(domain, fields, criteria = null) {
    this.log.debug('Graphql.list', domain, criteria);
    if (typeof criteria !== 'string')
      criteria = JSON.stringify(criteria)
    return this.client.query({
      query: gql`
                query ${domain}ListQuery($criteria:String){
                  ${domain}List(criteria:$criteria){
                        results {
                          ${fields}
                        }
                        totalCount
                  }
                }`,
      fetchPolicy: 'no-cache',
      variables: {
        ...this.defaultVariables, criteria
      }
    }).then(data => data.data[`${domain}List`]);
  }

  get(domain, fields, id) {
    this.log.debug('Graphql.get', domain, id);
    return this.client.query({
      query: gql`
                query ${domain}Get($id:String){
                  ${domain}(id:$id){
                    ${fields}
                  }
                }`,
      fetchPolicy: 'no-cache',
      variables: {
        ...this.defaultVariables, id
      }
    }).then(data => data.data[domain]);
  }

  create(domain, fields, value) {
    this.log.debug('Graphql.create', domain, value);
    return this.client.mutate({
      mutation: gql`
                mutation ${domain}CreateMutate($${domain}:${upperFirst(domain)}Create){
                  ${domain}Create(${domain}:$${domain}){
                    ${fields}
                  }
                }`,
      fetchPolicy: 'no-cache',
      variables: {
        ...this.defaultVariables, [domain]: value
      }
    }).then(data => data.data[`${domain}Create`]);
  }

  update(domain, fields, id, value) {
    this.log.debug('Graphql.update', domain, id, value);
    //version 被配置为 @JsonIgnoreProperties ，如果传入会导致Null异常
    //其它属性如果传入会导致graphql校验异常
    const {errors, __typename, id: removeId, lastUpdated, dateCreated, version, ...updateValue} = value;
    return this.client.mutate({
      mutation: gql`
                mutation ${domain}UpdateMutate($id:String!, $${domain}:${upperFirst(domain)}Update){
                  ${domain}Update(id:$id, ${domain}:$${domain}){
                    ${fields}
                  }
                }`,
      fetchPolicy: 'no-cache',
      variables: {
        ...this.defaultVariables, [domain]: updateValue, id
      }
    }).then(data => data.data[`${domain}Update`]);
  }

  delete(domain, id) {
    this.log.debug('Graphql.delete', domain, id);
    return this.client.mutate({
      mutation: gql`
                mutation ${domain}DeleteMutate($id:String){
                  ${domain}Delete(id:$id){
                    success
                    error
                  }
                }`,
      fetchPolicy: 'no-cache',
      variables: {
        ...this.defaultVariables, id
      }
    }).then(data => data.data[`${domain}Delete`]);
  }

  async getFields(domain) {
    this.log.debug('Graphql.getFields', domain);
    const typeName = upperFirst(domain);
    let type = await this.getType(typeName);
    if (!(type && type.data))
      return null;
    let fields = type.data.__type.fields;
    let acc = [];
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      let nestType = null;
      //LIST类型，仅取Error，其它忽略
      if (field.type.kind === 'LIST')
        if (field.type.ofType.name === 'Error')
          nestType = 'Error';
        else
          continue;
      else if (field.type.kind === 'OBJECT')
        nestType = field.type.name;

      if (nestType) {
        let nestFields = await this.getFields(nestType);
        if (nestFields)
          acc.push(`${field.name}{${nestFields}}`);
      }
      else
        acc.push(field.name);
    }
    return acc.join(',');
  }

  getType(type) {
    return this.client.query({
      query: gql`query ${type}TypeQuery($type:String!){
                  __type(name:$type){
                    fields{
                      name      
                      type {
                        kind
                        name
                        ofType{
                          name
                          kind                          
                        }
                      }
                    }
                  }
                }`,
      variables: {
        ...this.defaultVariables, type
      }
    });
  }
}

export default GraphqlClient;
