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
    article: () => Relay.QL`
fragment on Article {
  title
  posted
  content
  views
  sponsored
  author {
    name
    email
  }
}
`
  }
});
