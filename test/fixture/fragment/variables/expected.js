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
    article: () => Relay.QL`
fragment on Article {
  title
  posted
  content
  views
  sponsored
  tags(category: $category, first: 1)
  author {
    name
    email
  }
}
`
  }
});
