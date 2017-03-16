/* @flow */
import React from "react";
import Relay from "react-relay";
import generateFragmentFromProps from "../../../../src/generateFragmentFromProps";

import type { PropertyWithArgs } from "../../../../src/flowTypes.js.flow";

type ArticleProps = {
  article: {
    title: string;
    posted: string;
    content: string;
    views: number;
    sponsored: boolean;
    tags: ?PropertyWithArgs<(category: 1, first: "'1'") => string[]>;

    author: {
      name: string;
      email: string;
    }
  }
};

class Article extends React.Component {
  props: ArticleProps;

  render() {
    const { article } = this.props;
    return (
      <div>
        <div>{article.title} ({article.posted})</div>
        <div>{article.author.name} [{article.author.email}]</div>
        <div>{article.tags}</div>
        <div>{article.content}</div>
      </div>
    );
  }
}

export default Relay.createContainer(Article, {
  initialVariables: {
    category: "test"
  },
  fragments: {
    article: generateFragmentFromProps()
  }
});
