import React, {Component} from 'react';


// simple component that displays text
// which can be clicked on to edit
class InlineEditable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false
    };
    this.input = React.createRef();
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      this.props.onEdit(ev.target.value);
      this.setState({ editing: false });
    }
  }

  onBlur(ev) {
    this.props.onEdit(ev.target.value);
    this.setState({ editing: false });
  }

  onClick() {
    this.setState({ editing: true });
  }

  componentDidUpdate() {
    if (this.input.current) {
      this.input.current.focus();
    }
  }

  render() {
    if (this.state.editing) {
      return <input
        type='text'
        className={this.props.className}
        defaultValue={this.props.value}
        onKeyPress={this.onKeyPress.bind(this)}
        onBlur={this.onBlur.bind(this)}
        ref={this.input} />
    } else {
      return <div className={this.props.className} onClick={this.onClick.bind(this)}>{this.props.value}</div>;
    }
  }
}

export default InlineEditable;
