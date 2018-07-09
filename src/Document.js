import { Editor } from 'slate-react';
import React, {Component} from 'react';
import Comments from './Comments';
import CommentsPlugin from './Editor/Comments';
import StylesPlugin from './Editor/Styles';
import PeersPlugin from './Editor/Peers';



class Doqument extends Component {
  constructor(props) {
    super(props);
    this.plugins = [
      StylesPlugin(),
      PeersPlugin({
        localId: props.id
      }),
      CommentsPlugin({
        onChange: this.onCommentChange
      })
    ];
    this.state = {
      comment: {
        state: 'none',
        focused: null
      }
    };
  }

  onChange = ({ value }) => {
    if (value.document != this.props.doc.value.document || value.selection != this.props.doc.value.selection) {
      this.props.doc.updateValue(value);
    }
  }

  onCommentChange = (state, threadId) => {
    let comment = { state, focused: threadId };
    this.setState({ comment });
  }

  addComment = (peerId, threadId, body) => {
    // add comment to hyperdoc
    threadId = this.props.doc.addComment(peerId, threadId, body);

    // highlight in document
    let change = this.props.doc.value.change().wrapInline({
      data: { threadId: threadId },
      type: 'comment'
    });
    this.onChange(change);
  }

  resolveComment = (threadId) => {
    // resolve comment in hyperdoc
    this.props.doc.resolveComment(threadId);

    // highlight in document
    let change = this.props.doc.value.change().unwrapInline('comment');
    this.onChange(change);
  }

  render() {
    let { id, doc } = this.props;
    return <div className='doc-editor'>
      <Comments
        id={id}
        state={this.state.comment.state}
        comment={doc.comments[this.state.comment.focused]}
        onChange={this.onChange}
        addComment={this.addComment}
        resolveComment={this.resolveComment} />
      <Editor
        autoFocus={true}
        autoCorrect={false}
        className='doc-rich-editor'
        plugins={this.plugins}
        value={this.props.doc.value}
        onChange={this.onChange} />
    </div>;
  }
}

export default Doqument;
