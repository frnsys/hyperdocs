import { Editor } from 'slate-react';
import React, {Component} from 'react';
import Comments from './Comments';
import CommentsPlugin from './Editor/Comments';
import StylesPlugin from './Editor/Styles';
import PeersPlugin from './Editor/Peers';
import { Value, Operations } from 'slate';

const initialValue = Value.fromJSON({
  document: {
    nodes: [{
      object: 'block',
      type: 'paragraph',
      nodes: [{
        object: 'text',
        leaves: [{
          text: '',
        }],
      }],
    }]
  }
});

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
      value: initialValue,
      comment: {
        state: 'none',
        focused: null
      }
    };
    this.editor = React.createRef();
    props.doc.applyUpdates = this.applyUpdates;
  }

  componentDidMount() {
    this.props.doc._applyOps(this.props.doc.doc.ops);
  }

  onChange = (change) => {
    let { value } = change;
    this.setState({ value });
    this.props.doc.addChanges(change.operations);
  }

  applyUpdates = (ops, reset) => {
    let { value } = this.state;
    if (reset) {
      value = initialValue;
    }
    ops.forEach((op) => {
      value = Operations.apply(value, op);
    });
    this.setState({ value });
  }

  onCommentChange = (state, threadId) => {
    let comment = { state, focused: threadId };
    this.setState({ comment });
  }

  addComment = (peerId, threadId, body) => {
    // add comment to hyperdoc
    threadId = this.props.doc.addComment(peerId, threadId, body);

    // highlight in document
    let change = this.state.value.change().wrapInline({
      data: { threadId: threadId },
      type: 'comment'
    });
    this.onChange(change);
  }

  resolveComment = (threadId) => {
    // resolve comment in hyperdoc
    this.props.doc.resolveComment(threadId);

    // highlight in document
    let change = this.state.value.change().unwrapInline('comment');
    this.onChange(change);
  }

  render() {
    let { id, doc } = this.props;
    return <div className='doc-editor' ref={this.editor}>
      {Object.values(this.props.doc.peers).map((p) => {
        // TODO sync peer positions
        if (!p.pos) return '';
        let peerStyle = p.pos;
        return <div key={p.id} style={peerStyle} className='peer-cursor'></div>
      })}
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
        value={this.state.value}
        onSelect={this.onSelect}
        onChange={this.onChange} />
    </div>;
  }
}

export default Doqument;
