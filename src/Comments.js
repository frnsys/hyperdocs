import Highlight from './Highlight';
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

class Comments extends Component {
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

export default Comments;
