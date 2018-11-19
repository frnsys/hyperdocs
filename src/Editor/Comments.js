import React from 'react';

const State = Object.freeze({
  NONE: 'none',
  NEW: 'new',
  FOCUS: 'focus'
});

const style = {
  background: 'rgba(0,0,255,0.2)'
};

const Comment = (props) => {
  return <span style={style} >{props.children}</span>;
};

function Comments(opts) {
  const _onChange = opts.onChange;

  let state = State.NONE;

  function onChange(change) {
    let { value } = change;
    let { selection } = value;
    let comments = Array.from(value.inlines.filter((m) => m.type === 'comment'));
    let comment = comments.length > 0 ? comments[0] : null;
    let withinComment = false;
    let newState;

    // TODO this does not work at the end of an inline node, see:
    // https://github.com/ianstormtaylor/slate/issues/1905
    // https://github.com/ianstormtaylor/slate/issues/1914
    if (comment) {
      withinComment = selection.hasStartIn(comment) && selection.hasEndIn(comment);
      // once that is fixed, these should work:
      // console.log(`atStart: ${value.selection.hasEdgeAtStartOf(f)}`);
      // console.log(`atEnd: ${value.selection.hasEdgeAtEndOf(f)}`);
    }

    if (!selection.isCollapsed && !comment) {
      newState = State.NEW;
    } else if (comment && withinComment) {
      newState = State.FOCUS;
      comment = comment.data.get('threadId');
    } else {
      newState = State.NONE;
    }

    if (state == newState) return;

    _onChange(newState, comment);
    state = newState;
  }

  const renderNode = (props) => {
    if (props.node.type === 'comment') {
      return <Comment>{props.children}</Comment>;
    }
  }

  return { onChange, renderNode };
};

export default Comments;
