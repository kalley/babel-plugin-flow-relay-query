/* @flow */
import React from "react";
import Relay from "react-relay";


type ArticleProps = {
  article: {
    title: string;
    posted: string;
    content: string;
    views: number;
    sponsored: boolean;

    author: {
      name: string;
      email: string;
    };
  }
};

class Article extends React.Component<void, ArticleProps, void> {
  render() {
    const { article } = this.props;
    return <div>
        <div>{article.title} ({article.posted})</div>
        <div>{article.author.name} [{article.author.email}]</div>
        <div>{article.content}</div>
      </div>;
  }
}

const RelayHOC = (component, options) => Relay.createContainer(component, options);

export default RelayHOC(Article, {
  fragments: {
    article: () => function () {
      return {
        children: [{
          fieldName: "title",
          kind: "Field",
          metadata: {},
          type: "String"
        }, {
          fieldName: "posted",
          kind: "Field",
          metadata: {},
          type: "String"
        }, {
          fieldName: "content",
          kind: "Field",
          metadata: {},
          type: "String"
        }, {
          fieldName: "views",
          kind: "Field",
          metadata: {},
          type: "Int"
        }, {
          fieldName: "sponsored",
          kind: "Field",
          metadata: {},
          type: "Boolean"
        }, {
          children: [{
            fieldName: "name",
            kind: "Field",
            metadata: {},
            type: "String"
          }, {
            fieldName: "email",
            kind: "Field",
            metadata: {},
            type: "String"
          }, {
            fieldName: "id",
            kind: "Field",
            metadata: {
              isGenerated: true,
              isRequisite: true
            },
            type: "String"
          }],
          fieldName: "author",
          kind: "Field",
          metadata: {
            canHaveSubselections: true
          },
          type: "Author"
        }, {
          fieldName: "id",
          kind: "Field",
          metadata: {
            isGenerated: true,
            isRequisite: true
          },
          type: "String"
        }],
        id: Relay.QL.__id(),
        kind: "Fragment",
        metadata: {},
        name: "Source_ArticleRelayQL",
        type: "Article"
      };
    }()
  }
});
