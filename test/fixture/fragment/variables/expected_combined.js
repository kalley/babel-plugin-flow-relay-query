/* @flow */
import React from "react";
import Relay from "react-relay";


import type { PropertyWithArgs } from "../../../../src/flowTypes.js.flow";

type ArticleProps = {
  article: {
    title: string;
    posted: string;
    content: string;
    views: number;
    sponsored: boolean;
    tags: ?PropertyWithArgs<(category: "$category", first: 1) => string[]>;

    author: {
      name: string;
      email: string;
    };
  }
};

class Article extends React.Component {
  props: ArticleProps;

  render() {
    const { article } = this.props;
    return <div>
        <div>{article.title} ({article.posted})</div>
        <div>{article.author.name} [{article.author.email}]</div>
        <div>{article.tags}</div>
        <div>{article.content}</div>
      </div>;
  }
}

export default Relay.createContainer(Article, {
  initialVariables: {
    category: "test"
  },
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
          calls: [{
            kind: "Call",
            metadata: {},
            name: "category",
            value: {
              kind: "CallVariable",
              callVariableName: "category"
            }
          }, {
            kind: "Call",
            metadata: {},
            name: "first",
            value: {
              kind: "CallValue",
              callValue: 1
            }
          }],
          fieldName: "tags",
          kind: "Field",
          metadata: {
            isPlural: true
          },
          type: "String"
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
