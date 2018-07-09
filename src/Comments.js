import { State } from './Editor/Comments';
import React, {Component} from 'react';

const Comment = (props) => {
  let c = props.comment;
  return (
    <div className='doc-comment'>
      <div className='doc-comment-author'>{c.author}</div>
      <div className='doc-comment-body'>{c.body}</div>
      <div className='doc-comment-datetime'>On {new Date(c.created).toLocaleString()}</div>
    </div>);
}

class AddComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  addComment() {
    this.props.addComment(this.state.value);

    // TODO ideally this doesn't happen until
    // we confirm the comment registered...
    this.setState({value: ''});
  }

  render() {
    return (
      <div className='doc-comment'>
        <textarea
          value={this.state.value}
          onChange={(ev) => this.setState({value: ev.target.value})} />
        <button onClick={this.addComment.bind(this)}>Add comment</button>
      </div>);
  }
}

class Thread extends Component {
  render() {
    // TODO styling/positioning needs a lot of work
    let style = {
      top: this.props.top
    };

    if (this.props.focused) {
      style.border = '2px solid #7070ff';
    } else {
      style.display = 'none';
    }

    return (
      <div className='doc-comments' style={style}>
        {this.props.thread.length > 0 &&
          <button className='doc-comment-resolve' onClick={this.props.resolve}>Resolve</button>}
        {this.props.thread.map((c) => <Comment key={c.id} comment={c} />)}
        <AddComment addComment={(body) => this.props.add(this.props.id, body)} />
      </div>);
  }
}

class Comments extends Component {
  render() {
    // TODO need to get proper {top} values
    let { state, comment, addComment, resolveComment } = this.props;
    if (comment) {
      let { id, thread, resolved } = comment;
      if (resolved) return '';
      return <Thread
        id={id}
        top={0}
        focused={true}
        add={(id, body) => addComment(this.props.id, id, body)}
        resolve={() => resolveComment(id)}
        thread={thread} />

    } else if (state === 'new') {
      return <Thread top={0} focused={true} thread={[]} add={(_, body) => {
        if (body) addComment(this.props.id, null, body);
      }} />;
    } else {
      return '';
    }
  }
}

export default Comments;
